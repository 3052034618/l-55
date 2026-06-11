const Assessment = require('../models/Assessment');
const Student = require('../models/Student');
const { successResponse, AppError, asyncHandler } = require('../utils/response');
const { paginate } = require('../utils/pagination');

const createAssessment = asyncHandler(async (req, res) => {
  const { studentId } = req.body;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }

  const assessment = new Assessment(req.body);

  if (assessment.items && assessment.items.length > 0) {
    const scores = assessment.items.map(item => item.score).filter(s => s !== undefined && s !== null);
    if (scores.length > 0) {
      assessment.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    const strengthItems = assessment.items.filter(i => i.category === 'strength' && i.score !== undefined);
    const enduranceItems = assessment.items.filter(i => i.category === 'endurance' && i.score !== undefined);
    const flexibilityItems = assessment.items.filter(i => i.category === 'flexibility' && i.score !== undefined);
    const bodyCompItems = assessment.items.filter(i => i.category === 'body_composition' && i.score !== undefined);

    if (strengthItems.length > 0) {
      assessment.strengthScore = Math.round(strengthItems.reduce((a, b) => a + b.score, 0) / strengthItems.length);
    }
    if (enduranceItems.length > 0) {
      assessment.enduranceScore = Math.round(enduranceItems.reduce((a, b) => a + b.score, 0) / enduranceItems.length);
    }
    if (flexibilityItems.length > 0) {
      assessment.flexibilityScore = Math.round(flexibilityItems.reduce((a, b) => a + b.score, 0) / flexibilityItems.length);
    }
    if (bodyCompItems.length > 0) {
      assessment.bodyCompositionScore = Math.round(bodyCompItems.reduce((a, b) => a + b.score, 0) / bodyCompItems.length);
    }
  }

  await assessment.save();

  if (assessment.bodyMetrics && assessment.bodyMetrics.weight) {
    student.weight = assessment.bodyMetrics.weight;
    await student.save();
  }

  successResponse(res, assessment, '评估记录创建成功', 201);
});

const getAssessments = asyncHandler(async (req, res) => {
  const { page, limit, studentId, coachId, type, startDate, endDate } = req.query;
  const query = {};

  if (studentId) query.studentId = studentId;
  if (coachId) query.coachId = coachId;
  if (type) query.type = type;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const result = await paginate(Assessment, query, {
    page,
    limit,
    sort: { date: -1 },
    populate: 'studentId coachId'
  });

  successResponse(res, result, '获取评估列表成功');
});

const getAssessmentById = asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id)
    .populate('studentId')
    .populate('coachId');

  if (!assessment) {
    throw new AppError('评估记录不存在', 404, 'ASSESSMENT_NOT_FOUND');
  }

  successResponse(res, assessment, '获取评估详情成功');
});

const updateAssessment = asyncHandler(async (req, res) => {
  const assessment = await Assessment.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!assessment) {
    throw new AppError('评估记录不存在', 404, 'ASSESSMENT_NOT_FOUND');
  }

  successResponse(res, assessment, '评估记录更新成功');
});

const deleteAssessment = asyncHandler(async (req, res) => {
  const assessment = await Assessment.findByIdAndDelete(req.params.id);
  if (!assessment) {
    throw new AppError('评估记录不存在', 404, 'ASSESSMENT_NOT_FOUND');
  }
  successResponse(res, null, '评估记录删除成功');
});

const getStudentAssessmentTrend = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { limit = 10 } = req.query;

  const assessments = await Assessment.find({ studentId })
    .sort({ date: -1 })
    .limit(parseInt(limit))
    .select('date overallScore strengthScore enduranceScore flexibilityScore bodyCompositionScore type');

  const chronological = [...assessments].reverse();

  const trend = {
    dates: chronological.map(a => a.date),
    overallScores: chronological.map(a => a.overallScore),
    strengthScores: chronological.map(a => a.strengthScore),
    enduranceScores: chronological.map(a => a.enduranceScore),
    flexibilityScores: chronological.map(a => a.flexibilityScore)
  };

  let improvement = null;
  if (assessments.length >= 2) {
    const earliest = assessments[assessments.length - 1];
    const latest = assessments[0];
    improvement = {
      overall: (latest.overallScore || 0) - (earliest.overallScore || 0),
      strength: (latest.strengthScore || 0) - (earliest.strengthScore || 0),
      endurance: (latest.enduranceScore || 0) - (earliest.enduranceScore || 0),
      flexibility: (latest.flexibilityScore || 0) - (earliest.flexibilityScore || 0)
    };
  }

  successResponse(res, { trend, improvement, totalCount: assessments.length }, '获取评估趋势成功');
});

const addAssessmentItem = asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) {
    throw new AppError('评估记录不存在', 404, 'ASSESSMENT_NOT_FOUND');
  }

  assessment.items.push(req.body);

  const scores = assessment.items.map(item => item.score).filter(s => s !== undefined && s !== null);
  if (scores.length > 0) {
    assessment.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  await assessment.save();
  successResponse(res, assessment, '测试项目添加成功');
});

module.exports = {
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  getStudentAssessmentTrend,
  addAssessmentItem
};
