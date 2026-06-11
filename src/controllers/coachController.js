const Coach = require('../models/Coach');
const Student = require('../models/Student');
const { successResponse, AppError, asyncHandler } = require('../utils/response');
const { paginate } = require('../utils/pagination');

const createCoach = asyncHandler(async (req, res) => {
  const coach = new Coach(req.body);
  await coach.save();
  successResponse(res, coach, '教练创建成功', 201);
});

const getCoaches = asyncHandler(async (req, res) => {
  const { page, limit, status, specialty, keyword } = req.query;
  const query = {};

  if (status) query.status = status;
  if (specialty) query.specialty = specialty;
  if (keyword) {
    query.name = { $regex: keyword, $options: 'i' };
  }

  const result = await paginate(Coach, query, {
    page,
    limit,
    sort: { createdAt: -1 }
  });

  successResponse(res, result, '获取教练列表成功');
});

const getCoachById = asyncHandler(async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) {
    throw new AppError('教练不存在', 404, 'COACH_NOT_FOUND');
  }
  successResponse(res, coach, '获取教练详情成功');
});

const updateCoach = asyncHandler(async (req, res) => {
  const coach = await Coach.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!coach) {
    throw new AppError('教练不存在', 404, 'COACH_NOT_FOUND');
  }

  successResponse(res, coach, '教练信息更新成功');
});

const deleteCoach = asyncHandler(async (req, res) => {
  const coach = await Coach.findByIdAndDelete(req.params.id);
  if (!coach) {
    throw new AppError('教练不存在', 404, 'COACH_NOT_FOUND');
  }
  successResponse(res, null, '教练删除成功');
});

const getCoachStudents = asyncHandler(async (req, res) => {
  const { page, limit, status, level } = req.query;
  const coachId = req.params.id;

  const coach = await Coach.findById(coachId);
  if (!coach) {
    throw new AppError('教练不存在', 404, 'COACH_NOT_FOUND');
  }

  const query = { coachId };
  if (status) query.status = status;
  if (level) query.level = level;

  const result = await paginate(Student, query, {
    page,
    limit,
    sort: { createdAt: -1 }
  });

  successResponse(res, result, '获取教练学员列表成功');
});

const getCoachStudentsProgress = asyncHandler(async (req, res) => {
  const coachId = req.params.id;

  const coach = await Coach.findById(coachId);
  if (!coach) {
    throw new AppError('教练不存在', 404, 'COACH_NOT_FOUND');
  }

  const students = await Student.find({ coachId }).select('name level status planStatus overtrainingRisk trainingGoals');

  const progressList = students.map(student => ({
    studentId: student._id,
    name: student.name,
    level: student.level,
    status: student.status,
    planStatus: student.planStatus,
    overtrainingRisk: student.overtrainingRisk,
    goalCount: student.trainingGoals?.length || 0
  }));

  const summary = {
    total: students.length,
    active: students.filter(s => s.status === 'active').length,
    paused: students.filter(s => s.status === 'paused').length,
    hasPlan: students.filter(s => s.planStatus === 'active').length,
    highRisk: students.filter(s => s.overtrainingRisk?.level === 'high').length
  };

  successResponse(res, { students: progressList, summary }, '获取学员进展成功');
});

module.exports = {
  createCoach,
  getCoaches,
  getCoachById,
  updateCoach,
  deleteCoach,
  getCoachStudents,
  getCoachStudentsProgress
};
