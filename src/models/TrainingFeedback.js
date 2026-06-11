const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trainingFeedbackSchema = new Schema({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'TrainingSession',
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
  date: {
    type: Date,
    default: Date.now
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 5
  },
  difficultyRating: {
    type: Number,
    min: 1,
    max: 5
  },
  fatigueLevel: {
    type: Number,
    min: 1,
    max: 10,
    description: '1=精力充沛，10=极度疲劳'
  },
  muscleSoreness: {
    type: Number,
    min: 1,
    max: 10
  },
  sorenessAreas: [String],
  mood: {
    type: String,
    enum: ['great', 'good', 'normal', 'tired', 'bad'],
    default: 'normal'
  },
  sleepQuality: {
    type: Number,
    min: 1,
    max: 5
  },
  appetite: {
    type: String,
    enum: ['excellent', 'good', 'normal', 'poor'],
    default: 'normal'
  },
  completedExercises: [{
    exerciseId: Schema.Types.ObjectId,
    exerciseName: String,
    completedSets: Number,
    actualWeight: Number,
    actualReps: Number,
    notes: String
  }],
  skippedExercises: [{
    exerciseId: Schema.Types.ObjectId,
    exerciseName: String,
    reason: String
  }],
  injuries: [{
    bodyPart: String,
    severity: {
      type: String,
      enum: ['none', 'mild', 'moderate', 'severe']
    },
    description: String
  }],
  notes: String,
  coachComment: String,
  overtrainingRisk: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    factors: [String],
    recommendation: String
  }
}, {
  timestamps: true
});

trainingFeedbackSchema.index({ studentId: 1, date: -1 });
trainingFeedbackSchema.index({ sessionId: 1 });
trainingFeedbackSchema.index({ coachId: 1, date: -1 });

module.exports = mongoose.model('TrainingFeedback', trainingFeedbackSchema);
