const mongoose = require('mongoose');

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

// Auto-calculate grade before saving
resultSchema.pre('save', function (next) {
  const total =
    this.marks.theory + this.marks.practical + this.marks.internal;
  const maxTotal =
    this.totalMarks.theory +
    this.totalMarks.practical +
    this.totalMarks.internal;
  const percentage = (total / maxTotal) * 100;

  if (percentage >= 90) {
    this.grade = 'A+';
    this.gradePoint = 10;
  } else if (percentage >= 80) {
    this.grade = 'A';
    this.gradePoint = 9;
  } else if (percentage >= 70) {
    this.grade = 'B+';
    this.gradePoint = 8;
  } else if (percentage >= 60) {
    this.grade = 'B';
    this.gradePoint = 7;
  } else if (percentage >= 50) {
    this.grade = 'C+';
    this.gradePoint = 6;
  } else if (percentage >= 45) {
    this.grade = 'C';
    this.gradePoint = 5;
  } else if (percentage >= 40) {
    this.grade = 'D';
    this.gradePoint = 4;
  } else {
    this.grade = 'F';
    this.gradePoint = 0;
  }

  this.status = percentage >= 40 ? 'pass' : 'fail';
  next();
});

// Prevent duplicate result for same student, subject, semester, academicYear
resultSchema.index(
  { student: 1, subject: 1, semester: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model('Result', resultSchema);
