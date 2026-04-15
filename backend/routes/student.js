const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('student'));

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const studentId = req.user._id;

    const [attendanceCount, resultCount] = await Promise.all([
      Attendance.countDocuments({ student: studentId }),
      Result.countDocuments({ student: studentId }),
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

    const teacher = req.user.assignedTeacher
      ? await User.findById(req.user.assignedTeacher).select(
          'name email department subjects'
        )
      : null;

    res.status(200).json({
      success: true,
      data: {
        attendanceCount,
        attendanceRate,
        resultCount,
        recentResults,
        teacher,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

// GET /api/student/attendance — student views their own attendance
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

    // Summary by subject
    const summary = {};
    records.forEach((r) => {
      if (!summary[r.subject]) {
        summary[r.subject] = { total: 0, present: 0, absent: 0, late: 0 };
      }
      summary[r.subject].total++;
      summary[r.subject][r.status]++;
    });

    res.status(200).json({ success: true, data: records, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/student/attendance — student self-marks attendance (today only)
router.post('/attendance', async (req, res) => {
  try {
    const { subject, status } = req.body;

    if (!subject) {
      return res
        .status(400)
        .json({ success: false, message: 'Subject is required.' });
    }

    // Get the student's teacher
    if (!req.user.assignedTeacher) {
      return res.status(400).json({
        success: false,
        message: 'No teacher assigned. Contact admin.',
      });
    }

    // Only allow marking for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      student: req.user._id,
      subject,
      date: today,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this subject today.',
        data: existing,
      });
    }

    const attendance = await Attendance.create({
      student: req.user._id,
      teacher: req.user.assignedTeacher,
      subject,
      date: today,
      status: status || 'present',
      markedBy: 'student',
    });

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/student/attendance/today — check today's attendance
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

// ─── RESULTS ──────────────────────────────────────────────────────────────────

// GET /api/student/results
router.get('/results', async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    const filter = { student: req.user._id };
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const results = await Result.find(filter)
      .populate('teacher', 'name')
      .sort({ semester: 1, subject: 1 });

    // Calculate CGPA
    let totalGradePoints = 0;
    let count = 0;
    results.forEach((r) => {
      if (r.gradePoint !== undefined) {
        totalGradePoints += r.gradePoint;
        count++;
      }
    });
    const cgpa = count > 0 ? (totalGradePoints / count).toFixed(2) : 'N/A';

    res.status(200).json({ success: true, data: results, cgpa });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── TRANSCRIPT PDF ───────────────────────────────────────────────────────────

// GET /api/student/transcript — download transcript PDF
router.get('/transcript', async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate(
      'assignedTeacher',
      'name department'
    );

    const results = await Result.find({ student: req.user._id })
      .populate('teacher', 'name')
      .sort({ semester: 1, subject: 1 });

    const attendanceRecords = await Attendance.find({ student: req.user._id });

    // Calculate stats
    let totalGradePoints = 0;
    let subjectCount = 0;
    results.forEach((r) => {
      if (r.gradePoint !== undefined) {
        totalGradePoints += r.gradePoint;
        subjectCount++;
      }
    });
    const cgpa =
      subjectCount > 0
        ? (totalGradePoints / subjectCount).toFixed(2)
        : 'N/A';

    const totalAttendance = attendanceRecords.length;
    const presentAttendance = attendanceRecords.filter(
      (a) => a.status === 'present'
    ).length;
    const attendanceRate =
      totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : 0;

    // Group results by semester
    const semesterMap = {};
    results.forEach((r) => {
      if (!semesterMap[r.semester]) semesterMap[r.semester] = [];
      semesterMap[r.semester].push(r);
    });

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transcript_${student.rollNumber || student._id}.pdf`
    );

    doc.pipe(res);

    // ── Header ─────────────────────────────────────────────────────────────────
    doc
      .rect(0, 0, doc.page.width, 120)
      .fill('#0a1628');

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
      .text(`Generated on: ${new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })}`, 50, 90, { align: 'center' });

    // ── Student Info ────────────────────────────────────────────────────────────
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
      ['Assigned Teacher', student.assignedTeacher?.name || 'N/A'],
    ];

    leftInfo.forEach(([label, value], i) => {
      doc
        .fillColor('#666666')
        .text(`${label}:`, 70, infoY + i * 20)
        .fillColor('#111111')
        .text(value, 180, infoY + i * 20);
    });

    rightInfo.forEach(([label, value], i) => {
      doc
        .fillColor('#666666')
        .text(`${label}:`, 330, infoY + i * 20)
        .fillColor('#111111')
        .text(value, 460, infoY + i * 20);
    });

    // ── Summary Cards ───────────────────────────────────────────────────────────
    const summaryY = 285;

    // CGPA card
    doc.rect(50, summaryY, 150, 70).fillAndStroke('#0a1628', '#0a1628');
    doc.fillColor('#f0a500').fontSize(22).font('Helvetica-Bold').text(cgpa, 50, summaryY + 12, { width: 150, align: 'center' });
    doc.fillColor('#aaaaaa').fontSize(9).font('Helvetica').text('CGPA', 50, summaryY + 45, { width: 150, align: 'center' });

    // Attendance card
    doc.rect(215, summaryY, 150, 70).fillAndStroke('#0a1628', '#0a1628');
    doc.fillColor('#f0a500').fontSize(22).font('Helvetica-Bold').text(`${attendanceRate}%`, 215, summaryY + 12, { width: 150, align: 'center' });
    doc.fillColor('#aaaaaa').fontSize(9).font('Helvetica').text('ATTENDANCE', 215, summaryY + 45, { width: 150, align: 'center' });

    // Subjects card
    doc.rect(380, summaryY, 170, 70).fillAndStroke('#0a1628', '#0a1628');
    doc.fillColor('#f0a500').fontSize(22).font('Helvetica-Bold').text(subjectCount.toString(), 380, summaryY + 12, { width: 170, align: 'center' });
    doc.fillColor('#aaaaaa').fontSize(9).font('Helvetica').text('SUBJECTS COMPLETED', 380, summaryY + 45, { width: 170, align: 'center' });

    // ── Results Table ───────────────────────────────────────────────────────────
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

      // Semester header
      doc.rect(50, yPos, doc.page.width - 100, 25).fill('#e8edf5');
      doc
        .fillColor('#0a1628')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Semester ${sem}`, 60, yPos + 7);
      yPos += 25;

      // Table header
      doc.rect(50, yPos, doc.page.width - 100, 22).fill('#0a1628');
      const cols = [60, 220, 280, 340, 390, 430, 480, 520];
      const headers = ['Subject', 'Theory', 'Practical', 'Internal', 'Total', 'Grade', 'GP', 'Status'];
      headers.forEach((h, i) => {
        doc.fillColor('#f0a500').fontSize(8).font('Helvetica-Bold').text(h, cols[i], yPos + 7);
      });
      yPos += 22;

      // Table rows
      semesterMap[sem].forEach((result, idx) => {
        if (yPos > doc.page.height - 100) {
          doc.addPage();
          yPos = 50;
        }

        const rowColor = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
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

        rowData.forEach((d, i) => {
          let color = '#333333';
          if (i === 7) color = result.status === 'pass' ? '#2e7d32' : '#c62828';
          if (i === 5) color = '#0a1628';
          doc.fillColor(color).fontSize(8).font('Helvetica').text(d, cols[i], yPos + 6, { width: i === 0 ? 155 : 55, ellipsis: true });
        });

        yPos += 20;
      });

      // Semester SGPA
      const semResults = semesterMap[sem];
      const sgpa = (
        semResults.reduce((a, r) => a + (r.gradePoint || 0), 0) /
        semResults.length
      ).toFixed(2);
      doc
        .fillColor('#555555')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`Semester GPA: ${sgpa}`, 50, yPos + 5, { align: 'right', width: doc.page.width - 100 });
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

    // ── Footer ──────────────────────────────────────────────────────────────────
    if (yPos > doc.page.height - 80) {
      doc.addPage();
      yPos = 50;
    }

    doc
      .moveTo(50, yPos + 10)
      .lineTo(doc.page.width - 50, yPos + 10)
      .stroke('#cccccc');

    doc
      .fillColor('#888888')
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This is a computer-generated transcript. No signature required.',
        50,
        yPos + 20,
        { align: 'center' }
      );

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
