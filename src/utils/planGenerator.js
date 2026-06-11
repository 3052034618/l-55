const Exercise = require('../models/Exercise');
const dayjs = require('dayjs');

const GOAL_EXERCISE_MAP = {
  strength: {
    primaryCategories: ['chest', 'back', 'legs', 'shoulders', 'arms'],
    secondaryCategories: ['core', 'warmup', 'cooldown'],
    preferredDifficulties: ['intermediate', 'advanced'],
    priorityEquipment: ['barbell', 'dumbbells'],
    focusPerSession: [
      { primary: ['chest', 'arms'], name: '胸部+手臂' },
      { primary: ['back', 'arms'], name: '背部+手臂' },
      { primary: ['legs', 'shoulders'], name: '腿部+肩部' },
      { primary: ['core', 'chest'], name: '核心+胸部' }
    ]
  },
  endurance: {
    primaryCategories: ['cardio', 'legs', 'core'],
    secondaryCategories: ['warmup', 'cooldown', 'flexibility'],
    preferredDifficulties: ['beginner', 'intermediate'],
    priorityEquipment: ['treadmill', 'stationary_bike', 'jump_rope'],
    focusPerSession: [
      { primary: ['cardio'], name: '有氧耐力' },
      { primary: ['cardio', 'legs'], name: '有氧+腿部' },
      { primary: ['cardio', 'core'], name: '有氧+核心' },
      { primary: ['cardio'], name: '间歇有氧' }
    ]
  },
  fat_loss: {
    primaryCategories: ['cardio', 'core', 'legs'],
    secondaryCategories: ['chest', 'back', 'warmup', 'cooldown'],
    preferredDifficulties: ['beginner', 'intermediate'],
    priorityEquipment: ['jump_rope', 'treadmill', 'stationary_bike'],
    focusPerSession: [
      { primary: ['cardio', 'core'], name: '燃脂+核心' },
      { primary: ['cardio', 'legs'], name: '燃脂+下肢' },
      { primary: ['cardio'], name: 'HIIT燃脂' },
      { primary: ['core', 'flexibility'], name: '核心+拉伸' }
    ]
  },
  muscle_gain: {
    primaryCategories: ['chest', 'back', 'legs', 'shoulders', 'arms'],
    secondaryCategories: ['core', 'warmup', 'cooldown'],
    preferredDifficulties: ['intermediate', 'advanced'],
    priorityEquipment: ['barbell', 'dumbbells', 'cable_machine'],
    focusPerSession: [
      { primary: ['chest', 'arms'], name: '胸+三头' },
      { primary: ['back', 'arms'], name: '背+二头' },
      { primary: ['legs'], name: '腿部增肌' },
      { primary: ['shoulders', 'core'], name: '肩+核心' }
    ]
  },
  rehabilitation: {
    primaryCategories: ['flexibility', 'core', 'warmup', 'cooldown'],
    secondaryCategories: ['cardio', 'legs'],
    preferredDifficulties: ['beginner'],
    priorityEquipment: [],
    focusPerSession: [
      { primary: ['flexibility', 'core'], name: '柔韧+核心' },
      { primary: ['warmup', 'flexibility'], name: '热身+拉伸' },
      { primary: ['cardio'], name: '轻度有氧' },
      { primary: ['cooldown', 'flexibility'], name: '放松恢复' }
    ]
  },
  comprehensive: {
    primaryCategories: ['chest', 'back', 'legs', 'shoulders', 'core', 'cardio'],
    secondaryCategories: ['arms', 'flexibility', 'warmup', 'cooldown'],
    preferredDifficulties: ['beginner', 'intermediate'],
    priorityEquipment: [],
    focusPerSession: [
      { primary: ['chest', 'back', 'core'], name: '上肢综合' },
      { primary: ['cardio'], name: '有氧训练' },
      { primary: ['legs', 'shoulders'], name: '下肢+肩部' },
      { primary: ['core', 'flexibility'], name: '核心+柔韧' }
    ]
  }
};

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

  if (!exercises || exercises.length === 0) {
    return {
      canGenerate: false,
      reason: '动作库为空，无法生成训练计划。请先通过 POST /api/exercises 接口添加动作到动作库，或运行 npm run seed 导入种子数据。',
      sessions: [],
      totalSessions: 0,
      estimatedCalories: 0
    };
  }

  const goalConfig = GOAL_EXERCISE_MAP[goalType] || GOAL_EXERCISE_MAP.comprehensive;
  const sessions = [];
  const scheduleDays = selectTrainingDays(availableDays, sessionsPerWeek);

  const studentLevel = student.level || 'beginner';

  for (let i = 0; i < sessionsPerWeek; i++) {
    const dayOfWeek = scheduleDays[i];
    const focusConfig = goalConfig.focusPerSession[i % goalConfig.focusPerSession.length];
    const sessionDate = dayjs(startDate).day(dayOfWeek).toDate();

    const sessionExercises = selectExercisesForGoal(
      exercises,
      focusConfig.primary,
      goalConfig,
      intensity,
      sessionDuration,
      studentLevel
    );

    sessions.push({
      dayOfWeek,
      focus: focusConfig.primary,
      title: `第${i + 1}次训练 - ${focusConfig.name}`,
      scheduledDate: sessionDate,
      duration: sessionDuration,
      intensity,
      exercises: sessionExercises
    });
  }

  const totalSessions = sessionsPerWeek * 4;

  return {
    canGenerate: true,
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

const selectExercisesForGoal = (allExercises, primaryCategories, goalConfig, intensity, duration, studentLevel) => {
  const selected = [];

  const levelFilter = studentLevel === 'beginner'
    ? ['beginner']
    : studentLevel === 'advanced'
      ? ['intermediate', 'advanced']
      : ['beginner', 'intermediate'];

  let primaryExercises = allExercises.filter(ex =>
    primaryCategories.includes(ex.category) && levelFilter.includes(ex.difficulty)
  );

  if (primaryExercises.length < 3) {
    primaryExercises = allExercises.filter(ex =>
      primaryCategories.includes(ex.category)
    );
  }

  let secondaryExercises = allExercises.filter(ex =>
    goalConfig.secondaryCategories.includes(ex.category) && levelFilter.includes(ex.difficulty)
  );

  if (secondaryExercises.length < 2) {
    secondaryExercises = allExercises.filter(ex =>
      goalConfig.secondaryCategories.includes(ex.category)
    );
  }

  if (goalConfig.priorityEquipment && goalConfig.priorityEquipment.length > 0) {
    primaryExercises.sort((a, b) => {
      const aHasPriority = a.equipment?.some(e => goalConfig.priorityEquipment.includes(e)) ? 1 : 0;
      const bHasPriority = b.equipment?.some(e => goalConfig.priorityEquipment.includes(e)) ? 1 : 0;
      return bHasPriority - aHasPriority;
    });
  }

  const intensityMultiplier = { low: 0.7, medium: 1, high: 1.3 }[intensity] || 1;
  const primaryCount = Math.min(Math.floor(duration / 15), 6);
  const secondaryCount = Math.min(Math.floor(duration / 30), 3);

  const usedIds = new Set();

  const shuffledPrimary = primaryExercises
    .filter(ex => !usedIds.has(ex._id.toString()))
    .sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(primaryCount, shuffledPrimary.length); i++) {
    const ex = shuffledPrimary[i];
    usedIds.add(ex._id.toString());
    const sets = Math.max(1, Math.round((ex.defaultSets || 3) * intensityMultiplier));
    const reps = Math.max(1, Math.round((ex.defaultReps || 12) * (intensity === 'high' ? 1.2 : intensity === 'low' ? 0.8 : 1)));

    selected.push({
      exerciseId: ex._id,
      exerciseName: ex.name,
      order: selected.length + 1,
      sets,
      reps,
      duration: ex.defaultDuration || 60,
      weight: 0,
      restTime: intensity === 'high' ? 45 : intensity === 'low' ? 90 : 60,
      intensity,
      caloriesPerMinute: ex.caloriesPerMinute || 8
    });
  }

  const shuffledSecondary = secondaryExercises
    .filter(ex => !usedIds.has(ex._id.toString()))
    .sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(secondaryCount, shuffledSecondary.length); i++) {
    const ex = shuffledSecondary[i];
    usedIds.add(ex._id.toString());
    const sets = Math.max(1, Math.round((ex.defaultSets || 3) * intensityMultiplier * 0.8));
    const reps = Math.max(1, Math.round((ex.defaultReps || 12) * (intensity === 'high' ? 1.1 : intensity === 'low' ? 0.9 : 1)));

    selected.push({
      exerciseId: ex._id,
      exerciseName: ex.name,
      order: selected.length + 1,
      sets,
      reps,
      duration: ex.defaultDuration || 60,
      weight: 0,
      restTime: intensity === 'high' ? 60 : intensity === 'low' ? 120 : 90,
      intensity,
      caloriesPerMinute: ex.caloriesPerMinute || 5
    });
  }

  return selected;
};

const selectTrainingDays = (availableDays, sessionsPerWeek) => {
  const days = [...availableDays].sort((a, b) => a - b);

  if (days.length >= sessionsPerWeek) {
    return days.slice(0, sessionsPerWeek);
  }

  const defaultDays = [1, 3, 5, 2, 4, 6, 0];
  return defaultDays.slice(0, sessionsPerWeek);
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
  selectExercisesForGoal,
  GOAL_EXERCISE_MAP
};
