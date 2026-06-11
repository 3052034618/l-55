const Exercise = require('../models/Exercise');
const { successResponse, AppError, asyncHandler } = require('../utils/response');
const { paginate } = require('../utils/pagination');

const createExercise = asyncHandler(async (req, res) => {
  const exercise = new Exercise(req.body);
  await exercise.save();
  successResponse(res, exercise, '动作创建成功', 201);
});

const getExercises = asyncHandler(async (req, res) => {
  const { page, limit, category, difficulty, equipment, keyword, status } = req.query;
  const query = {};

  if (category) query.category = category;
  if (difficulty) query.difficulty = difficulty;
  if (status !== undefined) query.status = status;
  else query.status = 'active';

  if (equipment) {
    query.equipment = { $in: equipment.split(',') };
  }

  if (keyword) {
    query.$text = { $search: keyword };
  }

  const result = await paginate(Exercise, query, {
    page,
    limit,
    sort: { createdAt: -1 }
  });

  successResponse(res, result, '获取动作列表成功');
});

const getExerciseById = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) {
    throw new AppError('动作不存在', 404, 'EXERCISE_NOT_FOUND');
  }
  successResponse(res, exercise, '获取动作详情成功');
});

const updateExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!exercise) {
    throw new AppError('动作不存在', 404, 'EXERCISE_NOT_FOUND');
  }

  successResponse(res, exercise, '动作更新成功');
});

const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(
    req.params.id,
    { status: 'inactive' },
    { new: true }
  );

  if (!exercise) {
    throw new AppError('动作不存在', 404, 'EXERCISE_NOT_FOUND');
  }

  successResponse(res, null, '动作删除成功');
});

const getExerciseCategories = asyncHandler(async (req, res) => {
  const categories = [
    { key: 'chest', name: '胸部' },
    { key: 'back', name: '背部' },
    { key: 'shoulders', name: '肩部' },
    { key: 'arms', name: '手臂' },
    { key: 'legs', name: '腿部' },
    { key: 'core', name: '核心' },
    { key: 'cardio', name: '有氧' },
    { key: 'flexibility', name: '柔韧' },
    { key: 'warmup', name: '热身' },
    { key: 'cooldown', name: '放松' }
  ];

  const counts = await Exercise.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  const countMap = {};
  counts.forEach(c => {
    countMap[c._id] = c.count;
  });

  const result = categories.map(cat => ({
    ...cat,
    count: countMap[cat.key] || 0
  }));

  successResponse(res, result, '获取动作分类成功');
});

const getDifficultyLevels = asyncHandler(async (req, res) => {
  const levels = [
    { key: 'beginner', name: '初级', description: '适合新手入门' },
    { key: 'intermediate', name: '中级', description: '有一定训练基础' },
    { key: 'advanced', name: '高级', description: '训练经验丰富' }
  ];

  successResponse(res, levels, '获取难度等级成功');
});

module.exports = {
  createExercise,
  getExercises,
  getExerciseById,
  updateExercise,
  deleteExercise,
  getExerciseCategories,
  getDifficultyLevels
};
