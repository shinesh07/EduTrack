const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const crypto = require('crypto');
const { protect, authorize } = require('../middleware/auth');
const { sendAdminCreatedEmail } = require('../config/email');

// Apply auth to all admin routes
router.use(protect, authorize('admin'));

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [teachers, students, attendanceRecords, results] = await Promise.all([
      User.countDocuments({ role: 'teacher', isActive: true }),
      User.countDocuments({ role: 'student', isActive: true }),
      Attendance.countDocuments(),
      Result.countDocuments(),
    ]);

    const recentStudents = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email rollNumber department createdAt');

    const recentResults = await Result.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student', 'name rollNumber')
      .populate('teacher', 'name');

    res.status(200).json({
      success: true,
      data: {
        teachers,
        students,
        attendanceRecords,
        results,
        recentStudents,
        recentResults,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── TEACHERS ────────────────────────────────────────────────────────────────

// GET /api/admin/teachers
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .sort({ createdAt: -1 })
      .select('-password');

    // Add student count for each teacher
    const teachersWithCounts = await Promise.all(
      teachers.map(async (teacher) => {
        const studentCount = await User.countDocuments({
          assignedTeacher: teacher._id,
        });
        return { ...teacher.toObject(), studentCount };
      })
    );

    res
      .status(200)
      .json({ success: true, data: teachersWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/teachers
router.post('/teachers', async (req, res) => {
  try {
    const { name, email, password, department, phone, subjects } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const teacher = await User.create({
      name,
      email,
      password,
      role: 'teacher',
      department,
      phone,
      subjects: subjects || [],
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
    });

    let emailFailed = false;
    try {
      await sendAdminCreatedEmail({ toEmail: email, name, token: verificationToken, role: 'teacher', tempPassword: password });
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr.message);
      emailFailed = true;
    }

    const { password: _, verificationToken: __, verificationTokenExpiry: ___, ...teacherData } = teacher.toObject();
    res.status(201).json({
      success: true,
      data: teacherData,
      message: emailFailed
        ? 'Teacher created, but verification email failed to send. Check email settings.'
        : 'Teacher created. A verification email has been sent.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/teachers/:id
router.put('/teachers/:id', async (req, res) => {
  try {
    const { name, email, department, phone, subjects, isActive, password } =
      req.body;

    const updateData = { name, email, department, phone, isActive };
    if (subjects) updateData.subjects = subjects;

    const teacher = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: 'Teacher not found.' });
    }

    // Update password separately if provided
    if (password) {
      const t = await User.findById(req.params.id);
      t.password = password;
      await t.save();
    }

    res.status(200).json({ success: true, data: teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/teachers/:id
router.delete('/teachers/:id', async (req, res) => {
  try {
    const teacher = await User.findById(req.params.id);
    if (!teacher || teacher.role !== 'teacher') {
      return res
        .status(404)
        .json({ success: false, message: 'Teacher not found.' });
    }

    // Unassign students
    await User.updateMany(
      { assignedTeacher: req.params.id },
      { assignedTeacher: null }
    );

    await teacher.deleteOne();
    res
      .status(200)
      .json({ success: true, message: 'Teacher deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── STUDENTS ────────────────────────────────────────────────────────────────

// GET /api/admin/students
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .populate('assignedTeacher', 'name email department')
      .sort({ createdAt: -1 })
      .select('-password');

    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/students
router.post('/students', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      rollNumber,
      department,
      semester,
      phone,
      address,
      assignedTeacher,
    } = req.body;

    const existing = await User.findOne({
      $or: [{ email }, { rollNumber }],
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email or roll number already exists.',
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const student = await User.create({
      name, email, password, role: 'student',
      rollNumber, department, semester, phone, address,
      assignedTeacher: assignedTeacher || null,
      isVerified: false, verificationToken, verificationTokenExpiry,
    });

    let emailFailed = false;
    try {
      await sendAdminCreatedEmail({ toEmail: email, name, token: verificationToken, role: 'student', tempPassword: password });
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr.message);
      emailFailed = true;
    }

    const populated = await User.findById(student._id)
      .populate('assignedTeacher', 'name email department')
      .select('-password');

    res.status(201).json({
      success: true,
      data: populated,
      message: emailFailed
        ? 'Student created, but verification email failed to send. Check email settings.'
        : 'Student created. Verification email sent.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/students/:id
router.put('/students/:id', async (req, res) => {
  try {
    const {
      name,
      email,
      rollNumber,
      department,
      semester,
      phone,
      address,
      assignedTeacher,
      isActive,
      password,
    } = req.body;

    const updateData = {
      name,
      email,
      rollNumber,
      department,
      semester,
      phone,
      address,
      assignedTeacher: assignedTeacher || null,
      isActive,
    };

    const student = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTeacher', 'name email department')
      .select('-password');

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: 'Student not found.' });
    }

    if (password) {
      const s = await User.findById(req.params.id);
      s.password = password;
      await s.save();
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res
        .status(404)
        .json({ success: false, message: 'Student not found.' });
    }

    // Delete related records
    await Promise.all([
      Attendance.deleteMany({ student: req.params.id }),
      Result.deleteMany({ student: req.params.id }),
      student.deleteOne(),
    ]);

    res
      .status(200)
      .json({ success: true, message: 'Student and all records deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── ALL ATTENDANCE & RESULTS ─────────────────────────────────────────────────

// GET /api/admin/attendance
router.get('/attendance', async (req, res) => {
  try {
    const { studentId, teacherId, subject, startDate, endDate } = req.query;

    const filter = {};
    if (studentId) filter.student = studentId;
    if (teacherId) filter.teacher = teacherId;
    if (subject) filter.subject = subject;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filter)
      .populate('student', 'name rollNumber department')
      .populate('teacher', 'name email')
      .sort({ date: -1 });

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/results
router.get('/results', async (req, res) => {
  try {
    const { studentId, teacherId, semester, academicYear } = req.query;

    const filter = {};
    if (studentId) filter.student = studentId;
    if (teacherId) filter.teacher = teacherId;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const results = await Result.find(filter)
      .populate('student', 'name rollNumber department')
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// POST /api/admin/resend-verification/:id
router.post('/resend-verification/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+verificationToken +verificationTokenExpiry +password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'User is already verified.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = verificationTokenExpiry;
    await user.save({ validateBeforeSave: false });

    await sendAdminCreatedEmail({
      toEmail: user.email,
      name: user.name,
      token: verificationToken,
      role: user.role,
      tempPassword: '(use your existing password)',
    });

    res.status(200).json({ success: true, message: 'Verification email resent successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
