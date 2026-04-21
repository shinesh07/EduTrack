export const DEPARTMENT_OPTIONS = [
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

export const buildDepartmentOptions = (...groups) =>
  [...new Set(
    [DEPARTMENT_OPTIONS, ...groups]
      .flat()
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
