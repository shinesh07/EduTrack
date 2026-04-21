const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const SemesterCourse = require('../models/SemesterCourse');
const { protect, authorize } = require('../middleware/auth');
const {
  getAcademicSettings,
  getSemesterCourses,
  getUniqueTeacherIds,
  normalizeDepartmentKey,
} = require('../utils/academic');

router.use(protect, authorize('student'));

const getCurrentSemesterCourses = (student, populateTeacher = true) =>
  getSemesterCourses({
    department: student.department,
    semester: student.semester,
    populateTeacher,
  });

const getTeacherNamesFromCourses = (courses = []) =>
  [
    ...new Set(
      courses
        .map((course) => course?.teacher?.name)
        .filter(Boolean)
    ),
  ].join(', ') || 'N/A';

router.get('/semester-overview', async (req, res) => {
  try {
    const [settings, courses] = await Promise.all([
      getAcademicSettings(),
      getCurrentSemesterCourses(req.user),
    ]);

    const nextSemester =
      req.user.semester && Number(req.user.semester) < 8
        ? Number(req.user.semester) + 1
        : null;

    res.status(200).json({
      success: true,
      data: {
        department: req.user.department,
        semester: req.user.semester,
        nextSemester,
        canChangeSemester:
          Boolean(settings.allowStudentSemesterEdit) && Boolean(nextSemester),
        semesterEditEnabled: settings.allowStudentSemesterEdit,
        courses,
        teacherCount: getUniqueTeacherIds(courses).length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/semester/promote', async (req, res) => {
  try {
    const settings = await getAcademicSettings();

    if (!settings.allowStudentSemesterEdit) {
      return res.status(403).json({
        success: false,
        message: 'Semester changes are currently locked by the admin.',
      });
    }

    const currentSemester = Number(req.user.semester || 0);
    if (!currentSemester || currentSemester >= 8) {
      return res.status(400).json({
        success: false,
        message: 'You cannot move to the next semester from your current semester.',
      });
    }

    const nextSemester = currentSemester + 1;
    const nextSemesterCourses = await getSemesterCourses({
      department: req.user.department,
      semester: nextSemester,
      populateTeacher: true,
    });

    if (nextSemesterCourses.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'The next semester course list has not been configured by the admin yet.',
      });
    }

    const student = await User.findByIdAndUpdate(
      req.user._id,
      { semester: nextSemester },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: `Semester updated to Semester ${nextSemester}. Courses were assigned automatically.`,
      data: {
        user: student,
        courses: nextSemesterCourses,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const studentId = req.user._id;

    const [attendanceCount, resultCount, currentCourses] = await Promise.all([
      Attendance.countDocuments({ student: studentId }),
      Result.countDocuments({ student: studentId }),
      getCurrentSemesterCourses(req.user),
    ]);

    const presentCount = await Attendance.countDocuments({
      student: studentId,
      status: 'present',
    });

    const attendanceRate =
      attendanceCount > 0
        ? Math.round((presentCount / attendanceCount) * 100)
        : 0;

    const recentResults = await Result.find({ student: studentId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('teacher', 'name');

    res.status(200).json({
      success: true,
      data: {
        attendanceCount,
        attendanceRate,
        resultCount,
        recentResults,
        courses: currentCourses,
        teacherCount: getUniqueTeacherIds(currentCourses).length,
        courseCount: currentCourses.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const { subject, startDate, endDate } = req.query;

    const filter = { student: req.user._id };
    if (subject) filter.subject = subject;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filter)
      .populate('teacher', 'name')
      .sort({ date: -1 });

    const summary = {};
    records.forEach((record) => {
      if (!summary[record.subject]) {
        summary[record.subject] = { total: 0, present: 0, absent: 0, late: 0 };
      }
      summary[record.subject].total += 1;
      summary[record.subject][record.status] += 1;
    });

    res.status(200).json({ success: true, data: records, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/attendance', async (req, res) => {
  try {
    const { semesterCourseId, status } = req.body;

    if (!semesterCourseId) {
      return res.status(400).json({
        success: false,
        message: 'Semester course is required.',
      });
    }

    const course = await SemesterCourse.findOne({
      _id: semesterCourseId,
      departmentKey: normalizeDepartmentKey(req.user.department),
      semester: req.user.semester,
      isActive: true,
    }).populate('teacher', 'name');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'This course is not available in your current semester.',
      });
    }

    if (!course.teacher) {
      return res.status(400).json({
        success: false,
        message: 'This course does not have a teacher assigned yet.',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      student: req.user._id,
      subject: course.title,
      date: today,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this course today.',
        data: existing,
      });
    }

    const attendance = await Attendance.create({
      student: req.user._id,
      teacher: course.teacher._id,
      semesterCourse: course._id,
      subject: course.title,
      date: today,
      status: status || 'present',
      markedBy: 'student',
    });

    await attendance.populate('teacher', 'name');

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/attendance/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await Attendance.find({
      student: req.user._id,
      date: { $gte: today, $lt: tomorrow },
    }).populate('teacher', 'name');

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/results', async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    const filter = { student: req.user._id };
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const results = await Result.find(filter)
      .populate('teacher', 'name')
      .sort({ semester: 1, subject: 1 });

    let totalGradePoints = 0;
    let count = 0;
    results.forEach((result) => {
      if (result.gradePoint !== undefined) {
        totalGradePoints += result.gradePoint;
        count += 1;
      }
    });

    const cgpa = count > 0 ? (totalGradePoints / count).toFixed(2) : 'N/A';

    res.status(200).json({ success: true, data: results, cgpa });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/transcript', async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select('-password');
    const currentCourses = await getCurrentSemesterCourses(student);

    const results = await Result.find({ student: req.user._id })
      .populate('teacher', 'name')
      .sort({ semester: 1, subject: 1 });

    const attendanceRecords = await Attendance.find({ student: req.user._id });

    let totalGradePoints = 0;
    let subjectCount = 0;
    results.forEach((result) => {
      if (result.gradePoint !== undefined) {
        totalGradePoints += result.gradePoint;
        subjectCount += 1;
      }
    });

    const cgpa =
      subjectCount > 0
        ? (totalGradePoints / subjectCount).toFixed(2)
        : 'N/A';

    const totalAttendance = attendanceRecords.length;
    const presentAttendance = attendanceRecords.filter(
      (attendance) => attendance.status === 'present'
    ).length;
    const attendanceRate =
      totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : 0;

    const semesterMap = {};
    results.forEach((result) => {
      if (!semesterMap[result.semester]) semesterMap[result.semester] = [];
      semesterMap[result.semester].push(result);
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transcript_${student.rollNumber || student._id}.pdf`
    );

    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 120).fill('#0a1628');

    doc
      .fillColor('#f0a500')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('ACADEMIC TRANSCRIPT', 50, 30, { align: 'center' });

    doc
      .fillColor('#ffffff')
      .fontSize(12)
      .font('Helvetica')
      .text('Student Result & Attendance Management System', 50, 65, {
        align: 'center',
      });

    doc
      .fillColor('#aaaaaa')
      .fontSize(10)
      .text(
        `Generated on: ${new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}`,
        50,
        90,
        { align: 'center' }
      );

    doc.moveDown(4);
    doc
      .rect(50, 135, doc.page.width - 100, 130)
      .fillAndStroke('#f8f9fa', '#e0e0e0');

    doc
      .fillColor('#0a1628')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('STUDENT INFORMATION', 70, 150);

    const infoY = 175;
    doc.fontSize(10).font('Helvetica');

    const leftInfo = [
      ['Full Name', student.name],
      ['Roll Number', student.rollNumber || 'N/A'],
      ['Email', student.email],
    ];
    const rightInfo = [
      ['Department', student.department || 'N/A'],
      ['Semester', student.semester ? `Semester ${student.semester}` : 'N/A'],
      ['Current Teachers', getTeacherNamesFromCourses(currentCourses)],
    ];

    leftInfo.forEach(([label, value], index) => {
      doc
        .fillColor('#666666')
        .text(`${label}:`, 70, infoY + index * 20)
        .fillColor('#111111')
        .text(value, 180, infoY + index * 20);
    });

    rightInfo.forEach(([label, value], index) => {
      doc
        .fillColor('#666666')
        .text(`${label}:`, 330, infoY + index * 20)
        .fillColor('#111111')
        .text(value, 460, infoY + index * 20);
    });

    const summaryY = 285;

    doc.rect(50, summaryY, 150, 70).fillAndStroke('#0a1628', '#0a1628');
    doc
      .fillColor('#f0a500')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(cgpa, 50, summaryY + 12, { width: 150, align: 'center' });
    doc
      .fillColor('#aaaaaa')
      .fontSize(9)
      .font('Helvetica')
      .text('CGPA', 50, summaryY + 45, { width: 150, align: 'center' });

    doc.rect(215, summaryY, 150, 70).fillAndStroke('#0a1628', '#0a1628');
    doc
      .fillColor('#f0a500')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(`${attendanceRate}%`, 215, summaryY + 12, {
        width: 150,
        align: 'center',
      });
    doc
      .fillColor('#aaaaaa')
      .fontSize(9)
      .font('Helvetica')
      .text('ATTENDANCE', 215, summaryY + 45, {
        width: 150,
        align: 'center',
      });

    doc.rect(380, summaryY, 170, 70).fillAndStroke('#0a1628', '#0a1628');
    doc
      .fillColor('#f0a500')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(subjectCount.toString(), 380, summaryY + 12, {
        width: 170,
        align: 'center',
      });
    doc
      .fillColor('#aaaaaa')
      .fontSize(9)
      .font('Helvetica')
      .text('SUBJECTS COMPLETED', 380, summaryY + 45, {
        width: 170,
        align: 'center',
      });

    let yPos = summaryY + 95;

    doc
      .fillColor('#0a1628')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('ACADEMIC RESULTS', 50, yPos);

    yPos += 25;

    const semesters = Object.keys(semesterMap).sort((a, b) => a - b);

    for (const sem of semesters) {
      if (yPos > doc.page.height - 150) {
        doc.addPage();
        yPos = 50;
      }

      doc.rect(50, yPos, doc.page.width - 100, 25).fill('#e8edf5');
      doc
        .fillColor('#0a1628')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Semester ${sem}`, 60, yPos + 7);
      yPos += 25;

      doc.rect(50, yPos, doc.page.width - 100, 22).fill('#0a1628');
      const cols = [60, 220, 280, 340, 390, 430, 480, 520];
      const headers = [
        'Subject',
        'Theory',
        'Practical',
        'Internal',
        'Total',
        'Grade',
        'GP',
        'Status',
      ];

      headers.forEach((header, index) => {
        doc
          .fillColor('#f0a500')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(header, cols[index], yPos + 7);
      });
      yPos += 22;

      semesterMap[sem].forEach((result, index) => {
        if (yPos > doc.page.height - 100) {
          doc.addPage();
          yPos = 50;
        }

        const rowColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        doc.rect(50, yPos, doc.page.width - 100, 20).fill(rowColor);

        const total =
          result.marks.theory + result.marks.practical + result.marks.internal;
        const maxTotal =
          result.totalMarks.theory +
          result.totalMarks.practical +
          result.totalMarks.internal;

        const rowData = [
          result.subject,
          `${result.marks.theory}/${result.totalMarks.theory}`,
          `${result.marks.practical}/${result.totalMarks.practical}`,
          `${result.marks.internal}/${result.totalMarks.internal}`,
          `${total}/${maxTotal}`,
          result.grade || '-',
          result.gradePoint !== undefined ? result.gradePoint.toString() : '-',
          result.status.toUpperCase(),
        ];

        rowData.forEach((value, rowIndex) => {
          let color = '#333333';
          if (rowIndex === 7) {
            color = result.status === 'pass' ? '#2e7d32' : '#c62828';
          }
          if (rowIndex === 5) color = '#0a1628';

          doc
            .fillColor(color)
            .fontSize(8)
            .font('Helvetica')
            .text(value, cols[rowIndex], yPos + 6, {
              width: rowIndex === 0 ? 155 : 55,
              ellipsis: true,
            });
        });

        yPos += 20;
      });

      const semResults = semesterMap[sem];
      const sgpa = (
        semResults.reduce((acc, result) => acc + (result.gradePoint || 0), 0) /
        semResults.length
      ).toFixed(2);

      doc
        .fillColor('#555555')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`Semester GPA: ${sgpa}`, 50, yPos + 5, {
          align: 'right',
          width: doc.page.width - 100,
        });
      yPos += 25;
    }

    if (results.length === 0) {
      doc
        .fillColor('#888888')
        .fontSize(11)
        .font('Helvetica')
        .text('No results available yet.', 50, yPos + 10, { align: 'center' });
      yPos += 40;
    }

    if (yPos > doc.page.height - 80) {
      doc.addPage();
    }

    doc
      .fillColor('#999999')
      .fontSize(9)
      .font('Helvetica')
      .text(
        'This transcript was generated by EduTrack. Please contact the institution admin for corrections.',
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 }
      );

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
