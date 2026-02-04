const mongoose = require('mongoose');

const studentProfessorMappingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one student can only be mapped to one professor at a time
// (or allow multiple mappings - let's allow multiple for flexibility)
studentProfessorMappingSchema.index({ student: 1, professor: 1 }, { unique: true });

module.exports = mongoose.model('StudentProfessorMapping', studentProfessorMappingSchema);

