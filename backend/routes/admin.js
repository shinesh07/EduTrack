const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const SemesterCourse = require('../models/SemesterCourse');
const { protect, authorize } = require('../middleware/auth');
const { sendAdminCreatedEmail } = require('../config/email');
const {
  buildTeacherStudentQuery,
  getAcademicSettings,
  getSemesterCourses,
  getUniqueTeacherIds,
  normalizeDepartmentKey,
  normalizeText,
} = require('../utils/academic');

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

const normalizeAssignedTeacherIds = (value) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map((id) => String(id || '').trim()).filter(Boolean))];
};

const teacherMatchesDepartment = (teacher, department) =>
  Boolean(teacher) &&
  normalizeDepartmentKey(teacher.department) === normalizeDepartmentKey(department);

const buildStudentComboKey = (department, semester) =>
  `${normalizeDepartmentKey(department)}::${Number(semester || 0)}`;

const buildStudentCourseMap = async (students = []) => {
  const combos = new Map();

  students.forEach((student) => {
    if (!student?.department || !student?.semester) return;
    const key = buildStudentComboKey(student.department, student.semester);
    if (!combos.has(key)) {
      combos.set(key, {
        department: student.department,
        semester: Number(student.semester),
      });
    }
  });

  if (combos.size === 0) return new Map();

  const courses = await SemesterCourse.find({
    isActive: true,
    $or: Array.from(combos.values()).map(({ department, semester }) => ({
      departmentKey: normalizeDepartmentKey(department),
      semester,
    })),
  }).populate('teacher', 'name email department');

  const courseMap = new Map();
  courses.forEach((course) => {
    const key = buildStudentComboKey(course.department, course.semester);
    if (!courseMap.has(key)) {
      courseMap.set(key, []);
    }
    courseMap.get(key).push(course);
  });

  return courseMap;
};

const handleDuplicateCourseError = (error, res) => {
  if (error?.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'A course with this title already exists for that department and semester.',
    });
  }

  return res.status(500).json({ success: false, message: error.message });
};

router.use(protect, authorize('admin'));

router.get('/stats', async (req, res) => {
  try {
    const settings = await getAcademicSettings();

    const [teachers, students, attendanceRecords, results, semesterCourses] =
      await Promise.all([
        User.countDocuments({ role: 'teacher', isActive: true }),
        User.countDocuments({ role: 'student', isActive: true }),
        Attendance.countDocuments(),
        Result.countDocuments(),
        SemesterCourse.countDocuments({ isActive: true }),
      ]);

    const recentStudents = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email rollNumber department semester createdAt');

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
        semesterCourses,
        semesterEditEnabled: settings.allowStudentSemesterEdit,
        recentStudents,
        recentResults,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/academic-settings', async (req, res) => {
  try {
    const settings = await getAcademicSettings();
    res.status(200).json({
      success: true,
      data: {
        allowStudentSemesterEdit: settings.allowStudentSemesterEdit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/academic-settings', async (req, res) => {
  try {
    const settings = await getAcademicSettings();
    settings.allowStudentSemesterEdit = Boolean(req.body?.allowStudentSemesterEdit);
    await settings.save();

    res.status(200).json({
      success: true,
      data: {
        allowStudentSemesterEdit: settings.allowStudentSemesterEdit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/semester-courses', async (req, res) => {
  try {
    const { department, semester } = req.query;
    const courses = await getSemesterCourses({
      department,
      semester,
      populateTeacher: true,
    });

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/semester-courses', async (req, res) => {
  try {
    const { department, semester, code, title, teacherId } = req.body;

    if (!department || !semester || !title) {
      return res.status(400).json({
        success: false,
        message: 'Department, semester, and course title are required.',
      });
    }

    const normalizedDepartment = normalizeText(department);
    let teacher = null;
    if (teacherId) {
      teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Assigned teacher not found.',
        });
      }
      if (!teacherMatchesDepartment(teacher, normalizedDepartment)) {
        return res.status(400).json({
          success: false,
          message: 'Assigned teacher must belong to the selected department.',
        });
      }
    }

    const course = await SemesterCourse.create({
      department: normalizedDepartment,
      semester: Number(semester),
      code: normalizeText(code).toUpperCase(),
      title: normalizeText(title),
      teacher: teacher?._id || null,
    });

    const populated = await SemesterCourse.findById(course._id).populate(
      'teacher',
      'name email department'
    );

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    handleDuplicateCourseError(error, res);
  }
});

router.put('/semester-courses/:id', async (req, res) => {
  try {
    const { department, semester, code, title, teacherId, isActive } = req.body;

    const course = await SemesterCourse.findById(req.params.id).populate(
      'teacher',
      'department'
    );
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Semester course not found.',
      });
    }

    const nextDepartment =
      department !== undefined ? normalizeText(department) : course.department;
    let teacher = course.teacher;

    if (teacherId !== undefined) {
      if (teacherId) {
        teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: 'Assigned teacher not found.',
          });
        }
      } else {
        teacher = null;
      }
    }

    if (teacher && !teacherMatchesDepartment(teacher, nextDepartment)) {
      return res.status(400).json({
        success: false,
        message: 'Assigned teacher must belong to the selected department.',
      });
    }

    if (department !== undefined) course.department = nextDepartment;
    if (semester !== undefined) course.semester = Number(semester);
    if (code !== undefined) course.code = normalizeText(code).toUpperCase();
    if (title !== undefined) course.title = normalizeText(title);
    if (teacherId !== undefined) course.teacher = teacher?._id || null;
    if (isActive !== undefined) course.isActive = Boolean(isActive);

    await course.save();
    await course.populate('teacher', 'name email department');

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    handleDuplicateCourseError(error, res);
  }
});

router.delete('/semester-courses/:id', async (req, res) => {
  try {
    const course = await SemesterCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Semester course not found.',
      });
    }

    await course.deleteOne();
    res.status(200).json({
      success: true,
      message: 'Semester course deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/teachers', async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .sort({ createdAt: -1 })
      .select('-password');

    const teacherIds = teachers.map((teacher) => teacher._id);
    const assignedCourses = await SemesterCourse.find({
      isActive: true,
      teacher: { $in: teacherIds },
    }).select('teacher title code department semester');

    const coursesByTeacher = new Map();
    assignedCourses.forEach((course) => {
      const key = String(course.teacher);
      if (!coursesByTeacher.has(key)) {
        coursesByTeacher.set(key, []);
      }
      coursesByTeacher.get(key).push(course);
    });

    const teachersWithMeta = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherCourses = coursesByTeacher.get(String(teacher._id)) || [];
        const studentCount = await User.countDocuments(
          buildTeacherStudentQuery(teacherCourses)
        );

        return {
          ...teacher.toObject(),
          assignedCourses: teacherCourses,
          assignedCourseCount: teacherCourses.length,
          studentCount,
        };
      })
    );

    res.status(200).json({ success: true, data: teachersWithMeta });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/teachers', async (req, res) => {
  try {
    const { name, email, password, department, phone, subjects } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const teacher = await User.create({
      name,
      email,
      password,
      role: 'teacher',
      department,
      phone,
      subjects: Array.isArray(subjects) ? subjects : [],
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
    });

    let emailFailed = false;
    try {
      await sendAdminCreatedEmail({
        toEmail: email,
        name,
        token: verificationToken,
        role: 'teacher',
        tempPassword: password,
        baseUrl: getBaseUrl(req),
      });
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr.message);
      emailFailed = true;
    }

    const {
      password: _,
      verificationToken: __,
      verificationTokenExpiry: ___,
      ...teacherData
    } = teacher.toObject();

    res.status(201).json({
      success: true,
      data: {
        ...teacherData,
        assignedCourses: [],
        assignedCourseCount: 0,
        studentCount: 0,
      },
      message: emailFailed
        ? 'Teacher created, but verification email failed to send. Check email settings.'
        : 'Teacher created. A verification email has been sent.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/teachers/:id', async (req, res) => {
  try {
    const { name, email, department, phone, subjects, isActive, password } =
      req.body;

    const updateData = { name, email, department, phone, isActive };
    if (subjects) updateData.subjects = subjects;

    const teacher = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!teacher || teacher.role !== 'teacher') {
      return res
        .status(404)
        .json({ success: false, message: 'Teacher not found.' });
    }

    if (password) {
      const editableTeacher = await User.findById(req.params.id);
      editableTeacher.password = password;
      await editableTeacher.save();
    }

    const teacherCourses = await SemesterCourse.find({
      isActive: true,
      teacher: teacher._id,
    }).select('title code department semester');

    const studentCount = await User.countDocuments(
      buildTeacherStudentQuery(teacherCourses)
    );

    res.status(200).json({
      success: true,
      data: {
        ...teacher.toObject(),
        assignedCourses: teacherCourses,
        assignedCourseCount: teacherCourses.length,
        studentCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/teachers/:id', async (req, res) => {
  try {
    const teacher = await User.findById(req.params.id);
    if (!teacher || teacher.role !== 'teacher') {
      return res
        .status(404)
        .json({ success: false, message: 'Teacher not found.' });
    }

    await Promise.all([
      User.updateMany(
        { assignedTeacher: req.params.id },
        { assignedTeacher: null }
      ),
      User.updateMany(
        { assignedTeachers: req.params.id },
        { $pull: { assignedTeachers: req.params.id } }
      ),
      SemesterCourse.updateMany(
        { teacher: req.params.id },
        { $set: { teacher: null } }
      ),
    ]);

    await teacher.deleteOne();
    res
      .status(200)
      .json({ success: true, message: 'Teacher deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .select('-password');

    const courseMap = await buildStudentCourseMap(students);

    const studentsWithMeta = students.map((student) => {
      const courses =
        courseMap.get(buildStudentComboKey(student.department, student.semester)) || [];

      return {
        ...student.toObject(),
        currentCourseCount: courses.length,
        currentTeacherCount: getUniqueTeacherIds(courses).length,
      };
    });

    res.status(200).json({ success: true, data: studentsWithMeta });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
      name,
      email,
      password,
      role: 'student',
      rollNumber,
      department,
      semester,
      phone,
      address,
      assignedTeacher: null,
      assignedTeachers: [],
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
    });

    let emailFailed = false;
    try {
      await sendAdminCreatedEmail({
        toEmail: email,
        name,
        token: verificationToken,
        role: 'student',
        tempPassword: password,
        baseUrl: getBaseUrl(req),
      });
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr.message);
      emailFailed = true;
    }

    const populated = await User.findById(student._id).select('-password');
    const courses = await getSemesterCourses({
      department: populated.department,
      semester: populated.semester,
      populateTeacher: true,
    });

    res.status(201).json({
      success: true,
      data: {
        ...populated.toObject(),
        currentCourseCount: courses.length,
        currentTeacherCount: getUniqueTeacherIds(courses).length,
      },
      message: emailFailed
        ? 'Student created, but verification email failed to send. Check email settings.'
        : 'Student created. Verification email sent.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
      isActive,
      assignedTeacher: null,
      assignedTeachers: [],
    };

    const student = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!student || student.role !== 'student') {
      return res
        .status(404)
        .json({ success: false, message: 'Student not found.' });
    }

    if (password) {
      const editableStudent = await User.findById(req.params.id);
      editableStudent.password = password;
      await editableStudent.save();
    }

    const courses = await getSemesterCourses({
      department: student.department,
      semester: student.semester,
      populateTeacher: true,
    });

    res.status(200).json({
      success: true,
      data: {
        ...student.toObject(),
        currentCourseCount: courses.length,
        currentTeacherCount: getUniqueTeacherIds(courses).length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res
        .status(404)
        .json({ success: false, message: 'Student not found.' });
    }

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
      .populate('student', 'name rollNumber department semester')
      .populate('teacher', 'name email')
      .sort({ date: -1 });

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/results', async (req, res) => {
  try {
    const { studentId, teacherId, semester, academicYear } = req.query;

    const filter = {};
    if (studentId) filter.student = studentId;
    if (teacherId) filter.teacher = teacherId;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const results = await Result.find(filter)
      .populate('student', 'name rollNumber department semester')
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/resend-verification/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '+verificationToken +verificationTokenExpiry +password'
    );

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
      baseUrl: getBaseUrl(req),
    });

    res.status(200).json({
      success: true,
      message: 'Verification email resent successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
