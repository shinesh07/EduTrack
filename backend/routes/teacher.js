const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('teacher'));

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const teacherId = req.user._id;

    const [studentCount, attendanceCount, resultCount] = await Promise.all([
      User.countDocuments({ assignedTeacher: teacherId, role: 'student' }),
      Attendance.countDocuments({ teacher: teacherId }),
      Result.countDocuments({ teacher: teacherId }),
    ]);

    const students = await User.find({
      assignedTeacher: teacherId,
      role: 'student',
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name rollNumber department semester');

    res.status(200).json({
      success: true,
      data: { studentCount, attendanceCount, resultCount, recentStudents: students },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── STUDENTS ─────────────────────────────────────────────────────────────────

// GET /api/teacher/students — get all students under this teacher
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({
      assignedTeacher: req.user._id,
      role: 'student',
    })
      .sort({ name: 1 })
      .select('-password');

    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

// GET /api/teacher/attendance
router.get('/attendance', async (req, res) => {
  try {
    const { studentId, subject, startDate, endDate } = req.query;

    const filter = { teacher: req.user._id };
    if (studentId) filter.student = studentId;
    if (subject) filter.subject = subject;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filter)
      .populate('student', 'name rollNumber department semester')
      .sort({ date: -1 });

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/teacher/attendance — mark attendance for multiple students
router.post('/attendance', async (req, res) => {
  try {
    const { records } = req.body;
    // records: [{studentId, subject, date, status, remarks}]

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Records array is required.' });
    }

    // Verify all students belong to this teacher
    const studentIds = records.map((r) => r.studentId);
    const students = await User.find({
      _id: { $in: studentIds },
      assignedTeacher: req.user._id,
    });

    if (students.length !== studentIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Some students are not under your supervision.',
      });
    }

    const results = [];
    const errors = [];

    for (const record of records) {
      try {
        const dateObj = new Date(record.date);
        dateObj.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOneAndUpdate(
          {
            student: record.studentId,
            subject: record.subject,
            date: dateObj,
          },
          {
            student: record.studentId,
            teacher: req.user._id,
            subject: record.subject,
            date: dateObj,
            status: record.status || 'present',
            markedBy: 'teacher',
            remarks: record.remarks || '',
          },
          { upsert: true, new: true }
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

// PUT /api/teacher/attendance/:id
router.put('/attendance/:id', async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { status, remarks },
      { new: true }
    ).populate('student', 'name rollNumber');

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

// DELETE /api/teacher/attendance/:id
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

// GET /api/teacher/attendance/summary/:studentId
router.get('/attendance/summary/:studentId', async (req, res) => {
  try {
    const records = await Attendance.find({
      teacher: req.user._id,
      student: req.params.studentId,
    });

    const summary = {};
    records.forEach((r) => {
      if (!summary[r.subject]) {
        summary[r.subject] = { total: 0, present: 0, absent: 0, late: 0 };
      }
      summary[r.subject].total++;
      summary[r.subject][r.status]++;
    });

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── RESULTS ──────────────────────────────────────────────────────────────────

// GET /api/teacher/results
router.get('/results', async (req, res) => {
  try {
    const { studentId, semester, academicYear } = req.query;

    const filter = { teacher: req.user._id };
    if (studentId) filter.student = studentId;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const results = await Result.find(filter)
      .populate('student', 'name rollNumber department semester')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/teacher/results
router.post('/results', async (req, res) => {
  try {
    const { studentId, subject, semester, academicYear, marks, totalMarks, remarks } =
      req.body;

    // Verify student belongs to this teacher
    const student = await User.findOne({
      _id: studentId,
      assignedTeacher: req.user._id,
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Student not under your supervision.',
      });
    }

    const result = await Result.findOneAndUpdate(
      { student: studentId, subject, semester, academicYear },
      {
        student: studentId,
        teacher: req.user._id,
        subject,
        semester,
        academicYear,
        marks: marks || { theory: 0, practical: 0, internal: 0 },
        totalMarks: totalMarks || { theory: 100, practical: 50, internal: 30 },
        remarks: remarks || '',
      },
      { upsert: true, new: true, runValidators: true }
    ).populate('student', 'name rollNumber department');

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/teacher/results/:id
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

    await result.save(); // triggers pre-save grade calc
    await result.populate('student', 'name rollNumber department');

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/teacher/results/:id
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
