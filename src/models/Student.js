const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema({
  coachId: {
    type: Schema.Types.ObjectId,
    ref: 'Coach',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  age: {
    type: Number,
    min: 1,
    max: 120
  },
  height: {
    type: Number,
    min: 0
  },
  weight: {
    type: Number,
    min: 0
  },
  phone: String,
  avatar: String,
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'professional'],
    default: 'beginner'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'inactive'],
    default: 'active'
  },
  availableDays: {
    type: [Number],
    default: [],
    validate: {
      validator: function(v) {
        return v.every(d => d >= 0 && d <= 6);
      },
      message: '可训练日期必须是 0-6 (周日到周六)'
    }
  },
  availableDuration: {
    type: Number,
    default: 60,
    min: 10,
    max: 300
  },
  trainingGoals: [{
    type: {
      type: String,
      enum: ['strength', 'endurance', 'flexibility', 'weight_loss', 'muscle_gain', 'skill_improvement', 'health_maintenance']
    },
    description: String,
    targetValue: Number,
    currentValue: Number,
    unit: String,
    deadline: Date
  }],
  injuries: [{
    description: String,
    bodyPart: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    date: Date,
    note: String
  }],
  notes: String,
  planStatus: {
    type: String,
    enum: ['none', 'active', 'paused', 'completed'],
    default: 'none'
  },
  overtrainingRisk: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    lastAssessed: Date,
    factors: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

studentSchema.index({ coachId: 1, status: 1 });
studentSchema.index({ name: 'text' });

module.exports = mongoose.model('Student', studentSchema);
