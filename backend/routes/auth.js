const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const TEACHER_POPULATE = 'name email department subjects';
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const normalizeTeacherRefs = (teachers = []) => {
  const map = new Map();
  teachers
    .filter(Boolean)
    .forEach((teacher) => {
      const key = String(teacher?._id || teacher);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, teacher);
      }
    });
  return Array.from(map.values());
};

const buildAssignedTeacherPayload = (user) => {
  const assignedTeachers = normalizeTeacherRefs([
    ...(Array.isArray(user.assignedTeachers) ? user.assignedTeachers : []),
    user.assignedTeacher,
  ]);

  return {
    assignedTeacher: assignedTeachers[0] || null,
    assignedTeachers,
  };
};

// ── POST /api/auth/signup ──────────────────────────────────────────
// Self-registration for students and teachers
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, department, semester, rollNumber, phone, subjects } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    // Only allow student and teacher self-registration
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be self-registered.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    if (rollNumber) {
      const rollExists = await User.findOne({ rollNumber });
      if (rollExists) {
        return res.status(400).json({ success: false, message: 'Roll number already registered.' });
      }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      department,
      semester,
      rollNumber,
      phone,
      subjects: Array.isArray(subjects) ? subjects : [],
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
    });

    let emailFailed = false;
    try {
      await sendVerificationEmail({
        toEmail: email,
        name,
        token: verificationToken,
        role: user.role,
        baseUrl: getBaseUrl(req),
      });
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr.message);
      emailFailed = true;
      if (process.env.NODE_ENV !== 'production') {
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiry = undefined;
        await user.save();
      } else {
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({
          success: false,
          message:
            'Account could not be created because verification email delivery failed. Please check your email settings and try again.',
        });
      }
    }

    res.status(201).json({
      success: true,
      message: emailFailed
        ? 'Account created for local development. Your email settings need to be fixed before production so verification messages can be delivered.'
        : 'Account created! Please check your email to verify your account before logging in.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/auth/resend-verification ────────────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const email = req.body?.email?.trim()?.toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email }).select('+verificationToken +verificationTokenExpiry');

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found for this email.' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot use this flow.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'This account is already verified.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = verificationTokenExpiry;
    await user.save({ validateBeforeSave: false });

    await sendVerificationEmail({
      toEmail: user.email,
      name: user.name,
      token: verificationToken,
      role: user.role,
      baseUrl: getBaseUrl(req),
    });

    res.status(200).json({
      success: true,
      message: 'A new verification email has been sent. Please check your inbox.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Login details are incorrect. Please check your email and password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    // Only block login if not verified AND not admin
    if (!user.isVerified && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox.',
        unverified: true,
      });
    }

    const token = signToken(user._id);
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      rollNumber: user.rollNumber,
      department: user.department,
      semester: user.semester,
      subjects: user.subjects,
      isVerified: user.isVerified,
      ...buildAssignedTeacherPayload(user),
    };

    res.status(200).json({ success: true, token, user: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body?.email?.trim()?.toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const successMessage = 'If an account exists for this email, a password reset link has been sent.';
    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetTokenExpiry');

    if (!user) {
      return res.status(200).json({ success: true, message: successMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetTokenExpiry = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail({
        toEmail: user.email,
        name: user.name,
        token: resetToken,
        baseUrl: getBaseUrl(req),
      });
    } catch (emailErr) {
      console.error('Password reset email failed:', emailErr.message);
      user.passwordResetToken = undefined;
      user.passwordResetTokenExpiry = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        message: 'We could not send the password reset email right now. Please try again shortly.',
      });
    }

    res.status(200).json({ success: true, message: successMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const userDoc = await User.findById(req.user._id)
      .populate('assignedTeacher', TEACHER_POPULATE)
      .populate('assignedTeachers', TEACHER_POPULATE);
    const user = userDoc?.toObject ? userDoc.toObject() : userDoc;

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    Object.assign(user, buildAssignedTeacherPayload(user));
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/auth/verify-email?token=xxx ──────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const user = await User.findOne({ verificationToken: token }).select(
      '+verificationToken +verificationTokenExpiry'
    );

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid verification token.' });
    }

    if (user.verificationTokenExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Verification link has expired. Please request a new one.',
        expired: true,
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Email verified! You can now log in.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({ passwordResetToken: hashToken(token) }).select(
      '+password +passwordResetToken +passwordResetTokenExpiry'
    );

    if (!user) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has already been used.' });
    }

    if (!user.passwordResetTokenExpiry || user.passwordResetTokenExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'This reset link has expired. Please request a new one.',
        expired: true,
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/auth/change-password ────────────────────────────────
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required.' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
