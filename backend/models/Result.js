const mongoose = require('mongoose');

const MARK_FIELDS = ['theory', 'practical', 'internal'];
const DEFAULT_MARKS = { theory: 0, practical: 0, internal: 0 };
const DEFAULT_TOTAL_MARKS = { theory: 100, practical: 50, internal: 30 };

const normalizeScoreSet = (value = {}, defaults = {}) =>
  MARK_FIELDS.reduce((accumulator, field) => {
    const rawValue = value?.[field] ?? defaults?.[field] ?? 0;
    const numericValue = Number(rawValue);
    accumulator[field] = Number.isFinite(numericValue) ? numericValue : 0;
    return accumulator;
  }, {});

const calculateResultOutcome = (marksInput, totalMarksInput) => {
  const marks = normalizeScoreSet(marksInput, DEFAULT_MARKS);
  const totalMarks = normalizeScoreSet(totalMarksInput, DEFAULT_TOTAL_MARKS);

  const total = MARK_FIELDS.reduce((sum, field) => sum + marks[field], 0);
  const maxTotal = MARK_FIELDS.reduce((sum, field) => sum + totalMarks[field], 0);

  if (maxTotal <= 0) {
    return { grade: undefined, gradePoint: undefined, status: 'pending' };
  }

  const percentage = (total / maxTotal) * 100;

  if (percentage >= 90) {
    return { grade: 'A+', gradePoint: 10, status: 'pass' };
  }
  if (percentage >= 80) {
    return { grade: 'A', gradePoint: 9, status: 'pass' };
  }
  if (percentage >= 70) {
    return { grade: 'B+', gradePoint: 8, status: 'pass' };
  }
  if (percentage >= 60) {
    return { grade: 'B', gradePoint: 7, status: 'pass' };
  }
  if (percentage >= 50) {
    return { grade: 'C+', gradePoint: 6, status: 'pass' };
  }
  if (percentage >= 45) {
    return { grade: 'C', gradePoint: 5, status: 'pass' };
  }
  if (percentage >= 40) {
    return { grade: 'D', gradePoint: 4, status: 'pass' };
  }

  return { grade: 'F', gradePoint: 0, status: 'fail' };
};

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    semesterCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SemesterCourse',
      default: null,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
    marks: {
      theory: { type: Number, default: 0 },
      practical: { type: Number, default: 0 },
      internal: { type: Number, default: 0 },
    },
    totalMarks: {
      theory: { type: Number, default: 100 },
      practical: { type: Number, default: 50 },
      internal: { type: Number, default: 30 },
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
    },
    gradePoint: {
      type: Number,
      min: 0,
      max: 10,
    },
    status: {
      type: String,
      enum: ['pass', 'fail', 'pending'],
      default: 'pending',
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

resultSchema.pre('save', function (next) {
  Object.assign(this, calculateResultOutcome(this.marks, this.totalMarks));
  next();
});

resultSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() || {};
  const usesOperators = Object.keys(update).some((key) => key.startsWith('$'));
  const marksUpdate = update.$set?.marks ?? update.marks;
  const totalMarksUpdate = update.$set?.totalMarks ?? update.totalMarks;

  if (!marksUpdate && !totalMarksUpdate) {
    return next();
  }

  const existing = await this.model
    .findOne(this.getQuery())
    .select('marks totalMarks')
    .lean();

  const mergedMarks = normalizeScoreSet(
    marksUpdate,
    existing?.marks || DEFAULT_MARKS
  );
  const mergedTotalMarks = normalizeScoreSet(
    totalMarksUpdate,
    existing?.totalMarks || DEFAULT_TOTAL_MARKS
  );
  const outcome = calculateResultOutcome(mergedMarks, mergedTotalMarks);

  if (usesOperators) {
    update.$set = {
      ...(update.$set || {}),
      grade: outcome.grade,
      gradePoint: outcome.gradePoint,
      status: outcome.status,
    };
  } else {
    update.grade = outcome.grade;
    update.gradePoint = outcome.gradePoint;
    update.status = outcome.status;
  }

  this.setUpdate(update);
  next();
});

// Prevent duplicate result for same student, subject, semester, academicYear
resultSchema.index(
  { student: 1, subject: 1, semester: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model('Result', resultSchema);
