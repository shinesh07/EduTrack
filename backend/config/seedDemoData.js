require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const AcademicSettings = require('../models/AcademicSettings');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const SemesterCourse = require('../models/SemesterCourse');
const User = require('../models/User');

const DEMO_EMAIL_DOMAIN = 'demo.edutrack.local';
const DEMO_USER_PASSWORD = 'Demo@123';
const ADMIN_EMAIL = 'admin@school.com';
const ADMIN_PASSWORD = 'admin123';
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const ATTENDANCE_DAY_OFFSETS = [28, 21, 14, 7, 2];
const TOTAL_MARKS = { theory: 100, practical: 50, internal: 30 };

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Business Administration',
  'Mathematics',
  'Physics',
  'Commerce',
];

const DEPARTMENT_DETAILS = {
  'Computer Science': {
    code: 'CS',
    focus: ['Programming', 'Algorithms', 'Systems'],
  },
  'Information Technology': {
    code: 'IT',
    focus: ['Web Technology', 'Networking', 'Cloud'],
  },
  'Electronics & Communication': {
    code: 'EC',
    focus: ['Circuits', 'Signal Processing', 'Embedded Systems'],
  },
  'Electrical Engineering': {
    code: 'EE',
    focus: ['Power Systems', 'Electrical Machines', 'Control Systems'],
  },
  'Mechanical Engineering': {
    code: 'ME',
    focus: ['Thermal Engineering', 'Manufacturing', 'Machine Design'],
  },
  'Civil Engineering': {
    code: 'CE',
    focus: ['Structural Analysis', 'Surveying', 'Transportation'],
  },
  'Business Administration': {
    code: 'BA',
    focus: ['Management', 'Finance', 'Marketing'],
  },
  Mathematics: {
    code: 'MA',
    focus: ['Applied Mathematics', 'Statistics', 'Mathematical Modeling'],
  },
  Physics: {
    code: 'PH',
    focus: ['Mechanics', 'Electronics', 'Optics'],
  },
  Commerce: {
    code: 'CO',
    focus: ['Accounting', 'Taxation', 'Business Law'],
  },
};

const FIRST_NAMES = [
  'Aarav',
  'Anaya',
  'Vivaan',
  'Diya',
  'Aditya',
  'Ishita',
  'Krish',
  'Kavya',
  'Rohan',
  'Meera',
  'Arjun',
  'Priya',
  'Dev',
  'Nisha',
  'Rahul',
  'Sneha',
  'Varun',
  'Aditi',
  'Karan',
  'Pooja',
  'Neel',
  'Sanya',
  'Tanish',
  'Maya',
  'Aryan',
  'Ritika',
  'Harsh',
  'Simran',
  'Manav',
  'Ira',
  'Yash',
  'Trisha',
  'Nikhil',
  'Rhea',
  'Dhruv',
  'Saanvi',
  'Laksh',
  'Avni',
  'Parth',
  'Kiara',
];

const LAST_NAMES = [
  'Sharma',
  'Patel',
  'Gupta',
  'Reddy',
  'Nair',
  'Iyer',
  'Mehta',
  'Kapoor',
  'Singh',
  'Joshi',
  'Agarwal',
  'Pillai',
  'Bose',
  'Kulkarni',
  'Chawla',
  'Malhotra',
  'Desai',
  'Rao',
  'Verma',
  'Mishra',
];

const buildCourseOutcome = (marks, totalMarks) => {
  const total = marks.theory + marks.practical + marks.internal;
  const maxTotal =
    totalMarks.theory + totalMarks.practical + totalMarks.internal;
  const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  if (percentage >= 90) return { grade: 'A+', gradePoint: 10, status: 'pass' };
  if (percentage >= 80) return { grade: 'A', gradePoint: 9, status: 'pass' };
  if (percentage >= 70) return { grade: 'B+', gradePoint: 8, status: 'pass' };
  if (percentage >= 60) return { grade: 'B', gradePoint: 7, status: 'pass' };
  if (percentage >= 50) return { grade: 'C+', gradePoint: 6, status: 'pass' };
  if (percentage >= 45) return { grade: 'C', gradePoint: 5, status: 'pass' };
  if (percentage >= 40) return { grade: 'D', gradePoint: 4, status: 'pass' };
  return { grade: 'F', gradePoint: 0, status: 'fail' };
};

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeDepartmentKey = (value) => normalizeText(value).toLowerCase();
const buildStudentComboKey = (department, semester) =>
  `${normalizeDepartmentKey(department)}::${Number(semester)}`;

const getAcademicYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const formatAcademicYear = (startYear) => `${startYear}-${startYear + 1}`;

const getAcademicYearForSemester = (
  currentSemester,
  targetSemester,
  referenceDate = new Date()
) => {
  const currentStartYear = Number(getAcademicYear(referenceDate).split('-')[0]);
  const currentPair = Math.ceil(Number(currentSemester || 0) / 2);
  const targetPair = Math.ceil(Number(targetSemester || 0) / 2);

  return formatAcademicYear(currentStartYear - (currentPair - targetPair));
};

const buildName = (index, prefix = '') => {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last =
    LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return [prefix, first, last].filter(Boolean).join(' ');
};

const buildPhoneNumber = (index) => `9${String(100000000 + index).padStart(9, '0')}`;

const hashString = (value) =>
  Array.from(String(value || '')).reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 1),
    0
  );

const pickNumber = (seed, min, max) => {
  const range = max - min + 1;
  return min + (hashString(seed) % range);
};

const buildAttendanceStatus = (seed) => {
  const score = hashString(seed) % 100;
  if (score < 74) return 'present';
  if (score < 86) return 'late';
  return 'absent';
};

const buildAttendanceRemark = (status, seed) => {
  if (status === 'late') {
    return hashString(seed) % 2 === 0 ? 'Arrived after the first bell.' : 'Joined the class a little late.';
  }
  if (status === 'absent') {
    return hashString(seed) % 2 === 0 ? 'Reported leave for the day.' : 'No classroom attendance recorded.';
  }
  return '';
};

const buildResultMarks = (seed) => {
  const failCase = hashString(seed) % 11 === 0;

  const marks = failCase
    ? {
        theory: pickNumber(`${seed}:theory`, 28, 39),
        practical: pickNumber(`${seed}:practical`, 12, 24),
        internal: pickNumber(`${seed}:internal`, 8, 14),
      }
    : {
        theory: pickNumber(`${seed}:theory`, 58, 95),
        practical: pickNumber(`${seed}:practical`, 28, 48),
        internal: pickNumber(`${seed}:internal`, 18, 30),
      };

  return {
    marks,
    totalMarks: TOTAL_MARKS,
    ...buildCourseOutcome(marks, TOTAL_MARKS),
  };
};

const studentCountForSemester = (semester) => (semester % 2 === 0 ? 2 : 3);

const getSemesterCourseTitles = (department) => {
  const { focus } = DEPARTMENT_DETAILS[department];
  const [first, second, third] = focus;

  return {
    1: [
      `${department} Foundations`,
      `Introduction to ${first}`,
      'Communication Skills',
      'Applied Mathematics I',
    ],
    2: [
      `${first} Lab`,
      `${second} Principles`,
      'Environmental Studies',
      'Applied Mathematics II',
    ],
    3: [
      `${first} Applications`,
      `${second} Systems`,
      `${third} Workshop`,
      'Professional Ethics',
    ],
    4: [
      `${first} Design`,
      `${second} Analysis`,
      `${third} Laboratory`,
      'Research Methods',
    ],
    5: [
      `Advanced ${first}`,
      `${second} Integration`,
      `${third} Practice`,
      'Mini Project',
    ],
    6: [
      `${first} Management`,
      `Advanced ${second}`,
      `${third} Seminar`,
      'Internship Preparation',
    ],
    7: [
      `${first} Project`,
      `${second} Optimization`,
      `${third} Elective`,
      'Industry Internship',
    ],
    8: [
      `Capstone ${first}`,
      `${second} Strategy`,
      `${third} Innovation`,
      'Major Project',
    ],
  };
};

const buildTeacherSeed = (department, teacherIndex, globalIndex) => {
  const { code } = DEPARTMENT_DETAILS[department];
  const email = `teacher.${code.toLowerCase()}.${teacherIndex + 1}@${DEMO_EMAIL_DOMAIN}`;

  return {
    name: buildName(globalIndex),
    email,
    department,
    phone: buildPhoneNumber(globalIndex + 1),
    subjects: [],
  };
};

const buildStudentSeed = (department, semester, studentIndex, globalIndex) => {
  const { code } = DEPARTMENT_DETAILS[department];
  const entryNumber = String(studentIndex + 1).padStart(2, '0');
  const email = `student.${code.toLowerCase()}.s${semester}.${studentIndex + 1}@${DEMO_EMAIL_DOMAIN}`;
  const rollNumber = `ET-${code}-${semester}-${entryNumber}`;

  return {
    name: buildName(globalIndex),
    email,
    rollNumber,
    department,
    semester,
    phone: buildPhoneNumber(globalIndex + 101),
    address: `${department} Hostel Block, Room ${semester}${entryNumber}`,
  };
};

const buildCourseCode = (department, semester, courseIndex) => {
  const { code } = DEPARTMENT_DETAILS[department];
  return `${code}-S${semester}-C${courseIndex + 1}`;
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const runBulkWrite = async (model, operations, label, chunkSize = 500) => {
  if (operations.length === 0) return;

  const chunks = chunkArray(operations, chunkSize);
  for (let index = 0; index < chunks.length; index += 1) {
    await model.bulkWrite(chunks[index], { ordered: false });
    console.log(
      `${label}: processed ${Math.min(
        (index + 1) * chunkSize,
        operations.length
      )}/${operations.length}`
    );
  }
};

const buildTeacherOps = async () => {
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);
  const teachers = [];
  const operations = [];
  let teacherIndex = 0;

  DEPARTMENTS.forEach((department) => {
    for (let index = 0; index < 3; index += 1) {
      const teacher = buildTeacherSeed(department, index, teacherIndex);
      teachers.push(teacher);
      operations.push({
        updateOne: {
          filter: { email: teacher.email },
          update: {
            $set: {
              name: teacher.name,
              email: teacher.email,
              password: passwordHash,
              role: 'teacher',
              department: teacher.department,
              phone: teacher.phone,
              subjects: [],
              isActive: true,
              isVerified: true,
            },
            $unset: {
              verificationToken: '',
              verificationTokenExpiry: '',
            },
          },
          upsert: true,
        },
      });
      teacherIndex += 1;
    }
  });

  return { teachers, operations };
};

const buildCourseOps = (teachersByDepartment) => {
  const operations = [];
  const plannedCourses = [];

  DEPARTMENTS.forEach((department) => {
    const titlesBySemester = getSemesterCourseTitles(department);
    const teachers = teachersByDepartment.get(department) || [];

    SEMESTERS.forEach((semester) => {
      titlesBySemester[semester].forEach((title, courseIndex) => {
        const code = buildCourseCode(department, semester, courseIndex);
        const assignedTeacher =
          teachers[(semester + courseIndex) % teachers.length];
        const course = {
          department,
          semester,
          title,
          code,
          teacher: assignedTeacher?._id || null,
        };

        plannedCourses.push(course);
        operations.push({
          updateOne: {
            filter: {
              departmentKey: normalizeDepartmentKey(department),
              semester,
              titleKey: normalizeText(title).toLowerCase(),
            },
            update: {
              $set: {
                department,
                departmentKey: normalizeDepartmentKey(department),
                semester,
                title,
                titleKey: normalizeText(title).toLowerCase(),
                code,
                codeKey: code.toLowerCase(),
                teacher: assignedTeacher?._id || null,
                isActive: true,
              },
            },
            upsert: true,
          },
        });
      });
    });
  });

  return { plannedCourses, operations };
};

const buildStudentOps = async (courseMap) => {
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);
  const operations = [];
  const students = [];
  let globalIndex = 200;

  DEPARTMENTS.forEach((department) => {
    SEMESTERS.forEach((semester) => {
      const comboKey = buildStudentComboKey(department, semester);
      const currentCourses = courseMap.get(comboKey) || [];
      const assignedTeacherIds = [
        ...new Set(
          currentCourses
            .map((course) => String(course.teacher || '').trim())
            .filter(Boolean)
        ),
      ].map((value) => new mongoose.Types.ObjectId(value));

      for (let index = 0; index < studentCountForSemester(semester); index += 1) {
        const student = buildStudentSeed(department, semester, index, globalIndex);
        students.push(student);
        operations.push({
          updateOne: {
            filter: { email: student.email },
            update: {
              $set: {
                name: student.name,
                email: student.email,
                password: passwordHash,
                role: 'student',
                rollNumber: student.rollNumber,
                department: student.department,
                semester: student.semester,
                phone: student.phone,
                address: student.address,
                assignedTeacher: assignedTeacherIds[0] || null,
                assignedTeachers: assignedTeacherIds,
                isActive: true,
                isVerified: true,
              },
              $unset: {
                verificationToken: '',
                verificationTokenExpiry: '',
              },
            },
            upsert: true,
          },
        });
        globalIndex += 1;
      }
    });
  });

  return { students, operations };
};

const buildAttendanceOps = (students, courseMap) => {
  const operations = [];
  const now = new Date();
  const dates = ATTENDANCE_DAY_OFFSETS.map((offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  students.forEach((student) => {
    const comboKey = buildStudentComboKey(student.department, student.semester);
    const courses = courseMap.get(comboKey) || [];

    courses.forEach((course) => {
      dates.forEach((date) => {
        const seed = `${student.rollNumber}:${course.code}:${date.toISOString()}`;
        const status = buildAttendanceStatus(seed);

        operations.push({
          updateOne: {
            filter: {
              student: student._id,
              subject: course.title,
              date,
            },
            update: {
              $set: {
                student: student._id,
                teacher: course.teacher,
                semesterCourse: course._id,
                subject: course.title,
                date,
                status,
                markedBy: 'teacher',
                remarks: buildAttendanceRemark(status, seed),
              },
            },
            upsert: true,
          },
        });
      });
    });
  });

  return operations;
};

const buildResultOps = (students, courseMap) => {
  const operations = [];

  students.forEach((student) => {
    const currentSemester = Number(student.semester || 0);
    const lastCompletedSemester = Math.max(currentSemester - 1, 0);

    for (let semester = 1; semester <= lastCompletedSemester; semester += 1) {
      const comboKey = buildStudentComboKey(student.department, semester);
      const courses = courseMap.get(comboKey) || [];
      const academicYear = getAcademicYearForSemester(currentSemester, semester);

      courses.forEach((course) => {
        const seed = `${student.rollNumber}:${course.code}:${academicYear}`;
        const outcome = buildResultMarks(seed);
        const remarks =
          outcome.status === 'fail'
            ? 'Needs additional practice in this course.'
            : outcome.gradePoint >= 9
              ? 'Excellent and consistent performance.'
              : 'Good progress throughout the semester.';

        operations.push({
          updateOne: {
            filter: {
              student: student._id,
              subject: course.title,
              semester,
              academicYear,
            },
            update: {
              $set: {
                student: student._id,
                teacher: course.teacher,
                semesterCourse: course._id,
                subject: course.title,
                semester,
                academicYear,
                marks: outcome.marks,
                totalMarks: outcome.totalMarks,
                grade: outcome.grade,
                gradePoint: outcome.gradePoint,
                status: outcome.status,
                remarks,
              },
            },
            upsert: true,
          },
        });
      });
    }
  });

  return operations;
};

const removeOutdatedDemoResults = async (students) => {
  if (students.length === 0) return;

  const semesterLimits = students.map((student) => ({
    studentId: student._id,
    currentSemester: Number(student.semester || 0),
  }));

  await Promise.all(
    semesterLimits.map(({ studentId, currentSemester }) =>
      Result.deleteMany({
        student: studentId,
        semester: { $gte: currentSemester },
      })
    )
  );
};

const ensureAdminAccount = async () => {
  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL }).select('_id');
  if (existingAdmin) {
    console.log(`Admin account already exists at ${ADMIN_EMAIL}.`);
    return { admin: existingAdmin, created: false };
  }

  await User.create({
    name: 'System Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    department: 'Administration',
    isActive: true,
    isVerified: true,
  });

  console.log(`Created default admin account at ${ADMIN_EMAIL}.`);
  const admin = await User.findOne({ email: ADMIN_EMAIL }).select('_id');
  return { admin, created: true };
};

const seedDemoData = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  await AcademicSettings.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const adminStatus = await ensureAdminAccount();

  const { operations: teacherOps } = await buildTeacherOps();
  await runBulkWrite(User, teacherOps, 'Teachers');

  const teacherEmails = teacherOps.map((operation) => operation.updateOne.filter.email);
  const teacherDocs = await User.find({
    email: { $in: teacherEmails },
    role: 'teacher',
  })
    .select('_id name email department')
    .lean();

  const teachersByDepartment = teacherDocs.reduce((map, teacher) => {
    if (!map.has(teacher.department)) {
      map.set(teacher.department, []);
    }
    map.get(teacher.department).push(teacher);
    return map;
  }, new Map());

  const { operations: courseOps, plannedCourses } = buildCourseOps(teachersByDepartment);
  await runBulkWrite(SemesterCourse, courseOps, 'Semester courses');

  const courseDocs = await SemesterCourse.find({
    code: { $in: plannedCourses.map((course) => course.code) },
  })
    .select('_id department semester title code teacher')
    .lean();

  const courseMap = courseDocs.reduce((map, course) => {
    const comboKey = buildStudentComboKey(course.department, course.semester);
    if (!map.has(comboKey)) {
      map.set(comboKey, []);
    }
    map.get(comboKey).push(course);
    return map;
  }, new Map());

  const teacherSubjectOps = teacherDocs.map((teacher) => {
    const assignedTitles = courseDocs
      .filter((course) => String(course.teacher || '') === String(teacher._id))
      .map((course) => course.title)
      .sort((left, right) => left.localeCompare(right));

    return {
      updateOne: {
        filter: { _id: teacher._id },
        update: {
          $set: {
            subjects: assignedTitles,
          },
        },
      },
    };
  });
  await runBulkWrite(User, teacherSubjectOps, 'Teacher subjects');

  const { operations: studentOps } = await buildStudentOps(courseMap);
  await runBulkWrite(User, studentOps, 'Students');

  const studentEmails = studentOps.map((operation) => operation.updateOne.filter.email);
  const studentDocs = await User.find({
    email: { $in: studentEmails },
    role: 'student',
  })
    .select('_id name email rollNumber department semester')
    .lean();

  const attendanceOps = buildAttendanceOps(studentDocs, courseMap);
  await runBulkWrite(Attendance, attendanceOps, 'Attendance', 1000);

  await removeOutdatedDemoResults(studentDocs);
  const resultOps = buildResultOps(studentDocs, courseMap);
  await runBulkWrite(Result, resultOps, 'Results', 1000);

  const demoTeacherCount = teacherDocs.length;
  const demoStudentCount = studentDocs.length;
  const demoCourseCount = courseDocs.length;
  const demoAttendanceCount = await Attendance.countDocuments({
    student: { $in: studentDocs.map((student) => student._id) },
  });
  const demoResultCount = await Result.countDocuments({
    student: { $in: studentDocs.map((student) => student._id) },
  });

  console.log('\nDemo seed complete.');
  if (adminStatus.created) {
    console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`Admin account kept as-is: ${ADMIN_EMAIL}`);
  }
  console.log(`Demo teacher password: ${DEMO_USER_PASSWORD}`);
  console.log(`Demo student password: ${DEMO_USER_PASSWORD}`);
  console.log(
    `Sample teacher: ${teacherDocs[0]?.email || 'n/a'} / ${DEMO_USER_PASSWORD}`
  );
  console.log(
    `Sample student: ${studentDocs[0]?.email || 'n/a'} / ${DEMO_USER_PASSWORD}`
  );
  console.log(
    `Created or updated ${demoTeacherCount} teachers, ${demoStudentCount} students, ${demoCourseCount} courses, ${demoAttendanceCount} attendance records, and ${demoResultCount} results.`
  );
};

seedDemoData()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Demo seed error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
