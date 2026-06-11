const Exercise = require('../models/Exercise');
const dayjs = require('dayjs');

const generateWeeklyPlan = async (student, options = {}) => {
  const {
    goalType = 'comprehensive',
    intensity = 'medium',
    sessionsPerWeek = 3,
    sessionDuration = 60,
    startDate = dayjs().startOf('week').toDate(),
    availableDays = student.availableDays || [1, 3, 5]
  } = options;

  const exercises = await Exercise.find({ status: 'active' });
  const sessions = [];

  const focusRotation = getFocusRotation(goalType, sessionsPerWeek);
  const scheduleDays = selectTrainingDays(availableDays, sessionsPerWeek);

  for (let i = 0; i < sessionsPerWeek; i++) {
    const dayOfWeek = scheduleDays[i];
    const focus = focusRotation[i];
    const sessionDate = dayjs(startDate).day(dayOfWeek).toDate();

    const sessionExercises = selectExercisesForFocus(exercises, focus, intensity, sessionDuration);

    sessions.push({
      dayOfWeek,
      focus: Array.isArray(focus) ? focus : [focus],
      title: generateSessionTitle(focus, i + 1),
      scheduledDate: sessionDate,
      duration: sessionDuration,
      intensity,
      exercises: sessionExercises
    });
  }

  const totalSessions = sessionsPerWeek * 4;

  return {
    sessions,
    totalSessions,
    estimatedCalories: sessions.reduce((sum, s) => {
      const sessionCals = s.exercises.reduce((esum, e) => {
        return esum + (e.duration / 60) * (e.caloriesPerMinute || 8) * e.sets;
      }, 0);
      return sum + sessionCals;
    }, 0)
  };
};

const getFocusRotation = (goalType, sessionsPerWeek) => {
  const rotations = {
    strength: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'shoulders'], ['core', 'fullbody']],
    endurance: [['cardio'], ['cardio', 'legs'], ['cardio', 'core'], ['cardio']],
    fat_loss: [['cardio', 'fullbody'], ['strength', 'cardio'], ['hiit'], ['active_recovery']],
    muscle_gain: [['chest', 'triceps'], ['back', 'biceps'], ['legs'], ['shoulders', 'core']],
    rehabilitation: [['flexibility', 'core'], ['light_strength'], ['cardio_light'], ['flexibility']],
    comprehensive: [['fullbody_strength'], ['cardio'], ['strength_upper'], ['strength_lower']]
  };

  const base = rotations[goalType] || rotations.comprehensive;
  const result = [];
  for (let i = 0; i < sessionsPerWeek; i++) {
    result.push(base[i % base.length]);
  }
  return result;
};

const selectTrainingDays = (availableDays, sessionsPerWeek) => {
  const days = [...availableDays].sort((a, b) => a - b);

  if (days.length >= sessionsPerWeek) {
    return days.slice(0, sessionsPerWeek);
  }

  const defaultDays = [1, 3, 5, 2, 4, 6, 0];
  return defaultDays.slice(0, sessionsPerWeek);
};

const selectExercisesForFocus = (exercises, focus, intensity, duration) => {
  const selected = [];
  const focusExercises = [];

  const focusList = Array.isArray(focus) ? focus : [focus];

  exercises.forEach(ex => {
    if (focusList.some(f => ex.category === f || ex.muscleGroups?.includes(f))) {
      focusExercises.push(ex);
    }
  });

  if (focusExercises.length === 0) {
    const sample = exercises.slice(0, 8);
    sample.forEach(ex => focusExercises.push(ex));
  }

  const intensityMultiplier = { low: 0.7, medium: 1, high: 1.3 }[intensity] || 1;
  const exerciseCount = Math.min(Math.floor(duration / 12), 8);

  const shuffled = focusExercises.sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(exerciseCount, shuffled.length); i++) {
    const ex = shuffled[i];
    const sets = Math.round((ex.defaultSets || 3) * intensityMultiplier);
    const reps = Math.round((ex.defaultReps || 12) * (intensity === 'high' ? 1.2 : intensity === 'low' ? 0.8 : 1));

    selected.push({
      exerciseId: ex._id,
      exerciseName: ex.name,
      order: i + 1,
      sets,
      reps,
      duration: ex.defaultDuration || 60,
      restTime: intensity === 'high' ? 45 : intensity === 'low' ? 90 : 60,
      intensity,
      caloriesPerMinute: ex.caloriesPerMinute || 8
    });
  }

  return selected;
};

const generateSessionTitle = (focus, index) => {
  const focusNames = {
    chest: '胸部训练',
    back: '背部训练',
    legs: '腿部训练',
    shoulders: '肩部训练',
    arms: '手臂训练',
    core: '核心训练',
    cardio: '有氧训练',
    fullbody: '全身训练',
    fullbody_strength: '全身力量',
    strength_upper: '上肢力量',
    strength_lower: '下肢力量',
    flexibility: '柔韧拉伸',
    hiit: 'HIIT训练',
    active_recovery: '主动恢复',
    light_strength: '轻力量训练',
    cardio_light: '轻有氧'
  };

  const focusList = Array.isArray(focus) ? focus : [focus];
  const names = focusList.map(f => focusNames[f] || f).join('+');

  return `第${index}次训练 - ${names}`;
};

const adjustSessionIntensity = (session, newIntensity) => {
  const multiplier = { low: 0.8, medium: 1, high: 1.25 }[newIntensity] || 1;

  const adjustedExercises = session.exercises.map(ex => ({
    ...ex,
    sets: Math.max(1, Math.round(ex.sets * multiplier)),
    reps: Math.max(1, Math.round(ex.reps * multiplier)),
    restTime: Math.round(ex.restTime * (newIntensity === 'high' ? 0.8 : newIntensity === 'low' ? 1.2 : 1)),
    intensity: newIntensity
  }));

  return {
    ...session,
    intensity: newIntensity,
    exercises: adjustedExercises
  };
};

module.exports = {
  generateWeeklyPlan,
  adjustSessionIntensity,
  selectExercisesForFocus
};
