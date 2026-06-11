const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const coachSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: String,
  specialty: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'comprehensive', 'rehabilitation']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  bio: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

coachSchema.virtual('students', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'coachId'
});

module.exports = mongoose.model('Coach', coachSchema);
