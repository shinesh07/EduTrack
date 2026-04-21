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

const getNumericGradePoint = (result) => {
  const gradePoint = Number(result?.gradePoint);
  return Number.isFinite(gradePoint) ? gradePoint : null;
};

const calculateAverageGradePoint = (results = []) => {
  const graded = results
    .map(getNumericGradePoint)
    .filter((gradePoint) => gradePoint !== null);

  if (graded.length === 0) return null;
  return graded.reduce((sum, gradePoint) => sum + gradePoint, 0) / graded.length;
};

const formatGpa = (value) => (value === null ? 'N/A' : value.toFixed(2));

const getResultTotal = (result) => {
  const marks = result?.marks || {};
  const totalMarks = result?.totalMarks || {};

  const scored =
    Number(marks.theory || 0) +
    Number(marks.practical || 0) +
    Number(marks.internal || 0);
  const max =
    Number(totalMarks.theory || 0) +
    Number(totalMarks.practical || 0) +
    Number(totalMarks.internal || 0);

  return { scored, max };
};

const sortResultsBySemesterAndCourse = (left, right) => {
  const semesterDiff = Number(left?.semester || 0) - Number(right?.semester || 0);
  if (semesterDiff !== 0) return semesterDiff;

  const leftCode = String(left?.semesterCourse?.code || '');
  const rightCode = String(right?.semesterCourse?.code || '');
  const codeDiff = leftCode.localeCompare(rightCode);
  if (codeDiff !== 0) return codeDiff;

  return String(left?.subject || '').localeCompare(String(right?.subject || ''));
};

const buildSemesterSummaries = (results = []) => {
  const groupedBySemester = new Map();

  [...results]
    .sort(sortResultsBySemesterAndCourse)
    .forEach((result) => {
      const semester = Number(result?.semester || 0);
      if (!semester) return;

      if (!groupedBySemester.has(semester)) {
        groupedBySemester.set(semester, {
          semester,
          academicYear: result?.academicYear || 'N/A',
          results: [],
          gradePointTotal: 0,
          gradedCount: 0,
        });
      }

      const summary = groupedBySemester.get(semester);
      summary.results.push(result);

      const gradePoint = getNumericGradePoint(result);
      if (gradePoint !== null) {
        summary.gradePointTotal += gradePoint;
        summary.gradedCount += 1;
      }
    });

  let cumulativeGradePoints = 0;
  let cumulativeCount = 0;

  return Array.from(groupedBySemester.values())
    .sort((left, right) => left.semester - right.semester)
    .map((summary) => {
      cumulativeGradePoints += summary.gradePointTotal;
      cumulativeCount += summary.gradedCount;

      return {
        ...summary,
        sgpa:
          summary.gradedCount > 0
            ? summary.gradePointTotal / summary.gradedCount
            : null,
        runningCgpa:
          cumulativeCount > 0 ? cumulativeGradePoints / cumulativeCount : null,
      };
    });
};

const ensurePdfSpace = (doc, yPos, requiredHeight, bottomMargin = 70) => {
  if (yPos + requiredHeight > doc.page.height - bottomMargin) {
    doc.addPage();
    return 50;
  }
  return yPos;
};

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
    const currentSemester = Number(req.user.semester || 0);

    const filter = { student: req.user._id };
    if (academicYear) filter.academicYear = academicYear;

    if (semester) {
      const requestedSemester = Number(semester);
      filter.semester =
        requestedSemester > 0 && requestedSemester < currentSemester
          ? requestedSemester
          : { $lt: 1 };
    } else if (currentSemester > 1) {
      filter.semester = { $lt: currentSemester };
    } else {
      filter.semester = { $lt: 1 };
    }

    const results = await Result.find(filter)
      .populate('teacher', 'name')
      .populate('semesterCourse', 'code')
      .sort({ semester: 1, subject: 1 });

    const cgpaSource =
      semester || academicYear
        ? await Result.find({ student: req.user._id }).select('gradePoint')
        : results;
    const cgpa = formatGpa(calculateAverageGradePoint(cgpaSource));

    res.status(200).json({ success: true, data: results, cgpa });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/transcript', async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select('-password').lean();
    const currentSemester = Number(student?.semester || 0);
    const [currentCourses, results, attendanceRecords] = await Promise.all([
      getCurrentSemesterCourses(student),
      Result.find({ student: req.user._id })
        .populate('teacher', 'name')
        .populate('semesterCourse', 'code')
        .sort({ semester: 1, subject: 1 })
        .lean(),
      Attendance.find({ student: req.user._id }).lean(),
    ]);

    const completedResults = results.filter(
      (result) => Number(result?.semester || 0) < currentSemester
    );
    const semesterSummaries = buildSemesterSummaries(completedResults);
    const subjectCount = completedResults.length;
    const finalCgpa = formatGpa(calculateAverageGradePoint(completedResults));

    const totalAttendance = attendanceRecords.length;
    const presentAttendance = attendanceRecords.filter(
      (attendance) => attendance.status === 'present'
    ).length;
    const attendanceRate =
      totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : 0;

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
      ['Current Semester', student.semester ? `S${student.semester}` : 'N/A'],
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
      .text(finalCgpa, 50, summaryY + 12, { width: 150, align: 'center' });
    doc
      .fillColor('#aaaaaa')
      .fontSize(9)
      .font('Helvetica')
      .text('FINAL CGPA', 50, summaryY + 45, { width: 150, align: 'center' });

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
      .text(semesterSummaries.length.toString(), 380, summaryY + 12, {
        width: 170,
        align: 'center',
      });
    doc
      .fillColor('#aaaaaa')
      .fontSize(9)
      .font('Helvetica')
      .text('SEMESTERS COVERED', 380, summaryY + 45, {
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

    const transcriptColumns = [
      { label: 'Code', x: 60, width: 70, align: 'left' },
      { label: 'Course', x: 135, width: 200, align: 'left' },
      { label: 'Total', x: 340, width: 55, align: 'center' },
      { label: 'Grade', x: 400, width: 35, align: 'center' },
      { label: 'GP', x: 440, width: 30, align: 'center' },
      { label: 'Status', x: 475, width: 60, align: 'center' },
    ];

    semesterSummaries.forEach((summary) => {
      const sectionHeight = 74 + summary.results.length * 22 + 36;
      yPos = ensurePdfSpace(doc, yPos, sectionHeight);

      doc.rect(50, yPos, doc.page.width - 100, 36).fill('#e8edf5');
      doc
        .fillColor('#0a1628')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Semester ${summary.semester}`, 60, yPos + 8);
      doc
        .fillColor('#56657a')
        .fontSize(8)
        .font('Helvetica')
        .text(`Academic Year: ${summary.academicYear}`, 60, yPos + 22);
      doc
        .fillColor('#0a1628')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(`SGPA: ${formatGpa(summary.sgpa)}`, 325, yPos + 8, {
          width: 95,
          align: 'right',
        });
      doc
        .fillColor('#0a1628')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(`CGPA Till S${summary.semester}: ${formatGpa(summary.runningCgpa)}`, 400, yPos + 8, {
          width: 135,
          align: 'right',
        });

      yPos += 36;

      doc.rect(50, yPos, doc.page.width - 100, 20).fill('#0a1628');
      transcriptColumns.forEach((column) => {
        doc
          .fillColor('#f0a500')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(column.label, column.x, yPos + 6, {
            width: column.width,
            align: column.align,
          });
      });
      yPos += 20;

      summary.results.forEach((result, index) => {
        const { scored, max } = getResultTotal(result);
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        const rowValues = [
          result?.semesterCourse?.code || 'N/A',
          result.subject,
          `${scored}/${max}`,
          result.grade || '-',
          getNumericGradePoint(result)?.toString() || '-',
          String(result.status || '-').toUpperCase(),
        ];

        doc.rect(50, yPos, doc.page.width - 100, 22).fill(rowColor);

        rowValues.forEach((value, columnIndex) => {
          const column = transcriptColumns[columnIndex];
          let color = '#334155';

          if (column.label === 'Grade') color = '#0a1628';
          if (column.label === 'Status') {
            color = result.status === 'pass' ? '#2e7d32' : '#c62828';
          }

          doc
            .fillColor(color)
            .fontSize(8)
            .font('Helvetica')
            .text(value, column.x, yPos + 7, {
              width: column.width,
              align: column.align,
              ellipsis: true,
            });
        });

        yPos += 22;
      });

      doc
        .fillColor('#555555')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(
          `Semester SGPA: ${formatGpa(summary.sgpa)}   •   CGPA Till Semester ${summary.semester}: ${formatGpa(summary.runningCgpa)}   •   Courses: ${summary.results.length}`,
          50,
          yPos + 5,
          {
            align: 'right',
            width: doc.page.width - 100,
          }
        );
      yPos += 24;
    });

    if (completedResults.length === 0) {
      doc
        .fillColor('#888888')
        .fontSize(11)
        .font('Helvetica')
        .text('No completed semester results available yet.', 50, yPos + 10, {
          align: 'center',
        });
      yPos += 40;
    }

    if (completedResults.length > 0) {
      yPos = ensurePdfSpace(doc, yPos, 70);
      doc.rect(50, yPos, doc.page.width - 100, 55).fillAndStroke('#0a1628', '#0a1628');
      doc
        .fillColor('#f0a500')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`Final CGPA: ${finalCgpa}`, 50, yPos + 12, {
          width: doc.page.width - 100,
          align: 'center',
        });
      doc
        .fillColor('#d1d5db')
        .fontSize(9)
        .font('Helvetica')
        .text(
          `Semesters covered: ${semesterSummaries.length}   •   Courses completed: ${subjectCount}`,
          50,
          yPos + 34,
          {
            width: doc.page.width - 100,
            align: 'center',
          }
        );
      yPos += 70;
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
