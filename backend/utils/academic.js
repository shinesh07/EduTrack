const AcademicSettings = require('../models/AcademicSettings');
const SemesterCourse = require('../models/SemesterCourse');

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeDepartmentKey = (value) => normalizeText(value).toLowerCase();
const escapeRegex = (value) =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildDepartmentMatch = (value) =>
  new RegExp(`^${escapeRegex(normalizeText(value))}$`, 'i');

const getAcademicSettings = async () =>
  AcademicSettings.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

const getSemesterCourses = async ({
  department,
  semester,
  teacherId,
  populateTeacher = false,
  activeOnly = true,
}) => {
  const filter = {};

  if (department) filter.departmentKey = normalizeDepartmentKey(department);
  if (semester) filter.semester = Number(semester);
  if (teacherId) filter.teacher = teacherId;
  if (activeOnly) filter.isActive = true;

  let query = SemesterCourse.find(filter).sort({ semester: 1, title: 1 });
  if (populateTeacher) {
    query = query.populate('teacher', 'name email department');
  }

  return query;
};

const buildTeacherSemesterPairs = (courses = []) => {
  const pairs = new Map();

  courses.forEach((course) => {
    const department = normalizeText(course?.department);
    const semester = Number(course?.semester);

    if (!department || !semester) return;

    const key = `${department.toLowerCase()}::${semester}`;
    if (!pairs.has(key)) {
      pairs.set(key, { department, semester });
    }
  });

  return Array.from(pairs.values());
};

const buildTeacherStudentQuery = (courses = []) => {
  const pairs = buildTeacherSemesterPairs(courses);

  if (pairs.length === 0) {
    return { _id: { $in: [] } };
  }

  return {
    role: 'student',
    $or: pairs.map(({ department, semester }) => ({
      department: buildDepartmentMatch(department),
      semester,
    })),
  };
};

const getUniqueTeacherIds = (courses = []) =>
  [
    ...new Set(
      courses
        .map((course) => String(course?.teacher?._id || course?.teacher || '').trim())
        .filter(Boolean)
    ),
  ];

module.exports = {
  buildTeacherSemesterPairs,
  buildTeacherStudentQuery,
  getAcademicSettings,
  buildDepartmentMatch,
  getSemesterCourses,
  getUniqueTeacherIds,
  normalizeDepartmentKey,
  normalizeText,
};
