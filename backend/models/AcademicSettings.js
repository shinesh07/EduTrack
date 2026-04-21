const mongoose = require('mongoose');

const academicSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
      trim: true,
    },
    allowStudentSemesterEdit: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AcademicSettings', academicSettingsSchema);
