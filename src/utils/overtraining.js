const TrainingFeedback = require('../models/TrainingFeedback');
const TrainingSession = require('../models/TrainingSession');
const dayjs = require('dayjs');

const assessOvertrainingRisk = async (studentId) => {
  const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();
  const fourteenDaysAgo = dayjs().subtract(14, 'day').toDate();
  const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();

  const [recentFeedbacks, recentSessions, allRecentSessions] = await Promise.all([
    TrainingFeedback.find({ studentId, date: { $gte: thirtyDaysAgo } }).sort({ date: -1 }),
    TrainingSession.find({
      studentId,
      scheduledDate: { $gte: sevenDaysAgo }
    }).sort({ scheduledDate: -1 }),
    TrainingSession.find({
      studentId,
      scheduledDate: { $gte: fourteenDaysAgo }
    }).sort({ scheduledDate: -1 })
  ]);

  const dimensions = {
    consecutiveTraining: { score: 0, maxScore: 25, detail: null },
    recentFatigue: { score: 0, maxScore: 25, detail: null },
    skippedSessions: { score: 0, maxScore: 15, detail: null },
    sleepQuality: { score: 0, maxScore: 15, detail: null },
    muscleSoreness: { score: 0, maxScore: 20, detail: null }
  };

  const factors = [];
  let riskScore = 0;

  const completedRecent = recentSessions.filter(s => s.status === 'completed');
  if (completedRecent.length >= 6) {
    const pts = 25;
    dimensions.consecutiveTraining.score = pts;
    dimensions.consecutiveTraining.detail = `近7天完成${completedRecent.length}次训练，频率过高`;
    riskScore += pts;
    factors.push(`近7天完成训练${completedRecent.length}次，频率过高`);
  } else if (completedRecent.length >= 5) {
    const pts = 18;
    dimensions.consecutiveTraining.score = pts;
    dimensions.consecutiveTraining.detail = `近7天完成${completedRecent.length}次训练，频率偏高`;
    riskScore += pts;
    factors.push(`近7天完成训练${completedRecent.length}次，频率偏高`);
  } else if (completedRecent.length >= 4) {
    const pts = 8;
    dimensions.consecutiveTraining.score = pts;
    dimensions.consecutiveTraining.detail = `近7天完成${completedRecent.length}次训练`;
    riskScore += pts;
  } else {
    dimensions.consecutiveTraining.detail = `近7天完成${completedRecent.length}次训练，频率正常`;
  }

  const consecutiveDays = calculateConsecutiveTrainingDays(allRecentSessions);
  if (consecutiveDays >= 5) {
    const extraPts = 20;
    riskScore = Math.min(riskScore + extraPts, 100);
    dimensions.consecutiveTraining.score = Math.min(dimensions.consecutiveTraining.score + extraPts, dimensions.consecutiveTraining.maxScore);
    factors.push(`已连续训练${consecutiveDays}天无休息日`);
    dimensions.consecutiveTraining.detail += `；连续训练${consecutiveDays}天无休息`;
  } else if (consecutiveDays >= 3) {
    const extraPts = 8;
    riskScore = Math.min(riskScore + extraPts, 100);
    dimensions.consecutiveTraining.score = Math.min(dimensions.consecutiveTraining.score + extraPts, dimensions.consecutiveTraining.maxScore);
    dimensions.consecutiveTraining.detail += `；连续训练${consecutiveDays}天`;
  }

  const recentFatigueLevels = recentFeedbacks.slice(0, 5).map(f => f.fatigueLevel).filter(Boolean);
  if (recentFatigueLevels.length > 0) {
    const avgFatigue = recentFatigueLevels.reduce((a, b) => a + b, 0) / recentFatigueLevels.length;
    if (avgFatigue >= 8) {
      const pts = 25;
      dimensions.recentFatigue.score = pts;
      dimensions.recentFatigue.detail = `近期平均疲劳度${avgFatigue.toFixed(1)}，非常高`;
      riskScore += pts;
      factors.push(`近期平均疲劳度${avgFatigue.toFixed(1)}，非常高`);
    } else if (avgFatigue >= 6) {
      const pts = 16;
      dimensions.recentFatigue.score = pts;
      dimensions.recentFatigue.detail = `近期平均疲劳度${avgFatigue.toFixed(1)}，偏高`;
      riskScore += pts;
      factors.push(`近期平均疲劳度${avgFatigue.toFixed(1)}，偏高`);
    } else if (avgFatigue >= 4) {
      const pts = 6;
      dimensions.recentFatigue.score = pts;
      dimensions.recentFatigue.detail = `近期平均疲劳度${avgFatigue.toFixed(1)}，适中`;
      riskScore += pts;
    } else {
      dimensions.recentFatigue.detail = `近期平均疲劳度${avgFatigue.toFixed(1)}，恢复良好`;
    }
  } else {
    dimensions.recentFatigue.detail = '暂无疲劳数据';
  }

  const recentSkipped = allRecentSessions.filter(s => s.status === 'skipped');
  const recentScheduled = allRecentSessions.filter(s => s.status === 'scheduled' || s.status === 'completed' || s.status === 'skipped');
  if (recentSkipped.length >= 3) {
    const pts = 15;
    dimensions.skippedSessions.score = pts;
    dimensions.skippedSessions.detail = `近14天跳过${recentSkipped.length}次训练，可能因疲劳回避训练`;
    riskScore += pts;
    factors.push(`近14天跳过${recentSkipped.length}次训练，可能因疲劳回避`);
  } else if (recentSkipped.length >= 2) {
    const pts = 8;
    dimensions.skippedSessions.score = pts;
    dimensions.skippedSessions.detail = `近14天跳过${recentSkipped.length}次训练`;
    riskScore += pts;
    factors.push(`近14天跳过${recentSkipped.length}次训练`);
  } else {
    dimensions.skippedSessions.detail = recentSkipped.length === 0
      ? '近14天未跳过训练'
      : `近14天跳过${recentSkipped.length}次训练`;
  }

  const recentSleep = recentFeedbacks.slice(0, 5)
    .map(f => f.sleepQuality)
    .filter(s => s !== undefined && s !== null && s > 0);
  if (recentSleep.length > 0) {
    const avgSleep = recentSleep.reduce((a, b) => a + b, 0) / recentSleep.length;
    if (avgSleep <= 2) {
      const pts = 15;
      dimensions.sleepQuality.score = pts;
      dimensions.sleepQuality.detail = `近期平均睡眠质量${avgSleep.toFixed(1)}(5分制)，较差`;
      riskScore += pts;
      factors.push('近期睡眠质量较差，影响恢复');
    } else if (avgSleep <= 3) {
      const pts = 7;
      dimensions.sleepQuality.score = pts;
      dimensions.sleepQuality.detail = `近期平均睡眠质量${avgSleep.toFixed(1)}(5分制)，一般`;
      riskScore += pts;
    } else {
      dimensions.sleepQuality.detail = `近期平均睡眠质量${avgSleep.toFixed(1)}(5分制)，良好`;
    }
  } else {
    dimensions.sleepQuality.detail = '暂无睡眠质量数据';
  }

  const recentSoreness = recentFeedbacks.slice(0, 5).map(f => f.muscleSoreness).filter(Boolean);
  if (recentSoreness.length > 0) {
    const avgSoreness = recentSoreness.reduce((a, b) => a + b, 0) / recentSoreness.length;
    if (avgSoreness >= 7) {
      const pts = 20;
      dimensions.muscleSoreness.score = pts;
      dimensions.muscleSoreness.detail = `近期平均肌肉酸痛${avgSoreness.toFixed(1)}(10分制)，较高`;
      riskScore += pts;
      factors.push('近期肌肉酸痛程度持续较高');
    } else if (avgSoreness >= 5) {
      const pts = 10;
      dimensions.muscleSoreness.score = pts;
      dimensions.muscleSoreness.detail = `近期平均肌肉酸痛${avgSoreness.toFixed(1)}(10分制)，中等`;
      riskScore += pts;
      factors.push('近期肌肉酸痛程度中等');
    } else {
      dimensions.muscleSoreness.detail = `近期平均肌肉酸痛${avgSoreness.toFixed(1)}(10分制)，正常`;
    }
  } else {
    dimensions.muscleSoreness.detail = '暂无酸痛数据';
  }

  riskScore = Math.min(riskScore, 100);

  let riskLevel;
  if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  const recommendations = generateRecommendations(riskLevel, riskScore, factors, dimensions);

  const sessionAdvice = generateSessionAdvice(riskLevel, riskScore, dimensions);

  return {
    level: riskLevel,
    score: riskScore,
    factors,
    dimensions,
    recommendations,
    sessionAdvice,
    lastAssessed: new Date()
  };
};

const calculateConsecutiveTrainingDays = (sessions) => {
  const completedSessions = sessions.filter(s => s.status === 'completed');
  if (completedSessions.length === 0) return 0;

  const sessionDates = new Set(
    completedSessions.map(s => dayjs(s.scheduledDate).format('YYYY-MM-DD'))
  );

  let consecutive = 0;
  let current = dayjs();

  while (sessionDates.has(current.format('YYYY-MM-DD'))) {
    consecutive++;
    current = current.subtract(1, 'day');
  }

  return consecutive;
};

const generateRecommendations = (riskLevel, riskScore, factors, dimensions) => {
  const recommendations = [];

  if (riskLevel === 'high') {
    recommendations.push('⚠️ 过度训练风险较高，建议立即安排1-2天完全休息');
    if (dimensions.consecutiveTraining.score >= 15) {
      recommendations.push('训练频率过高，建议减少每周训练次数至3-4次');
    }
    if (dimensions.recentFatigue.score >= 15) {
      recommendations.push('疲劳度持续偏高，训练强度需大幅降低');
    }
    if (dimensions.sleepQuality.score >= 10) {
      recommendations.push('睡眠质量差是过度训练的重要信号，请优先改善睡眠');
    }
    recommendations.push('建议与教练沟通，重新评估训练计划');
  } else if (riskLevel === 'medium') {
    recommendations.push('过度训练风险中等，建议安排1天主动恢复日');
    if (dimensions.consecutiveTraining.score >= 10) {
      recommendations.push('注意训练间隔，避免连续多天高强度训练');
    }
    if (dimensions.recentFatigue.score >= 10) {
      recommendations.push('关注疲劳信号，可适当降低单次训练强度');
    }
    if (dimensions.muscleSoreness.score >= 10) {
      recommendations.push('肌肉酸痛偏重，训练后增加拉伸和放松时间');
    }
  } else {
    recommendations.push('训练状态良好，继续保持当前节奏');
    if (dimensions.muscleSoreness.detail?.includes('中等')) {
      recommendations.push('肌肉酸痛轻微偏高，注意训练后放松');
    }
  }

  if (dimensions.sleepQuality.score > 0 && dimensions.sleepQuality.score < 7) {
    recommendations.push('建议保证每晚7-8小时睡眠，有助于训练恢复');
  }

  return [...new Set(recommendations)];
};

const generateSessionAdvice = (riskLevel, riskScore, dimensions) => {
  const advice = {
    shouldRest: false,
    shouldReduceIntensity: false,
    suggestedIntensity: null,
    suggestedAction: 'proceed',
    reason: ''
  };

  if (riskLevel === 'high') {
    advice.shouldRest = true;
    advice.shouldReduceIntensity = true;
    advice.suggestedIntensity = 'low';
    advice.suggestedAction = 'rest';
    advice.reason = '过度训练风险较高，建议今日休息或仅做轻度恢复活动';

    if (dimensions.consecutiveTraining.score >= 20 && dimensions.recentFatigue.score >= 15) {
      advice.reason = '连续高频训练且疲劳度高，强烈建议今日完全休息';
    }
  } else if (riskLevel === 'medium') {
    advice.shouldReduceIntensity = true;
    advice.suggestedIntensity = 'low';
    advice.suggestedAction = 'reduce';
    advice.reason = '过度训练风险中等，建议降低本次训练强度';

    if (dimensions.recentFatigue.score >= 15 || dimensions.muscleSoreness.score >= 15) {
      advice.suggestedIntensity = 'low';
      advice.reason = '疲劳度或酸痛偏高，建议本次训练降低强度，以恢复为主';
    } else if (dimensions.sleepQuality.score >= 10) {
      advice.reason = '睡眠质量不佳影响恢复，建议降低训练强度';
    }
  } else {
    advice.suggestedAction = 'proceed';
    advice.reason = '训练状态良好，可按计划进行训练';
  }

  return advice;
};

module.exports = { assessOvertrainingRisk };
