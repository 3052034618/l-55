const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const assessmentSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  coachId: {
    type: Schema.Types.ObjectId,
    ref: 'Coach',
    required: true
  },
  type: {
    type: String,
    enum: ['initial', 'periodic', 'special'],
    default: 'periodic'
  },
  date: {
    type: Date,
    default: Date.now
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  strengthScore: {
    type: Number,
    min: 0,
    max: 100
  },
  enduranceScore: {
    type: Number,
    min: 0,
    max: 100
  },
  flexibilityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  bodyCompositionScore: {
    type: Number,
    min: 0,
    max: 100
  },
  items: [{
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['strength', 'endurance', 'flexibility', 'body_composition', 'skill']
    },
    value: {
      type: Number,
      required: true
    },
    unit: String,
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    benchmark: Number,
    note: String
  }],
  notes: String,
  recommendations: [String],
  bodyMetrics: {
    weight: Number,
    bodyFat: Number,
    muscleMass: Number,
    bmi: Number,
    restingHeartRate: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    vo2Max: Number
  }
}, {
  timestamps: true
});

assessmentSchema.index({ studentId: 1, date: -1 });
assessmentSchema.index({ coachId: 1, date: -1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
