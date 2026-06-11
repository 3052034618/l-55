const TrainingPlan = require('../models/TrainingPlan');
const TrainingSession = require('../models/TrainingSession');
const Student = require('../models/Student');
const { successResponse, AppError, asyncHandler } = require('../utils/response');
const { paginate } = require('../utils/pagination');
const { generateWeeklyPlan, adjustSessionIntensity } = require('../utils/planGenerator');
const dayjs = require('dayjs');

const createTrainingPlan = asyncHandler(async (req, res) => {
  const { studentId, coachId } = req.body;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }

  const plan = new TrainingPlan(req.body);
  await plan.save();

  successResponse(res, plan, '训练计划创建成功', 201);
});

const generateWeeklyTrainingPlan = asyncHandler(async (req, res) => {
  const { studentId, coachId, goalType, intensity, sessionsPerWeek, sessionDuration, startDate } = req.body;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }

  const planData = await generateWeeklyPlan(student, {
    goalType,
    intensity,
    sessionsPerWeek,
    sessionDuration,
    startDate,
    availableDays: student.availableDays
  });

  if (!planData.canGenerate) {
    return successResponse(res, {
      canGenerate: false,
      reason: planData.reason,
      plan: null,
      sessions: []
    }, planData.reason, 200);
  }

  const start = dayjs(startDate || dayjs().startOf('week').toDate());
  const end = start.add(6, 'day');

  const plan = new TrainingPlan({
    studentId,
    coachId,
    name: `${student.name} - ${start.format('YYYY年MM月DD日')}周计划`,
    type: 'weekly',
    goalType: goalType || 'comprehensive',
    startDate: start.toDate(),
    endDate: end.toDate(),
    status: 'draft',
    intensity: intensity || 'medium',
    sessionsPerWeek: sessionsPerWeek || 3,
    sessionDuration: sessionDuration || 60,
    totalSessions: planData.totalSessions,
    weeklySchedule: planData.sessions.map(s => ({
      dayOfWeek: s.dayOfWeek,
      focus: s.focus
    }))
  });

  await plan.save();

  const sessions = [];
  for (let i = 0; i < planData.sessions.length; i++) {
    const s = planData.sessions[i];
    const session = new TrainingSession({
      planId: plan._id,
      studentId,
      coachId,
      title: s.title,
      scheduledDate: s.scheduledDate,
      type: Array.isArray(s.focus) ? (s.focus[0] || 'comprehensive') : (s.focus || 'comprehensive'),
      focus: s.focus,
      exercises: s.exercises,
      duration: s.duration,
      intensity: s.intensity,
      sequence: i + 1,
      estimatedCalories: s.exercises.reduce((sum, e) => {
        return sum + (e.duration / 60) * (e.caloriesPerMinute || 8) * e.sets;
      }, 0)
    });
    await session.save();
    sessions.push(session);
  }

  successResponse(res, {
    canGenerate: true,
    plan,
    sessions
  }, '周训练计划生成成功', 201);
});

const getTrainingPlans = asyncHandler(async (req, res) => {
  const { page, limit, studentId, coachId, status, type, startDate, endDate } = req.query;
  const query = {};

  if (studentId) query.studentId = studentId;
  if (coachId) query.coachId = coachId;
  if (status) query.status = status;
  if (type) query.type = type;
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  const result = await paginate(TrainingPlan, query, {
    page,
    limit,
    sort: { startDate: -1 },
    populate: 'studentId coachId'
  });

  successResponse(res, result, '获取训练计划列表成功');
});

const getTrainingPlanById = asyncHandler(async (req, res) => {
  const plan = await TrainingPlan.findById(req.params.id)
    .populate('studentId')
    .populate('coachId');

  if (!plan) {
    throw new AppError('训练计划不存在', 404, 'PLAN_NOT_FOUND');
  }

  const sessions = await TrainingSession.find({ planId: plan._id })
    .sort({ scheduledDate: 1, sequence: 1 });

  successResponse(res, { plan, sessions }, '获取训练计划详情成功');
});

const updateTrainingPlan = asyncHandler(async (req, res) => {
  const plan = await TrainingPlan.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!plan) {
    throw new AppError('训练计划不存在', 404, 'PLAN_NOT_FOUND');
  }

  successResponse(res, plan, '训练计划更新成功');
});

const deleteTrainingPlan = asyncHandler(async (req, res) => {
  const plan = await TrainingPlan.findByIdAndDelete(req.params.id);
  if (!plan) {
    throw new AppError('训练计划不存在', 404, 'PLAN_NOT_FOUND');
  }

  await TrainingSession.deleteMany({ planId: plan._id });

  successResponse(res, null, '训练计划删除成功');
});

const activatePlan = asyncHandler(async (req, res) => {
  const plan = await TrainingPlan.findById(req.params.id);
  if (!plan) {
    throw new AppError('训练计划不存在', 404, 'PLAN_NOT_FOUND');
  }

  if (plan.status === 'active') {
    throw new AppError('训练计划已激活', 400, 'PLAN_ALREADY_ACTIVE');
  }

  plan.status = 'active';
  await plan.save();

  const student = await Student.findById(plan.studentId);
  if (student) {
    student.planStatus = 'active';
    await student.save();
  }

  successResponse(res, plan, '训练计划已激活');
});

const pausePlan = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const plan = await TrainingPlan.findById(req.params.id);
  if (!plan) {
    throw new AppError('训练计划不存在', 404, 'PLAN_NOT_FOUND');
  }

  if (plan.status !== 'active') {
    throw new AppError('只有活跃的计划才能暂停', 400, 'PLAN_NOT_ACTIVE');
  }

  plan.status = 'paused';
  plan.pausedAt = new Date();
  plan.pauseReason = reason;
  await plan.save();

  const student = await Student.findById(plan.studentId);
  if (student) {
    student.planStatus = 'paused';
    await student.save();
  }

  successResponse(res, plan, '训练计划已暂停');
});

const resumePlan = asyncHandler(async (req, res) => {
  const plan = await TrainingPlan.findById(req.params.id);
  if (!plan) {
    throw new AppError('训练计划不存在', 404, 'PLAN_NOT_FOUND');
  }

  if (plan.status !== 'paused') {
    throw new AppError('只有暂停的计划才能恢复', 400, 'PLAN_NOT_PAUSED');
  }

  plan.status = 'active';
  plan.resumedAt = new Date();
  await plan.save();

  const student = await Student.findById(plan.studentId);
  if (student) {
    student.planStatus = 'active';
    await student.save();
  }

  successResponse(res, plan, '训练计划已恢复');
});

const adjustPlanIntensity = asyncHandler(async (req, res) => {
  const { intensity } = req.body;

  const plan = await TrainingPlan.findById(req.params.id);
  if (!plan) {
    throw new AppError('训练计划不存在', 404, 'PLAN_NOT_FOUND');
  }

  plan.intensity = intensity;
  await plan.save();

  const sessions = await TrainingSession.find({
    planId: plan._id,
    status: 'scheduled'
  });

  for (const session of sessions) {
    const adjusted = adjustSessionIntensity(session.toObject(), intensity);
    session.exercises = adjusted.exercises;
    session.intensity = intensity;
    await session.save();
  }

  successResponse(res, { plan, adjustedCount: sessions.length }, '训练强度已调整');
});

module.exports = {
  createTrainingPlan,
  generateWeeklyTrainingPlan,
  getTrainingPlans,
  getTrainingPlanById,
  updateTrainingPlan,
  deleteTrainingPlan,
  activatePlan,
  pausePlan,
  resumePlan,
  adjustPlanIntensity
};
