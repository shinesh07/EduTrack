const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const SemesterCourse = require('../models/SemesterCourse');
const { protect, authorize } = require('../middleware/auth');
const {
  buildDepartmentMatch,
  buildTeacherStudentQuery,
  getSemesterCourses,
} = require('../utils/academic');

router.use(protect, authorize('teacher'));

const getAssignedCourses = (teacherId) =>
  getSemesterCourses({
    teacherId,
    populateTeacher: false,
  });

const buildCourseStudentQuery = (course) => ({
  role: 'student',
  department: buildDepartmentMatch(course.department),
  semester: course.semester,
});

const getAssignedCourse = async (teacherId, courseId) =>
  SemesterCourse.findOne({
    _id: courseId,
    teacher: teacherId,
    isActive: true,
  });

const getDayRange = (dateInput) => {
  const start = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date();
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

router.get('/stats', async (req, res) => {
  try {
    const teacherId = req.user._id;
    const assignedCourses = await getAssignedCourses(teacherId);
    const studentQuery = buildTeacherStudentQuery(assignedCourses);

    const [studentCount, attendanceCount, resultCount, recentStudents] =
      await Promise.all([
        User.countDocuments(studentQuery),
        Attendance.countDocuments({ teacher: teacherId }),
        Result.countDocuments({ teacher: teacherId }),
        User.find(studentQuery)
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name rollNumber department semester'),
      ]);

    res.status(200).json({
      success: true,
      data: {
        studentCount,
        attendanceCount,
        resultCount,
        assignedCourseCount: assignedCourses.length,
        assignedCourses,
        recentStudents,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const courses = await SemesterCourse.find({
      teacher: req.user._id,
      isActive: true,
    }).sort({ semester: 1, title: 1 });

    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => ({
        ...course.toObject(),
        studentCount: await User.countDocuments(buildCourseStudentQuery(course)),
      }))
    );

    res.status(200).json({ success: true, data: coursesWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/students', async (req, res) => {
  try {
    const assignedCourses = await getAssignedCourses(req.user._id);
    const students = await User.find(buildTeacherStudentQuery(assignedCourses))
      .sort({ name: 1 })
      .select('-password');

    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const { studentId, subject, courseId, startDate, endDate, date } = req.query;

    const filter = { teacher: req.user._id };
    if (studentId) filter.student = studentId;
    if (courseId) filter.semesterCourse = courseId;
    if (subject) filter.subject = subject;

    if (date) {
      const dayRange = getDayRange(date);
      if (!dayRange) {
        return res.status(400).json({ success: false, message: 'Invalid date filter.' });
      }
      filter.date = { $gte: dayRange.start, $lt: dayRange.end };
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filter)
      .populate('student', 'name rollNumber department semester')
      .populate('semesterCourse', 'title code department semester')
      .sort({ date: -1 });

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/attendance/session', async (req, res) => {
  try {
    const { courseId, date } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Assigned course is required.',
      });
    }

    const course = await getAssignedCourse(req.user._id, courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'This course is not assigned to you.',
      });
    }

    const dayRange = getDayRange(date);
    if (!dayRange) {
      return res.status(400).json({ success: false, message: 'Invalid session date.' });
    }

    const [students, records] = await Promise.all([
      User.find(buildCourseStudentQuery(course))
        .sort({ name: 1 })
        .select('name rollNumber department semester'),
      Attendance.find({
        teacher: req.user._id,
        semesterCourse: course._id,
        date: { $gte: dayRange.start, $lt: dayRange.end },
      }).sort({ createdAt: -1 }),
    ]);

    const recordMap = new Map(
      records.map((record) => [String(record.student), record])
    );

    const roster = students.map((student) => ({
      ...student.toObject(),
      attendance: recordMap.get(String(student._id)) || null,
    }));

    res.status(200).json({
      success: true,
      data: {
        course,
        date: dayRange.start,
        students: roster,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/attendance', async (req, res) => {
  try {
    const { courseId, date, records } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Assigned course is required.',
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Records array is required.' });
    }

    const course = await getAssignedCourse(req.user._id, courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'This course is not assigned to you.',
      });
    }

    const studentIds = records.map((record) => record.studentId);
    const students = await User.find({
      _id: { $in: studentIds },
      ...buildCourseStudentQuery(course),
    }).select('_id');

    if (students.length !== studentIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Some students are not eligible for this course.',
      });
    }

    const results = [];
    const errors = [];
    const dateObj = new Date(date || new Date());
    dateObj.setHours(0, 0, 0, 0);

    for (const record of records) {
      try {
        const attendance = await Attendance.findOneAndUpdate(
          {
            student: record.studentId,
            subject: course.title,
            date: dateObj,
          },
          {
            student: record.studentId,
            teacher: req.user._id,
            semesterCourse: course._id,
            subject: course.title,
            date: dateObj,
            status: record.status || 'present',
            markedBy: 'teacher',
            remarks: record.remarks || '',
          },
          { upsert: true, new: true, runValidators: true }
        );

        results.push(attendance);
      } catch (err) {
        errors.push({ studentId: record.studentId, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `${results.length} records saved.`,
      data: results,
      errors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/attendance/:id', async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { status, remarks, markedBy: 'teacher' },
      { new: true }
    )
      .populate('student', 'name rollNumber')
      .populate('semesterCourse', 'title code department semester');

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: 'Attendance record not found.' });
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/attendance/:id', async (req, res) => {
  try {
    const record = await Attendance.findOneAndDelete({
      _id: req.params.id,
      teacher: req.user._id,
    });

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: 'Record not found.' });
    }

    res
      .status(200)
      .json({ success: true, message: 'Attendance deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/attendance/summary/:studentId', async (req, res) => {
  try {
    const records = await Attendance.find({
      teacher: req.user._id,
      student: req.params.studentId,
    });

    const summary = {};
    records.forEach((record) => {
      if (!summary[record.subject]) {
        summary[record.subject] = { total: 0, present: 0, absent: 0, late: 0 };
      }
      summary[record.subject].total += 1;
      summary[record.subject][record.status] += 1;
    });

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/results', async (req, res) => {
  try {
    const { studentId, semester, academicYear, courseId } = req.query;

    const filter = { teacher: req.user._id };
    if (studentId) filter.student = studentId;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;
    if (courseId) filter.semesterCourse = courseId;

    const results = await Result.find(filter)
      .populate('student', 'name rollNumber department semester')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/results', async (req, res) => {
  try {
    const { studentId, courseId, academicYear, marks, totalMarks, remarks } =
      req.body;

    if (!studentId || !courseId || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Student, assigned course, and academic year are required.',
      });
    }

    const course = await getAssignedCourse(req.user._id, courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'This course is not assigned to you.',
      });
    }

    const student = await User.findOne({
      _id: studentId,
      ...buildCourseStudentQuery(course),
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Student is not eligible for this course.',
      });
    }

    const result = await Result.findOneAndUpdate(
      {
        student: studentId,
        subject: course.title,
        semester: course.semester,
        academicYear,
      },
      {
        student: studentId,
        teacher: req.user._id,
        semesterCourse: course._id,
        subject: course.title,
        semester: course.semester,
        academicYear,
        marks: marks || { theory: 0, practical: 0, internal: 0 },
        totalMarks: totalMarks || { theory: 100, practical: 50, internal: 30 },
        remarks: remarks || '',
      },
      { upsert: true, new: true, runValidators: true }
    ).populate('student', 'name rollNumber department semester');

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/results/:id', async (req, res) => {
  try {
    const { marks, totalMarks, remarks } = req.body;

    const result = await Result.findOne({
      _id: req.params.id,
      teacher: req.user._id,
    });

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: 'Result not found.' });
    }

    result.marks = marks || result.marks;
    result.totalMarks = totalMarks || result.totalMarks;
    result.remarks = remarks !== undefined ? remarks : result.remarks;

    await result.save();
    await result.populate('student', 'name rollNumber department');

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/results/:id', async (req, res) => {
  try {
    const result = await Result.findOneAndDelete({
      _id: req.params.id,
      teacher: req.user._id,
    });

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: 'Result not found.' });
    }

    res
      .status(200)
      .json({ success: true, message: 'Result deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
