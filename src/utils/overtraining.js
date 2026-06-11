const TrainingFeedback = require('../models/TrainingFeedback');
const TrainingSession = require('../models/TrainingSession');
const dayjs = require('dayjs');

const assessOvertrainingRisk = async (studentId) => {
  const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();
  const fourteenDaysAgo = dayjs().subtract(14, 'day').toDate();

  const [recentFeedbacks, recentSessions] = await Promise.all([
    TrainingFeedback.find({ studentId, date: { $gte: fourteenDaysAgo } }).sort({ date: -1 }),
    TrainingSession.find({
      studentId,
      status: 'completed',
      scheduledDate: { $gte: sevenDaysAgo }
    }).sort({ scheduledDate: -1 })
  ]);

  const factors = [];
  let riskLevel = 'low';
  let riskScore = 0;

  if (recentSessions.length >= 6) {
    riskScore += 30;
    factors.push('近7天训练次数过多');
  } else if (recentSessions.length >= 5) {
    riskScore += 20;
    factors.push('近7天训练次数偏多');
  }

  const consecutiveDays = calculateConsecutiveTrainingDays(recentSessions);
  if (consecutiveDays >= 5) {
    riskScore += 25;
    factors.push(`连续训练${consecutiveDays}天，未安排休息`);
  } else if (consecutiveDays >= 3) {
    riskScore += 10;
  }

  const recentFatigue = recentFeedbacks.slice(0, 3).map(f => f.fatigueLevel).filter(Boolean);
  if (recentFatigue.length > 0) {
    const avgFatigue = recentFatigue.reduce((a, b) => a + b, 0) / recentFatigue.length;
    if (avgFatigue >= 8) {
      riskScore += 25;
      factors.push('近期疲劳程度持续偏高');
    } else if (avgFatigue >= 6) {
      riskScore += 15;
      factors.push('近期疲劳程度偏高');
    }
  }

  const recentSoreness = recentFeedbacks.slice(0, 3).map(f => f.muscleSoreness).filter(Boolean);
  if (recentSoreness.length > 0) {
    const avgSoreness = recentSoreness.reduce((a, b) => a + b, 0) / recentSoreness.length;
    if (avgSoreness >= 7) {
      riskScore += 15;
      factors.push('肌肉酸痛程度较高');
    }
  }

  const moodTrend = analyzeMoodTrend(recentFeedbacks);
  if (moodTrend === 'declining') {
    riskScore += 10;
    factors.push('情绪状态呈下降趋势');
  }

  if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'medium';
  }

  const recommendations = generateRecommendations(riskLevel, factors);

  return {
    level: riskLevel,
    score: riskScore,
    factors,
    recommendations,
    lastAssessed: new Date()
  };
};

const calculateConsecutiveTrainingDays = (sessions) => {
  if (sessions.length === 0) return 0;

  const sessionDates = new Set(
    sessions.map(s => dayjs(s.scheduledDate).format('YYYY-MM-DD'))
  );

  let consecutive = 0;
  let current = dayjs();

  while (sessionDates.has(current.format('YYYY-MM-DD'))) {
    consecutive++;
    current = current.subtract(1, 'day');
  }

  return consecutive;
};

const analyzeMoodTrend = (feedbacks) => {
  const moodValues = { great: 5, good: 4, normal: 3, tired: 2, bad: 1 };
  const recentMoods = feedbacks.slice(0, 5)
    .filter(f => f.mood)
    .map(f => moodValues[f.mood] || 3);

  if (recentMoods.length < 3) return 'stable';

  const firstHalf = recentMoods.slice(0, Math.floor(recentMoods.length / 2));
  const secondHalf = recentMoods.slice(Math.floor(recentMoods.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (secondAvg - firstAvg <= -0.8) return 'declining';
  if (secondAvg - firstAvg >= 0.8) return 'improving';
  return 'stable';
};

const generateRecommendations = (riskLevel, factors) => {
  const recommendations = [];

  if (riskLevel === 'high') {
    recommendations.push('建议立即安排1-2天的完全休息');
    recommendations.push('降低下一周的训练强度和容量');
    recommendations.push('增加拉伸和恢复性训练的比例');
    recommendations.push('注意补充营养和保证充足睡眠');
    recommendations.push('建议与教练沟通调整训练计划');
  } else if (riskLevel === 'medium') {
    recommendations.push('建议安排1天的主动恢复日');
    recommendations.push('适当降低训练强度，注意身体信号');
    recommendations.push('保证充足的睡眠和水分摄入');
  } else {
    recommendations.push('训练状态良好，继续保持');
    recommendations.push('注意训练后的拉伸和恢复');
  }

  if (factors.some(f => f.includes('疲劳'))) {
    recommendations.push('关注身体疲劳信号，必要时调整训练量');
  }

  return [...new Set(recommendations)];
};

module.exports = { assessOvertrainingRisk };
