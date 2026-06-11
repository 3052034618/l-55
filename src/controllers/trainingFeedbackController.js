const TrainingFeedback = require('../models/TrainingFeedback');
const TrainingSession = require('../models/TrainingSession');
const Student = require('../models/Student');
const { successResponse, AppError, asyncHandler } = require('../utils/response');
const { paginate } = require('../utils/pagination');
const { assessOvertrainingRisk } = require('../utils/overtraining');

const createFeedback = asyncHandler(async (req, res) => {
  const { sessionId, studentId, coachId } = req.body;

  const session = await TrainingSession.findById(sessionId);
  if (!session) {
    throw new AppError('训练单元不存在', 404, 'SESSION_NOT_FOUND');
  }

  const existingFeedback = await TrainingFeedback.findOne({ sessionId });
  if (existingFeedback) {
    throw new AppError('该训练已有反馈记录', 400, 'FEEDBACK_ALREADY_EXISTS');
  }

  const feedback = new TrainingFeedback(req.body);
  await feedback.save();

  session.feedbackId = feedback._id;
  await session.save();

  const overtrainingRisk = await assessOvertrainingRisk(studentId);

  feedback.overtrainingRisk = {
    level: overtrainingRisk.level,
    factors: overtrainingRisk.factors,
    recommendation: overtrainingRisk.recommendations?.[0] || ''
  };
  await feedback.save();

  const student = await Student.findById(studentId);
  if (student) {
    student.overtrainingRisk = {
      level: overtrainingRisk.level,
      lastAssessed: new Date(),
      factors: overtrainingRisk.factors
    };
    await student.save();
  }

  successResponse(res, {
    feedback,
    overtrainingRisk: {
      level: overtrainingRisk.level,
      score: overtrainingRisk.score,
      factors: overtrainingRisk.factors,
      dimensions: overtrainingRisk.dimensions,
      recommendations: overtrainingRisk.recommendations,
      sessionAdvice: overtrainingRisk.sessionAdvice
    }
  }, '训练反馈提交成功', 201);
});

const getFeedbacks = asyncHandler(async (req, res) => {
  const { page, limit, studentId, coachId, sessionId, startDate, endDate, minFatigueLevel } = req.query;
  const query = {};

  if (studentId) query.studentId = studentId;
  if (coachId) query.coachId = coachId;
  if (sessionId) query.sessionId = sessionId;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  if (minFatigueLevel) {
    query.fatigueLevel = { $gte: parseInt(minFatigueLevel) };
  }

  const result = await paginate(TrainingFeedback, query, {
    page,
    limit,
    sort: { date: -1 },
    populate: 'studentId coachId sessionId'
  });

  successResponse(res, result, '获取反馈列表成功');
});

const getFeedbackById = asyncHandler(async (req, res) => {
  const feedback = await TrainingFeedback.findById(req.params.id)
    .populate('studentId')
    .populate('coachId')
    .populate('sessionId');

  if (!feedback) {
    throw new AppError('反馈记录不存在', 404, 'FEEDBACK_NOT_FOUND');
  }

  successResponse(res, feedback, '获取反馈详情成功');
});

const updateFeedback = asyncHandler(async (req, res) => {
  const feedback = await TrainingFeedback.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!feedback) {
    throw new AppError('反馈记录不存在', 404, 'FEEDBACK_NOT_FOUND');
  }

  successResponse(res, feedback, '反馈更新成功');
});

const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await TrainingFeedback.findByIdAndDelete(req.params.id);
  if (!feedback) {
    throw new AppError('反馈记录不存在', 404, 'FEEDBACK_NOT_FOUND');
  }

  const session = await TrainingSession.findById(feedback.sessionId);
  if (session) {
    session.feedbackId = undefined;
    await session.save();
  }

  successResponse(res, null, '反馈删除成功');
});

const getStudentFatigueTrend = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { limit = 14 } = req.query;

  const feedbacks = await TrainingFeedback.find({ studentId })
    .sort({ date: -1 })
    .limit(parseInt(limit))
    .select('date fatigueLevel muscleSoreness mood overallRating');

  const reversed = feedbacks.reverse();

  const trend = {
    dates: reversed.map(f => f.date),
    fatigueLevels: reversed.map(f => f.fatigueLevel),
    sorenessLevels: reversed.map(f => f.muscleSoreness),
    moods: reversed.map(f => f.mood),
    ratings: reversed.map(f => f.overallRating)
  };

  const avgFatigue = feedbacks.length > 0
    ? feedbacks.reduce((sum, f) => sum + (f.fatigueLevel || 0), 0) / feedbacks.length
    : 0;

  successResponse(res, {
    trend,
    avgFatigue: Math.round(avgFatigue * 10) / 10,
    totalCount: feedbacks.length
  }, '获取疲劳趋势成功');
});

const getOvertrainingRisk = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const risk = await assessOvertrainingRisk(studentId);

  const student = await Student.findById(studentId);
  if (student) {
    student.overtrainingRisk = {
      level: risk.level,
      lastAssessed: new Date(),
      factors: risk.factors
    };
    await student.save();
  }

  successResponse(res, {
    level: risk.level,
    score: risk.score,
    factors: risk.factors,
    dimensions: risk.dimensions,
    recommendations: risk.recommendations,
    sessionAdvice: risk.sessionAdvice,
    lastAssessed: risk.lastAssessed
  }, '获取过度训练风险评估成功');
});

const addCoachComment = asyncHandler(async (req, res) => {
  const { comment } = req.body;

  const feedback = await TrainingFeedback.findById(req.params.id);
  if (!feedback) {
    throw new AppError('反馈记录不存在', 404, 'FEEDBACK_NOT_FOUND');
  }

  feedback.coachComment = comment;
  await feedback.save();

  successResponse(res, feedback, '教练评论添加成功');
});

module.exports = {
  createFeedback,
  getFeedbacks,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getStudentFatigueTrend,
  getOvertrainingRisk,
  addCoachComment
};
