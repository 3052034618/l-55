const TrainingSession = require('../models/TrainingSession');
const TrainingPlan = require('../models/TrainingPlan');
const { successResponse, AppError, asyncHandler } = require('../utils/response');
const { paginate } = require('../utils/pagination');
const { adjustSessionIntensity } = require('../utils/planGenerator');
const { assessOvertrainingRisk } = require('../utils/overtraining');
const Student = require('../models/Student');

const createSession = asyncHandler(async (req, res) => {
  const session = new TrainingSession(req.body);
  await session.save();
  successResponse(res, session, '训练单元创建成功', 201);
});

const getSessions = asyncHandler(async (req, res) => {
  const {
    page, limit, studentId, coachId, planId, status, type,
    startDate, endDate, sortField, sortOrder
  } = req.query;

  const query = {};

  if (studentId) query.studentId = studentId;
  if (coachId) query.coachId = coachId;
  if (planId) query.planId = planId;
  if (status) query.status = status;
  if (type) query.type = type;
  if (startDate || endDate) {
    query.scheduledDate = {};
    if (startDate) query.scheduledDate.$gte = new Date(startDate);
    if (endDate) query.scheduledDate.$lte = new Date(endDate);
  }

  const sort = {};
  sort[sortField || 'scheduledDate'] = sortOrder === 'desc' ? -1 : 1;

  const result = await paginate(TrainingSession, query, {
    page,
    limit,
    sort,
    populate: 'studentId coachId planId'
  });

  successResponse(res, result, '获取训练单元列表成功');
});

const getSessionById = asyncHandler(async (req, res) => {
  const session = await TrainingSession.findById(req.params.id)
    .populate('studentId')
    .populate('coachId')
    .populate('planId');

  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }

  successResponse(res, session, '获取训练单元详情成功');
});

const updateSession = asyncHandler(async (req, res) => {
  const session = await TrainingSession.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }

  successResponse(res, session, '训练单元更新成功');
});

const deleteSession = asyncHandler(async (req, res) => {
  const session = await TrainingSession.findByIdAndDelete(req.params.id);
  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }
  successResponse(res, null, '训练单元删除成功');
});

const adjustSessionIntensityLevel = asyncHandler(async (req, res) => {
  const { intensity } = req.body;

  const session = await TrainingSession.findById(req.params.id);
  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }

  if (session.status !== 'scheduled') {
    throw new AppError('只能调整未开始的训练单元强度', 400, 'SESSION_NOT_SCHEDULED');
  }

  const adjusted = adjustSessionIntensity(session.toObject(), intensity);
  session.exercises = adjusted.exercises;
  session.intensity = intensity;
  await session.save();

  successResponse(res, session, '训练单元强度已调整');
});

const completeSession = asyncHandler(async (req, res) => {
  const { actualDuration, completedExercises, notes } = req.body;

  const session = await TrainingSession.findById(req.params.id);
  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }

  if (session.status === 'completed') {
    throw new AppError('训练单元已完成', 400, 'SESSION_ALREADY_COMPLETED');
  }

  session.status = 'completed';
  session.completedAt = new Date();
  session.actualDuration = actualDuration || session.duration;
  if (notes) session.notes = notes;

  if (completedExercises) {
    session.exercises = session.exercises.map(ex => {
      const completed = completedExercises.find(
        c => c.exerciseId === ex.exerciseId?.toString()
      );
      if (completed) {
        ex.completedSets = completed.completedSets || ex.sets;
        if (completed.actualWeight !== undefined) {
          ex.weight = completed.actualWeight;
        }
        if (completed.actualReps !== undefined) {
          ex.reps = completed.actualReps;
        }
        if (completed.notes) ex.notes = completed.notes;
      }
      return ex;
    });
  } else {
    session.exercises.forEach(ex => {
      ex.completedSets = ex.sets;
    });
  }

  let totalVolume = 0;
  session.exercises.forEach(ex => {
    totalVolume += (ex.weight || 0) * (ex.completedSets || 0) * (ex.reps || 0);
  });
  session.totalVolume = totalVolume;

  await session.save();

  const plan = await TrainingPlan.findById(session.planId);
  if (plan) {
    plan.completedSessions = (plan.completedSessions || 0) + 1;
    if (plan.completedSessions >= plan.totalSessions && plan.totalSessions > 0) {
      plan.status = 'completed';
    }
    await plan.save();

    if (plan.status === 'completed') {
      const student = await Student.findById(plan.studentId);
      if (student) {
        student.planStatus = 'none';
        await student.save();
      }
    }
  }

  const overtrainingRisk = await assessOvertrainingRisk(session.studentId);

  const student = await Student.findById(session.studentId);
  if (student) {
    student.overtrainingRisk = {
      level: overtrainingRisk.level,
      lastAssessed: overtrainingRisk.lastAssessed,
      factors: overtrainingRisk.factors
    };
    await student.save();
  }

  successResponse(res, {
    session,
    overtrainingRisk
  }, '训练已完成登记');
});

const skipSession = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const session = await TrainingSession.findById(req.params.id);
  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }

  session.status = 'skipped';
  session.notes = reason || session.notes;
  await session.save();

  successResponse(res, session, '训练已跳过');
});

const startSession = asyncHandler(async (req, res) => {
  const session = await TrainingSession.findById(req.params.id);
  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }

  if (session.status !== 'scheduled') {
    throw new AppError('只能开始未开始的训练', 400, 'INVALID_SESSION_STATUS');
  }

  session.status = 'in_progress';
  await session.save();

  successResponse(res, session, '训练已开始');
});

const getNextSession = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const nextSession = await TrainingSession.findOne({
    studentId,
    status: { $in: ['scheduled', 'in_progress'] }
  })
    .sort({ scheduledDate: 1 })
    .populate('planId');

  if (!nextSession) {
    return successResponse(res, null, '暂无待进行的训练');
  }

  const overtrainingRisk = await assessOvertrainingRisk(studentId);

  successResponse(res, {
    session: nextSession,
    overtrainingRisk,
    reminder: generateSessionReminder(nextSession, overtrainingRisk)
  }, '获取下次训练成功');
});

const generateSessionReminder = (session, risk) => {
  const reminders = [];

  reminders.push(`下次训练：${session.title}`);
  reminders.push(`训练时长：约${session.duration}分钟`);

  if (session.exercises && session.exercises.length > 0) {
    const exerciseNames = session.exercises.slice(0, 3).map(e => e.exerciseName).join('、');
    reminders.push(`主要动作：${exerciseNames}${session.exercises.length > 3 ? '...' : ''}`);
  }

  if (risk && risk.level === 'high') {
    reminders.push('⚠️ 注意：当前过度训练风险较高，建议降低强度或安排休息');
  } else if (risk && risk.level === 'medium') {
    reminders.push('💡 提示：注意身体信号，适度调整训练强度');
  }

  return reminders;
};

const addExerciseToSession = asyncHandler(async (req, res) => {
  const session = await TrainingSession.findById(req.params.id);
  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }

  const maxOrder = session.exercises.reduce((max, ex) => Math.max(max, ex.order || 0), 0);

  session.exercises.push({
    ...req.body,
    order: maxOrder + 1
  });

  await session.save();
  successResponse(res, session, '动作添加成功');
});

const removeExerciseFromSession = asyncHandler(async (req, res) => {
  const { exerciseIndex } = req.params;

  const session = await TrainingSession.findById(req.params.id);
  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }

  const index = parseInt(exerciseIndex);
  if (isNaN(index) || index < 0 || index >= session.exercises.length) {
    throw new AppError('动作索引无效', 400, 'INVALID_EXERCISE_INDEX');
  }

  session.exercises.splice(index, 1);

  session.exercises.forEach((ex, i) => {
    ex.order = i + 1;
  });

  await session.save();
  successResponse(res, session, '动作移除成功');
});

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  adjustSessionIntensityLevel,
  completeSession,
  skipSession,
  startSession,
  getNextSession,
  addExerciseToSession,
  removeExerciseFromSession
};
