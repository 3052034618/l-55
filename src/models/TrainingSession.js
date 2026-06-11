const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const exerciseItemSchema = new Schema({
  exerciseId: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  exerciseName: String,
  order: {
    type: Number,
    default: 0
  },
  sets: {
    type: Number,
    default: 3
  },
  reps: {
    type: Number,
    default: 12
  },
  duration: {
    type: Number,
    default: 60
  },
  weight: {
    type: Number,
    default: 0
  },
  restTime: {
    type: Number,
    default: 60
  },
  intensity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  completedSets: {
    type: Number,
    default: 0
  },
  notes: String
}, {
  _id: false
});

const trainingSessionSchema = new Schema({
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'TrainingPlan',
    required: true
  },
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
  title: {
    type: String,
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'skipped', 'cancelled'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'comprehensive', 'rest'],
    default: 'comprehensive'
  },
  focus: [String],
  exercises: [exerciseItemSchema],
  duration: {
    type: Number,
    default: 60
  },
  totalVolume: {
    type: Number,
    default: 0
  },
  estimatedCalories: {
    type: Number,
    default: 0
  },
  completedAt: Date,
  actualDuration: Number,
  feedbackId: {
    type: Schema.Types.ObjectId,
    ref: 'TrainingFeedback'
  },
  intensity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  notes: String,
  sequence: Number
}, {
  timestamps: true
});

trainingSessionSchema.index({ planId: 1, scheduledDate: 1 });
trainingSessionSchema.index({ studentId: 1, scheduledDate: -1 });
trainingSessionSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model('TrainingSession', trainingSessionSchema);
