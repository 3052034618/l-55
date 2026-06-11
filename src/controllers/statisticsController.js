const Student = require('../models/Student');
const TrainingSession = require('../models/TrainingSession');
const TrainingPlan = require('../models/TrainingPlan');
const TrainingFeedback = require('../models/TrainingFeedback');
const Assessment = require('../models/Assessment');
const { successResponse, AppError, asyncHandler } = require('../utils/response');
const { assessOvertrainingRisk } = require('../utils/overtraining');
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
  const targetMonth = (month !== undefined && month !== null && month !== '')
    ? parseInt(month) - 1
    : dayjs().month();

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

  const avgSleepQuality = feedbacks.length > 0
    ? (() => {
        const withSleep = feedbacks.filter(f => f.sleepQuality !== undefined && f.sleepQuality !== null && f.sleepQuality > 0);
        if (withSleep.length === 0) return 0;
        return withSleep.reduce((sum, f) => sum + f.sleepQuality, 0) / withSleep.length;
      })()
    : 0;

  const avgSoreness = feedbacks.length > 0
    ? feedbacks.reduce((sum, f) => sum + (f.muscleSoreness || 0), 0) / feedbacks.length
    : 0;

  const dailyStats = calculateDailyStats(sessions, monthStart, monthEnd);
  const categoryBreakdown = calculateCategoryBreakdown(completedSessions);

  const goalsProgress = student.trainingGoals?.map(goal => {
    const progress = goal.targetValue && goal.currentValue
      ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
      : null;
    return {
      type: goal.type,
      description: goal.description,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      unit: goal.unit,
      progress,
      status: progress === null ? 'in_progress' : progress >= 100 ? 'achieved' : 'in_progress'
    };
  }) || [];

  const earliestAssessment = assessments.length > 0 ? assessments[0] : null;
  const latestAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;

  let assessmentChanges = null;
  if (earliestAssessment && latestAssessment && earliestAssessment._id.toString() !== latestAssessment._id.toString()) {
    assessmentChanges = {
      overall: (latestAssessment.overallScore || 0) - (earliestAssessment.overallScore || 0),
      strength: (latestAssessment.strengthScore || 0) - (earliestAssessment.strengthScore || 0),
      endurance: (latestAssessment.enduranceScore || 0) - (earliestAssessment.enduranceScore || 0),
      flexibility: (latestAssessment.flexibilityScore || 0) - (earliestAssessment.flexibilityScore || 0)
    };
  }

  const completionInterpretation = generateCompletionInterpretation(completionRate, completedSessions.length, sessions.length);

  const abilitySummary = generateAbilitySummary(assessmentChanges, latestAssessment);

  const fatigueRecoveryAdvice = generateFatigueRecoveryAdvice(avgFatigue, avgSoreness, avgSleepQuality, feedbacks);

  const nextMonthFocus = generateNextMonthFocus(student, assessmentChanges, categoryBreakdown, completionRate, avgFatigue);

  const highlights = generateHighlights(
    completedSessions.length,
    completionRate,
    totalVolume,
    avgFatigue,
    assessmentChanges
  );

  const overtrainingRisk = await assessOvertrainingRisk(studentId);

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  successResponse(res, {
    title: `${student.name} ${targetYear}年${monthNames[targetMonth]}训练成长报告`,
    period: {
      year: targetYear,
      month: targetMonth,
      monthLabel: `${targetYear}年${monthNames[targetMonth]}`,
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
      avgSoreness: Math.round(avgSoreness * 10) / 10,
      avgSleepQuality: Math.round(avgSleepQuality * 10) / 10,
      totalFeedbacks: feedbacks.length,
      totalAssessments: assessments.length
    },
    completionInterpretation,
    abilitySummary,
    fatigueRecoveryAdvice,
    nextMonthFocus,
    dailyStats,
    weeklyBreakdown: calculateWeeklyBreakdown(sessions, monthStart, monthEnd),
    categoryBreakdown,
    assessments: {
      earliest: earliestAssessment,
      latest: latestAssessment,
      changes: assessmentChanges
    },
    goalsProgress,
    highlights,
    overtrainingRisk
  }, '获取月度报告成功');
});

const generateCompletionInterpretation = (rate, completed, total) => {
  let level, description, suggestion;

  if (rate >= 90) {
    level = 'excellent';
    description = `本月训练完成率${rate}%，共完成${completed}次训练，执行力非常出色！`;
    suggestion = '保持当前的训练节奏，可以适当尝试更高强度的训练挑战。';
  } else if (rate >= 75) {
    level = 'good';
    description = `本月训练完成率${rate}%，共完成${completed}次训练，整体表现不错。`;
    suggestion = '尝试减少跳过训练的次数，提高计划的执行力。';
  } else if (rate >= 60) {
    level = 'fair';
    description = `本月训练完成率${rate}%，共完成${completed}次训练，仍有提升空间。`;
    suggestion = '建议评估训练计划是否合理，适当降低难度或减少频率以养成训练习惯。';
  } else if (rate > 0) {
    level = 'needs_improvement';
    description = `本月训练完成率仅${rate}%，共完成${completed}次训练，需要加强训练纪律。`;
    suggestion = '建议与教练沟通，调整训练计划使其更贴合实际时间安排，先保证出勤率。';
  } else {
    level = 'no_data';
    description = '本月暂无训练记录。';
    suggestion = '建议尽快开始规律训练，从低强度开始逐步建立训练习惯。';
  }

  return { level, rate, completed, total, description, suggestion };
};

const generateAbilitySummary = (changes, latestAssessment) => {
  const summary = {
    overall: null,
    dimensions: [],
    narrative: ''
  };

  if (!changes && !latestAssessment) {
    summary.narrative = '本月暂无评估数据，建议安排一次能力评估。';
    return summary;
  }

  if (latestAssessment) {
    summary.overall = {
      score: latestAssessment.overallScore,
      label: getScoreLabel(latestAssessment.overallScore)
    };
  }

  if (changes) {
    const dims = [
      { key: 'strength', name: '力量', change: changes.strength },
      { key: 'endurance', name: '耐力', change: changes.endurance },
      { key: 'flexibility', name: '柔韧性', change: changes.flexibility }
    ];

    summary.dimensions = dims.map(d => ({
      ...d,
      direction: d.change > 0 ? 'up' : d.change < 0 ? 'down' : 'stable',
      label: d.change > 0 ? `提升${d.change}分` : d.change < 0 ? `下降${Math.abs(d.change)}分` : '持平'
    }));

    const improved = dims.filter(d => d.change > 0);
    const declined = dims.filter(d => d.change < 0);

    if (improved.length > 0 && declined.length === 0) {
      summary.narrative = `本月能力全面进步！${improved.map(d => `${d.name}${d.label}`).join('，')}，继续保持！`;
    } else if (improved.length > 0 && declined.length > 0) {
      summary.narrative = `本月${improved.map(d => d.name).join('、')}${improved.length > 1 ? '方面' : ''}有所提升，但${declined.map(d => `${d.name}${d.label}`).join('，')}，需要重点关注。`;
    } else if (declined.length > 0) {
      summary.narrative = `本月${declined.map(d => d.name).join('、')}有所下降，建议调整训练侧重点。`;
    } else {
      summary.narrative = '本月各项能力保持稳定，建议增加训练强度以突破瓶颈。';
    }
  } else {
    summary.narrative = '本月只有一次评估记录，无法对比变化趋势。下月再做评估时将呈现对比。';
  }

  return summary;
};

const getScoreLabel = (score) => {
  if (score >= 90) return '优秀';
  if (score >= 80) return '良好';
  if (score >= 70) return '中等偏上';
  if (score >= 60) return '中等';
  if (score >= 40) return '待提高';
  return '需加强';
};

const generateFatigueRecoveryAdvice = (avgFatigue, avgSoreness, avgSleepQuality, feedbacks) => {
  const advice = {
    status: 'normal',
    fatigueLevel: Math.round(avgFatigue * 10) / 10,
    sorenessLevel: Math.round(avgSoreness * 10) / 10,
    sleepQuality: Math.round(avgSleepQuality * 10) / 10,
    suggestions: [],
    recoveryPlan: []
  };

  if (avgFatigue >= 7) {
    advice.status = 'fatigued';
    advice.suggestions.push('本月平均疲劳度偏高，身体恢复不充分');
    advice.recoveryPlan.push('建议每周至少安排1-2天完全休息日');
    advice.recoveryPlan.push('训练后增加10-15分钟的拉伸和泡沫轴放松');
  } else if (avgFatigue >= 5) {
    advice.status = 'moderate';
    advice.suggestions.push('疲劳度中等，需要注意训练与恢复的平衡');
    advice.recoveryPlan.push('高强度训练后安排低强度恢复日');
  } else {
    advice.suggestions.push('疲劳度较低，身体恢复状态良好');
  }

  if (avgSoreness >= 6) {
    advice.suggestions.push('肌肉酸痛程度偏高，可能训练量过大或恢复不足');
    advice.recoveryPlan.push('增加蛋白质摄入，促进肌肉修复');
    advice.recoveryPlan.push('酸痛部位可进行轻度活动促进血液循环');
  }

  if (avgSleepQuality > 0 && avgSleepQuality < 3) {
    advice.suggestions.push('睡眠质量偏低，影响训练恢复');
    advice.recoveryPlan.push('建议保证每晚7-8小时睡眠');
    advice.recoveryPlan.push('避免睡前高强度运动，可做冥想或轻度拉伸');
  } else if (avgSleepQuality >= 4) {
    advice.suggestions.push('睡眠质量良好，有助于训练恢复');
  }

  const badMoodCount = feedbacks.filter(f => f.mood === 'tired' || f.mood === 'bad').length;
  if (badMoodCount > feedbacks.length * 0.4 && feedbacks.length > 0) {
    advice.suggestions.push('情绪状态不佳的天数较多，可能存在过度训练倾向');
    advice.recoveryPlan.push('建议与教练沟通调整训练节奏');
  }

  if (advice.recoveryPlan.length === 0) {
    advice.recoveryPlan.push('保持当前恢复节奏即可');
    advice.recoveryPlan.push('注意训练后的营养补充和水分摄入');
  }

  return advice;
};

const generateNextMonthFocus = (student, assessmentChanges, categoryBreakdown, completionRate, avgFatigue) => {
  const focus = {
    primary: [],
    secondary: [],
    suggestedIntensity: 'medium',
    suggestedFrequency: student.availableDays?.length || 3,
    rationale: []
  };

  if (student.trainingGoals && student.trainingGoals.length > 0) {
    const goalTypeMap = {
      strength: '力量训练',
      endurance: '耐力训练',
      weight_loss: '有氧燃脂',
      muscle_gain: '增肌训练',
      flexibility: '柔韧性训练',
      skill_improvement: '技能提升',
      health_maintenance: '健康维护'
    };
    student.trainingGoals.forEach(g => {
      if (goalTypeMap[g.type]) {
        focus.primary.push({
          type: g.type,
          name: goalTypeMap[g.type],
          description: g.description
        });
      }
    });
  }

  if (assessmentChanges) {
    const weakAreas = [];
    if (assessmentChanges.strength < 0) weakAreas.push({ area: '力量', change: assessmentChanges.strength });
    if (assessmentChanges.endurance < 0) weakAreas.push({ area: '耐力', change: assessmentChanges.endurance });
    if (assessmentChanges.flexibility < 0) weakAreas.push({ area: '柔韧性', change: assessmentChanges.flexibility });

    weakAreas.forEach(w => {
      focus.secondary.push({
        type: w.area === '力量' ? 'strength' : w.area === '耐力' ? 'endurance' : 'flexibility',
        name: `${w.area}提升`,
        reason: `本月${w.area}下降${Math.abs(w.change)}分`
      });
    });
  }

  if (categoryBreakdown && categoryBreakdown.length > 0) {
    const types = categoryBreakdown.map(c => c.type);
    if (!types.includes('cardio')) {
      focus.secondary.push({ type: 'cardio', name: '有氧训练', reason: '本月缺少有氧训练' });
    }
    if (!types.includes('flexibility')) {
      focus.secondary.push({ type: 'flexibility', name: '柔韧训练', reason: '本月缺少柔韧性训练' });
    }
  }

  if (avgFatigue >= 7) {
    focus.suggestedIntensity = 'low';
    focus.rationale.push('因疲劳度偏高，建议降低训练强度');
  } else if (avgFatigue >= 5) {
    focus.suggestedIntensity = 'low_medium';
    focus.rationale.push('疲劳度中等，建议采用中低强度交替');
  } else if (completionRate >= 85) {
    focus.suggestedIntensity = 'high';
    focus.rationale.push('完成率较高且恢复良好，可以尝试更高强度');
  }

  if (completionRate < 60) {
    focus.suggestedFrequency = Math.max(2, Math.floor((student.availableDays?.length || 3) * 0.7));
    focus.rationale.push('因完成率偏低，建议适当减少训练频次以保证质量');
  }

  if (focus.primary.length === 0) {
    focus.primary.push({ type: 'comprehensive', name: '综合训练', description: '全面提升体能' });
  }

  if (focus.rationale.length === 0) {
    focus.rationale.push('基于当前训练状态和目标，保持均衡训练');
  }

  return focus;
};

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
  } else if (completedCount >= 4) {
    highlights.push(`本月完成${completedCount}次训练，继续加油。`);
  }

  if (completionRate >= 90) {
    highlights.push(`训练完成率达${completionRate}%，执行力很强！`);
  }

  if (totalVolume > 0) {
    highlights.push(`本月总训练量${Math.round(totalVolume)}公斤，继续加油！`);
  }

  if (assessmentChanges) {
    if (assessmentChanges.overall > 0) {
      highlights.push(`综合评分提升${assessmentChanges.overall}分，进步明显！`);
    } else if (assessmentChanges.overall < 0) {
      highlights.push(`综合评分有所波动，下月重点关注弱项训练。`);
    }
  }

  if (avgFatigue > 0 && avgFatigue < 4) {
    highlights.push('平均疲劳度较低，恢复状态良好。');
  }

  if (highlights.length === 0) {
    highlights.push('坚持训练，下个月会更好！');
  }

  return highlights;
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
