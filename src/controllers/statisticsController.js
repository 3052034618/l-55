const Student = require('../models/Student');
const TrainingSession = require('../models/TrainingSession');
const TrainingPlan = require('../models/TrainingPlan');
const TrainingFeedback = require('../models/TrainingFeedback');
const Assessment = require('../models/Assessment');
const { successResponse, AppError, asyncHandler } = require('../utils/response');
const dayjs = require('dayjs');

const getStudentProgress = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { startDate, endDate } = req.query;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }

  const start = startDate ? dayjs(startDate).toDate() : dayjs().subtract(30, 'day').toDate();
  const end = endDate ? dayjs(endDate).toDate() : dayjs().toDate();

  const [sessions, plans, feedbacks, assessments] = await Promise.all([
    TrainingSession.find({
      studentId,
      scheduledDate: { $gte: start, $lte: end }
    }).sort({ scheduledDate: 1 }),
    TrainingPlan.find({ studentId }),
    TrainingFeedback.find({
      studentId,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 }),
    Assessment.find({ studentId }).sort({ date: -1 }).limit(5)
  ]);

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const skippedSessions = sessions.filter(s => s.status === 'skipped');
  const scheduledSessions = sessions.filter(s => s.status === 'scheduled');

  const totalVolume = completedSessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
  const totalCalories = completedSessions.reduce((sum, s) => sum + (s.estimatedCalories || 0), 0);
  const totalDuration = completedSessions.reduce((sum, s) => sum + (s.actualDuration || s.duration || 0), 0);

  const avgFatigue = feedbacks.length > 0
    ? feedbacks.reduce((sum, f) => sum + (f.fatigueLevel || 0), 0) / feedbacks.length
    : 0;

  const completionRate = sessions.length > 0 && (completedSessions.length + skippedSessions.length > 0)
    ? Math.round((completedSessions.length / (completedSessions.length + skippedSessions.length)) * 100)
    : 0;

  const weeklyStats = calculateWeeklyStats(sessions, start, end);

  const latestAssessment = assessments[0];
  const previousAssessment = assessments[1];

  let assessmentProgress = null;
  if (latestAssessment && previousAssessment) {
    assessmentProgress = {
      overall: (latestAssessment.overallScore || 0) - (previousAssessment.overallScore || 0),
      strength: (latestAssessment.strengthScore || 0) - (previousAssessment.strengthScore || 0),
      endurance: (latestAssessment.enduranceScore || 0) - (previousAssessment.enduranceScore || 0),
      flexibility: (latestAssessment.flexibilityScore || 0) - (previousAssessment.flexibilityScore || 0)
    };
  }

  const activePlan = plans.find(p => p.status === 'active');
  const planProgress = activePlan && activePlan.totalSessions > 0
    ? Math.round((activePlan.completedSessions / activePlan.totalSessions) * 100)
    : 0;

  successResponse(res, {
    summary: {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      skippedSessions: skippedSessions.length,
      scheduledSessions: scheduledSessions.length,
      completionRate,
      totalVolume,
      totalCalories,
      totalDuration,
      avgFatigue: Math.round(avgFatigue * 10) / 10,
      overtrainingRisk: student.overtrainingRisk,
      planProgress
    },
    weeklyStats,
    assessments: {
      latest: latestAssessment,
      previous: previousAssessment,
      progress: assessmentProgress
    },
    goals: student.trainingGoals || [],
    dateRange: { start, end }
  }, '获取学员进度成功');
});

const calculateWeeklyStats = (sessions, start, end) => {
  const weeks = [];
  let current = dayjs(start).startOf('week');
  const endDate = dayjs(end).endOf('week');

  while (current.isBefore(endDate) || current.isSame(endDate, 'week')) {
    const weekStart = current.toDate();
    const weekEnd = current.endOf('week').toDate();

    const weekSessions = sessions.filter(s => {
      const sessionDate = dayjs(s.scheduledDate);
      return sessionDate.isAfter(dayjs(weekStart).subtract(1, 'day')) &&
             sessionDate.isBefore(dayjs(weekEnd).add(1, 'day'));
    });

    const completed = weekSessions.filter(s => s.status === 'completed');
    const totalVolume = completed.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
    const totalDuration = completed.reduce((sum, s) => sum + (s.actualDuration || s.duration || 0), 0);

    weeks.push({
      weekStart,
      weekEnd,
      total: weekSessions.length,
      completed: completed.length,
      skipped: weekSessions.filter(s => s.status === 'skipped').length,
      totalVolume,
      totalDuration
    });

    current = current.add(1, 'week');
  }

  return weeks;
};

const getMonthlyReport = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { year, month } = req.query;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError('学员不存在', 404, 'STUDENT_NOT_FOUND');
  }

  const targetYear = parseInt(year) || dayjs().year();
  const targetMonth = parseInt(month) || dayjs().month();

  const monthStart = dayjs().year(targetYear).month(targetMonth).startOf('month').toDate();
  const monthEnd = dayjs().year(targetYear).month(targetMonth).endOf('month').toDate();

  const [sessions, feedbacks, assessments] = await Promise.all([
    TrainingSession.find({
      studentId,
      scheduledDate: { $gte: monthStart, $lte: monthEnd }
    }).sort({ scheduledDate: 1 }),
    TrainingFeedback.find({
      studentId,
      date: { $gte: monthStart, $lte: monthEnd }
    }).sort({ date: 1 }),
    Assessment.find({
      studentId,
      date: { $gte: monthStart, $lte: monthEnd }
    }).sort({ date: 1 })
  ]);

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const skippedSessions = sessions.filter(s => s.status === 'skipped');

  const totalVolume = completedSessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
  const totalCalories = completedSessions.reduce((sum, s) => sum + (s.estimatedCalories || 0), 0);
  const totalDuration = completedSessions.reduce((sum, s) => sum + (s.actualDuration || s.duration || 0), 0);

  const completionRate = (completedSessions.length + skippedSessions.length) > 0
    ? Math.round((completedSessions.length / (completedSessions.length + skippedSessions.length)) * 100)
    : 0;

  const avgFatigue = feedbacks.length > 0
    ? feedbacks.reduce((sum, f) => sum + (f.fatigueLevel || 0), 0) / feedbacks.length
    : 0;

  const avgRating = feedbacks.length > 0
    ? feedbacks.reduce((sum, f) => sum + (f.overallRating || 0), 0) / feedbacks.length
    : 0;

  const dailyStats = calculateDailyStats(sessions, monthStart, monthEnd);

  const categoryBreakdown = calculateCategoryBreakdown(completedSessions);

  const goalsProgress = student.trainingGoals?.map(goal => ({
    ...goal,
    progress: goal.targetValue && goal.currentValue
      ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
      : null
  })) || [];

  const firstAssessment = assessments[assessments.length - 1];
  const lastAssessment = assessments[0];

  const assessmentChanges = firstAssessment && lastAssessment ? {
    overall: (lastAssessment.overallScore || 0) - (firstAssessment.overallScore || 0),
    strength: (lastAssessment.strengthScore || 0) - (firstAssessment.strengthScore || 0),
    endurance: (lastAssessment.enduranceScore || 0) - (firstAssessment.enduranceScore || 0),
    flexibility: (lastAssessment.flexibilityScore || 0) - (firstAssessment.flexibilityScore || 0)
  } : null;

  const highlights = generateHighlights(
    completedSessions.length,
    completionRate,
    totalVolume,
    avgFatigue,
    assessmentChanges
  );

  const recommendations = generateRecommendations(
    completionRate,
    avgFatigue,
    student.overtrainingRisk,
    categoryBreakdown
  );

  successResponse(res, {
    period: {
      year: targetYear,
      month: targetMonth,
      monthStart,
      monthEnd
    },
    student: {
      id: student._id,
      name: student.name,
      level: student.level
    },
    summary: {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      skippedSessions: skippedSessions.length,
      completionRate,
      totalVolume,
      totalCalories,
      totalDuration,
      avgFatigue: Math.round(avgFatigue * 10) / 10,
      avgRating: Math.round(avgRating * 10) / 10,
      totalFeedbacks: feedbacks.length,
      totalAssessments: assessments.length
    },
    dailyStats,
    weeklyBreakdown: calculateWeeklyBreakdown(sessions, monthStart, monthEnd),
    categoryBreakdown,
    assessments: {
      first: firstAssessment,
      last: lastAssessment,
      changes: assessmentChanges
    },
    goalsProgress,
    highlights,
    recommendations,
    overtrainingRisk: student.overtrainingRisk
  }, '获取月度报告成功');
});

const calculateDailyStats = (sessions, monthStart, monthEnd) => {
  const days = [];
  let current = dayjs(monthStart);
  const end = dayjs(monthEnd);

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dateStr = current.format('YYYY-MM-DD');
    const daySessions = sessions.filter(s =>
      dayjs(s.scheduledDate).format('YYYY-MM-DD') === dateStr
    );

    days.push({
      date: current.toDate(),
      dayOfWeek: current.day(),
      total: daySessions.length,
      completed: daySessions.filter(s => s.status === 'completed').length,
      volume: daySessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0)
    });

    current = current.add(1, 'day');
  }

  return days;
};

const calculateWeeklyBreakdown = (sessions, monthStart, monthEnd) => {
  const weeks = [];
  let current = dayjs(monthStart).startOf('week');
  const end = dayjs(monthEnd).endOf('week');

  while (current.isBefore(end) || current.isSame(end, 'week')) {
    const weekStart = current.toDate();
    const weekEnd = current.endOf('week').toDate();

    const weekSessions = sessions.filter(s => {
      const d = dayjs(s.scheduledDate);
      return d.isAfter(dayjs(weekStart).subtract(1, 'day')) &&
             d.isBefore(dayjs(weekEnd).add(1, 'day'));
    });

    weeks.push({
      weekNumber: current.week(),
      weekStart,
      weekEnd,
      total: weekSessions.length,
      completed: weekSessions.filter(s => s.status === 'completed').length,
      totalVolume: weekSessions
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + (s.totalVolume || 0), 0)
    });

    current = current.add(1, 'week');
  }

  return weeks;
};

const calculateCategoryBreakdown = (sessions) => {
  const breakdown = {};

  sessions.forEach(session => {
    const type = session.type || 'other';
    if (!breakdown[type]) {
      breakdown[type] = { count: 0, totalVolume: 0, totalDuration: 0 };
    }
    breakdown[type].count++;
    breakdown[type].totalVolume += session.totalVolume || 0;
    breakdown[type].totalDuration += session.actualDuration || session.duration || 0;
  });

  return Object.entries(breakdown).map(([type, data]) => ({
    type,
    ...data
  }));
};

const generateHighlights = (completedCount, completionRate, totalVolume, avgFatigue, assessmentChanges) => {
  const highlights = [];

  if (completedCount >= 12) {
    highlights.push(`本月完成${completedCount}次训练，训练频率优秀！`);
  } else if (completedCount >= 8) {
    highlights.push(`本月完成${completedCount}次训练，保持得不错。`);
  }

  if (completionRate >= 90) {
    highlights.push(`训练完成率达${completionRate}%，执行力很强！`);
  }

  if (totalVolume > 0) {
    highlights.push(`本月总训练量${Math.round(totalVolume)}公斤，继续加油！`);
  }

  if (assessmentChanges && assessmentChanges.overall > 0) {
    highlights.push(`综合评分提升${assessmentChanges.overall}分，进步明显！`);
  }

  if (avgFatigue > 0 && avgFatigue < 4) {
    highlights.push('平均疲劳度较低，恢复状态良好。');
  }

  if (highlights.length === 0) {
    highlights.push('坚持训练，下个月会更好！');
  }

  return highlights;
};

const generateRecommendations = (completionRate, avgFatigue, overtrainingRisk, categoryBreakdown) => {
  const recommendations = [];

  if (completionRate < 60) {
    recommendations.push('建议提高训练完成率，尽量按计划进行训练。');
    recommendations.push('可以适当降低训练难度，逐步养成训练习惯。');
  }

  if (avgFatigue >= 7) {
    recommendations.push('平均疲劳度偏高，建议增加休息日，注意恢复。');
    recommendations.push('检查睡眠质量和营养摄入，确保充足恢复。');
  }

  if (overtrainingRisk?.level === 'high') {
    recommendations.push('⚠️ 过度训练风险较高，建议立即安排休息。');
    recommendations.push('降低下周训练强度，增加恢复性训练比例。');
  } else if (overtrainingRisk?.level === 'medium') {
    recommendations.push('注意身体信号，适度调整训练强度。');
  }

  if (categoryBreakdown && categoryBreakdown.length > 0) {
    const hasCardio = categoryBreakdown.some(c => c.type === 'cardio');
    const hasStrength = categoryBreakdown.some(c => c.type === 'strength');

    if (!hasCardio && hasStrength) {
      recommendations.push('建议增加有氧训练，提升心肺功能。');
    }
    if (!hasStrength && hasCardio) {
      recommendations.push('建议增加力量训练，提升肌肉力量。');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('训练状态良好，继续保持当前节奏。');
  }

  return recommendations;
};

const getCoachOverview = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  const { period = 'month' } = req.query;

  const students = await Student.find({ coachId });

  const startDate = period === 'week'
    ? dayjs().startOf('week').toDate()
    : dayjs().startOf('month').toDate();
  const endDate = period === 'week'
    ? dayjs().endOf('week').toDate()
    : dayjs().endOf('month').toDate();

  const sessions = await TrainingSession.find({
    coachId,
    scheduledDate: { $gte: startDate, $lte: endDate }
  });

  const feedbacks = await TrainingFeedback.find({
    coachId,
    date: { $gte: startDate, $lte: endDate }
  });

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const highRiskStudents = students.filter(s => s.overtrainingRisk?.level === 'high');

  const planStats = {
    total: students.filter(s => s.planStatus !== 'none').length,
    active: students.filter(s => s.planStatus === 'active').length,
    paused: students.filter(s => s.planStatus === 'paused').length
  };

  const studentProgress = [];
  for (const student of students.slice(0, 20)) {
    const studentSessions = sessions.filter(s => s.studentId.toString() === student._id.toString());
    const completed = studentSessions.filter(s => s.status === 'completed').length;

    studentProgress.push({
      studentId: student._id,
      name: student.name,
      level: student.level,
      status: student.status,
      planStatus: student.planStatus,
      overtrainingRisk: student.overtrainingRisk,
      sessionCount: studentSessions.length,
      completedCount: completed
    });
  }

  successResponse(res, {
    period,
    dateRange: { start: startDate, end: endDate },
    summary: {
      totalStudents: students.length,
      activeStudents: students.filter(s => s.status === 'active').length,
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      completionRate: sessions.length > 0
        ? Math.round((completedSessions.length / sessions.length) * 100)
        : 0,
      totalFeedbacks: feedbacks.length,
      highRiskStudents: highRiskStudents.length,
      planStats
    },
    studentProgress,
    recentSessions: sessions.slice(0, 10)
  }, '获取教练概览成功');
});

module.exports = {
  getStudentProgress,
  getMonthlyReport,
  getCoachOverview
};
