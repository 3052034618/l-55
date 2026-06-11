const Student = require('../models/Student');
const { successResponse, AppError, asyncHandler } = require('../utils/response');
const { paginate } = require('../utils/pagination');

const createStudent = asyncHandler(async (req, res) => {
  const student = new Student(req.body);
  await student.save();
  successResponse(res, student, '学员创建成功', 201);
});

const getStudents = asyncHandler(async (req, res) => {
  const { page, limit, coachId, status, level, keyword } = req.query;
  const query = {};

  if (coachId) query.coachId = coachId;
  if (status) query.status = status;
  if (level) query.level = level;
  if (keyword) {
    query.$text = { $search: keyword };
  }

  const result = await paginate(Student, query, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: 'coachId',
    select: '-__v'
  });

  successResponse(res, result, '获取学员列表成功');
});

const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate('coachId');
  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }
  successResponse(res, student, '获取学员详情成功');
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }

  successResponse(res, student, '学员信息更新成功');
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }
  successResponse(res, null, '学员删除成功');
});

const setTrainingGoals = asyncHandler(async (req, res) => {
  const { goals } = req.body;
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { trainingGoals: goals },
    { new: true, runValidators: true }
  );

  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }

  successResponse(res, student.trainingGoals, '训练目标设置成功');
});

const setAvailableTime = asyncHandler(async (req, res) => {
  const { availableDays, availableDuration } = req.body;
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { availableDays, availableDuration },
    { new: true, runValidators: true }
  );

  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }

  successResponse(res, {
    availableDays: student.availableDays,
    availableDuration: student.availableDuration
  }, '可训练时间设置成功');
});

const addInjury = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }

  student.injuries.push(req.body);
  await student.save();

  successResponse(res, student.injuries, '伤病记录添加成功');
});

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  setTrainingGoals,
  setAvailableTime,
  addInjury
};
