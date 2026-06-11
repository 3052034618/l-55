const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'chest', 'back', 'shoulders', 'arms', 'legs', 'core',
      'cardio', 'flexibility', 'warmup', 'cooldown'
    ],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  equipment: {
    type: [String],
    default: []
  },
  muscleGroups: {
    type: [String],
    default: []
  },
  description: String,
  tips: [String],
  mediaUrls: [String],
  defaultSets: {
    type: Number,
    default: 3
  },
  defaultReps: {
    type: Number,
    default: 12
  },
  defaultDuration: {
    type: Number,
    default: 60
  },
  caloriesPerMinute: {
    type: Number,
    default: 8
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

exerciseSchema.index({ category: 1, difficulty: 1 });
exerciseSchema.index({ name: 'text' });

module.exports = mongoose.model('Exercise', exerciseSchema);
