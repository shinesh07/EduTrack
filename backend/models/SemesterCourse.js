const mongoose = require('mongoose');

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const semesterCourseSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    departmentKey: {
      type: String,
      required: true,
      select: false,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8,
    },
    code: {
      type: String,
      trim: true,
      default: '',
    },
    codeKey: {
      type: String,
      default: '',
      select: false,
    },
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    titleKey: {
      type: String,
      required: true,
      select: false,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

semesterCourseSchema.pre('validate', function (next) {
  const department = normalizeText(this.department);
  const title = normalizeText(this.title);
  const code = normalizeText(this.code).toUpperCase();

  this.department = department;
  this.departmentKey = department.toLowerCase();
  this.title = title;
  this.titleKey = title.toLowerCase();
  this.code = code;
  this.codeKey = code.toLowerCase();

  next();
});

semesterCourseSchema.index(
  { departmentKey: 1, semester: 1, titleKey: 1 },
  { unique: true }
);

semesterCourseSchema.index({ teacher: 1, departmentKey: 1, semester: 1 });

module.exports = mongoose.model('SemesterCourse', semesterCourseSchema);
