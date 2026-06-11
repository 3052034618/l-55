const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trainingPlanSchema = new Schema({
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
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['weekly', 'biweekly', 'custom'],
    default: 'weekly'
  },
  goalType: {
    type: String,
    enum: ['strength', 'endurance', 'fat_loss', 'muscle_gain', 'rehabilitation', 'comprehensive'],
    default: 'comprehensive'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  intensity: {
    type: String,
    enum: ['low', 'medium', 'high', 'progressive'],
    default: 'medium'
  },
  sessionsPerWeek: {
    type: Number,
    default: 3,
    min: 1,
    max: 7
  },
  sessionDuration: {
    type: Number,
    default: 60
  },
  weeklySchedule: [{
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    focus: [String],
    sessionTemplate: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingSession'
    }
  }],
  notes: String,
  completedSessions: {
    type: Number,
    default: 0
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  pausedAt: Date,
  resumedAt: Date,
  pauseReason: String
}, {
  timestamps: true
});

trainingPlanSchema.index({ studentId: 1, status: 1 });
trainingPlanSchema.index({ coachId: 1, status: 1 });
trainingPlanSchema.index({ startDate: -1 });

module.exports = mongoose.model('TrainingPlan', trainingPlanSchema);
