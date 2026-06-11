const mongoose = require('mongoose');
const Coach = require('../models/Coach');
const Student = require('../models/Student');
const Exercise = require('../models/Exercise');
const Assessment = require('../models/Assessment');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_training');
    console.log('✅ MongoDB 连接成功');

    console.log('🗑️  清理现有数据...');
    await Coach.deleteMany({});
    await Student.deleteMany({});
    await Exercise.deleteMany({});
    await Assessment.deleteMany({});

    console.log('🌱 开始插入种子数据...');

    const coaches = await Coach.insertMany([
      {
        name: '张教练',
        phone: '13800000001',
        email: 'zhang@example.com',
        specialty: 'strength',
        status: 'active',
        bio: '国家一级健身教练，10年教学经验，擅长力量训练和增肌。'
      },
      {
        name: '李教练',
        phone: '13800000002',
        email: 'li@example.com',
        specialty: 'cardio',
        status: 'active',
        bio: '有氧训练专家，马拉松爱好者，擅长减脂和心肺功能提升。'
      },
      {
        name: '王教练',
        phone: '13800000003',
        email: 'wang@example.com',
        specialty: 'comprehensive',
        status: 'active',
        bio: '综合训练教练，擅长为不同水平学员定制训练计划。'
      }
    ]);
    console.log(`✅ 已插入 ${coaches.length} 位教练`);

    const students = await Student.insertMany([
      {
        coachId: coaches[0]._id,
        name: '陈小明',
        gender: 'male',
        age: 28,
        height: 175,
        weight: 70,
        phone: '13900000001',
        level: 'intermediate',
        status: 'active',
        availableDays: [1, 3, 5],
        availableDuration: 90,
        trainingGoals: [
          {
            type: 'muscle_gain',
            description: '增加肌肉量',
            targetValue: 75,
            currentValue: 70,
            unit: 'kg',
            deadline: new Date('2024-12-31')
          },
          {
            type: 'strength',
            description: '提升卧推重量',
            targetValue: 80,
            currentValue: 60,
            unit: 'kg',
            deadline: new Date('2024-12-31')
          }
        ],
        planStatus: 'active'
      },
      {
        coachId: coaches[0]._id,
        name: '刘小红',
        gender: 'female',
        age: 25,
        height: 165,
        weight: 55,
        phone: '13900000002',
        level: 'beginner',
        status: 'active',
        availableDays: [2, 4, 6],
        availableDuration: 60,
        trainingGoals: [
          {
            type: 'weight_loss',
            description: '减脂塑形',
            targetValue: 50,
            currentValue: 55,
            unit: 'kg',
            deadline: new Date('2024-10-01')
          }
        ],
        planStatus: 'active'
      },
      {
        coachId: coaches[1]._id,
        name: '赵大力',
        gender: 'male',
        age: 32,
        height: 180,
        weight: 85,
        phone: '13900000003',
        level: 'advanced',
        status: 'active',
        availableDays: [1, 2, 3, 4, 5],
        availableDuration: 120,
        trainingGoals: [
          {
            type: 'endurance',
            description: '完成全程马拉松',
            targetValue: 42.195,
            currentValue: 21.0975,
            unit: 'km',
            deadline: new Date('2024-11-01')
          }
        ],
        planStatus: 'active',
        overtrainingRisk: {
          level: 'medium',
          factors: ['近7天训练次数偏多'],
          lastAssessed: new Date()
        }
      },
      {
        coachId: coaches[2]._id,
        name: '孙小美',
        gender: 'female',
        age: 30,
        height: 168,
        weight: 60,
        phone: '13900000004',
        level: 'beginner',
        status: 'paused',
        availableDays: [1, 4],
        availableDuration: 45,
        trainingGoals: [
          {
            type: 'health_maintenance',
            description: '保持健康体态',
            unit: '次/周',
            deadline: new Date('2024-12-31')
          }
        ],
        planStatus: 'paused',
        injuries: [
          {
            description: '右膝盖旧伤',
            bodyPart: 'knee',
            severity: 'mild',
            date: new Date('2024-01-15'),
            note: '运动时需注意保护'
          }
        ]
      }
    ]);
    console.log(`✅ 已插入 ${students.length} 位学员`);

    const exercises = await Exercise.insertMany([
      { name: '杠铃卧推', category: 'chest', difficulty: 'intermediate', equipment: ['barbell', 'bench'], muscleGroups: ['chest', 'triceps', 'shoulders'], description: '经典胸部训练动作', tips: ['保持肩胛骨收紧', '下放时控制速度'], defaultSets: 4, defaultReps: 10, defaultDuration: 90, caloriesPerMinute: 9 },
      { name: '哑铃飞鸟', category: 'chest', difficulty: 'beginner', equipment: ['dumbbells', 'bench'], muscleGroups: ['chest'], description: '孤立胸肌训练', tips: ['保持肘部微弯', '感受胸肌拉伸'], defaultSets: 3, defaultReps: 12, defaultDuration: 60, caloriesPerMinute: 6 },
      { name: '引体向上', category: 'back', difficulty: 'advanced', equipment: ['pull_up_bar'], muscleGroups: ['back', 'biceps'], description: '上肢拉力训练', tips: ['全程控制', '避免摆动'], defaultSets: 4, defaultReps: 8, defaultDuration: 90, caloriesPerMinute: 10 },
      { name: '杠铃划船', category: 'back', difficulty: 'intermediate', equipment: ['barbell'], muscleGroups: ['back', 'biceps'], description: '背部厚度训练', tips: ['背部保持平直', '用背阔肌发力'], defaultSets: 4, defaultReps: 12, defaultDuration: 90, caloriesPerMinute: 9 },
      { name: '坐姿划船', category: 'back', difficulty: 'beginner', equipment: ['cable_machine'], muscleGroups: ['back', 'biceps'], description: '背部基础训练', tips: ['收肩胛骨', '挺胸'], defaultSets: 3, defaultReps: 15, defaultDuration: 60, caloriesPerMinute: 7 },
      { name: '杠铃肩推', category: 'shoulders', difficulty: 'intermediate', equipment: ['barbell'], muscleGroups: ['shoulders', 'triceps'], description: '肩部力量训练', tips: ['核心收紧', '不要锁死肘部'], defaultSets: 4, defaultReps: 10, defaultDuration: 90, caloriesPerMinute: 8 },
      { name: '哑铃侧平举', category: 'shoulders', difficulty: 'beginner', equipment: ['dumbbells'], muscleGroups: ['shoulders'], description: '肩部中束训练', tips: ['小重量多次数', '肘部微弯'], defaultSets: 3, defaultReps: 15, defaultDuration: 60, caloriesPerMinute: 5 },
      { name: '杠铃弯举', category: 'arms', difficulty: 'beginner', equipment: ['barbell'], muscleGroups: ['biceps'], description: '二头肌基础训练', tips: ['身体保持稳定', '全程控制'], defaultSets: 3, defaultReps: 12, defaultDuration: 60, caloriesPerMinute: 6 },
      { name: '三头下压', category: 'arms', difficulty: 'beginner', equipment: ['cable_machine'], muscleGroups: ['triceps'], description: '三头肌训练', tips: ['肘部固定', '顶峰收缩'], defaultSets: 3, defaultReps: 15, defaultDuration: 60, caloriesPerMinute: 5 },
      { name: '深蹲', category: 'legs', difficulty: 'intermediate', equipment: ['barbell'], muscleGroups: ['quads', 'glutes', 'hamstrings'], description: '腿部训练之王', tips: ['膝盖不超过脚尖', '保持背部挺直'], defaultSets: 4, defaultReps: 12, defaultDuration: 120, caloriesPerMinute: 12 },
      { name: '硬拉', category: 'legs', difficulty: 'advanced', equipment: ['barbell'], muscleGroups: ['hamstrings', 'glutes', 'back'], description: '全身复合动作', tips: ['保持背部平直', '用腿部发力'], defaultSets: 4, defaultReps: 8, defaultDuration: 120, caloriesPerMinute: 14 },
      { name: '腿举', category: 'legs', difficulty: 'beginner', equipment: ['leg_press_machine'], muscleGroups: ['quads', 'glutes'], description: '腿部基础训练', tips: ['膝盖不锁死', '全脚掌发力'], defaultSets: 3, defaultReps: 15, defaultDuration: 90, caloriesPerMinute: 9 },
      { name: '平板支撑', category: 'core', difficulty: 'beginner', equipment: [], muscleGroups: ['core'], description: '核心稳定训练', tips: ['身体成一条直线', '均匀呼吸'], defaultSets: 3, defaultReps: 1, defaultDuration: 60, caloriesPerMinute: 4 },
      { name: '卷腹', category: 'core', difficulty: 'beginner', equipment: [], muscleGroups: ['abs'], description: '腹肌训练', tips: ['下背部贴地', '用腹部发力'], defaultSets: 3, defaultReps: 20, defaultDuration: 60, caloriesPerMinute: 5 },
      { name: '俄罗斯转体', category: 'core', difficulty: 'intermediate', equipment: [], muscleGroups: ['obliques', 'core'], description: '腹斜肌训练', tips: ['保持背部挺直', '转动躯干'], defaultSets: 3, defaultReps: 30, defaultDuration: 60, caloriesPerMinute: 6 },
      { name: '跑步机慢跑', category: 'cardio', difficulty: 'beginner', equipment: ['treadmill'], muscleGroups: ['legs', 'cardio'], description: '基础有氧训练', tips: ['保持均匀呼吸', '适中强度'], defaultSets: 1, defaultReps: 1, defaultDuration: 1800, caloriesPerMinute: 10 },
      { name: '动感单车', category: 'cardio', difficulty: 'intermediate', equipment: ['stationary_bike'], muscleGroups: ['legs', 'cardio'], description: '有氧间歇训练', tips: ['调整合适阻力', '保持节奏'], defaultSets: 1, defaultReps: 1, defaultDuration: 1800, caloriesPerMinute: 12 },
      { name: '跳绳', category: 'cardio', difficulty: 'intermediate', equipment: ['jump_rope'], muscleGroups: ['cardio', 'legs'], description: '高效燃脂训练', tips: ['前脚掌落地', '保持节奏'], defaultSets: 5, defaultReps: 100, defaultDuration: 120, caloriesPerMinute: 14 },
      { name: '动态拉伸', category: 'warmup', difficulty: 'beginner', equipment: [], muscleGroups: ['fullbody'], description: '训练前热身', tips: ['动作缓慢连贯', '活动各个关节'], defaultSets: 1, defaultReps: 1, defaultDuration: 600, caloriesPerMinute: 3 },
      { name: '静态拉伸', category: 'cooldown', difficulty: 'beginner', equipment: [], muscleGroups: ['fullbody'], description: '训练后放松', tips: ['每个动作保持30秒', '不要弹震'], defaultSets: 1, defaultReps: 1, defaultDuration: 600, caloriesPerMinute: 2 },
      { name: '瑜伽放松', category: 'flexibility', difficulty: 'beginner', equipment: ['yoga_mat'], muscleGroups: ['fullbody'], description: '柔韧性训练', tips: ['配合呼吸', '循序渐进'], defaultSets: 1, defaultReps: 1, defaultDuration: 1800, caloriesPerMinute: 3 },
      { name: 'HIIT训练', category: 'cardio', difficulty: 'advanced', equipment: [], muscleGroups: ['fullbody', 'cardio'], description: '高强度间歇训练', tips: ['全力输出', '充分休息'], defaultSets: 8, defaultReps: 1, defaultDuration: 120, caloriesPerMinute: 15 }
    ]);
    console.log(`✅ 已插入 ${exercises.length} 个动作`);

    const assessments = await Assessment.insertMany([
      {
        studentId: students[0]._id,
        coachId: coaches[0]._id,
        type: 'initial',
        date: new Date('2024-06-01'),
        overallScore: 65,
        strengthScore: 70,
        enduranceScore: 55,
        flexibilityScore: 60,
        bodyCompositionScore: 70,
        bodyMetrics: {
          weight: 70,
          bodyFat: 18,
          muscleMass: 32,
          bmi: 22.9,
          restingHeartRate: 72
        },
        items: [
          { name: '卧推1RM', category: 'strength', value: 60, unit: 'kg', score: 65, benchmark: 80 },
          { name: '深蹲1RM', category: 'strength', value: 80, unit: 'kg', score: 70, benchmark: 100 },
          { name: '引体向上', category: 'strength', value: 8, unit: '次', score: 60, benchmark: 15 },
          { name: '5公里跑', category: 'endurance', value: 28, unit: '分钟', score: 55, benchmark: 22 },
          { name: '坐位体前屈', category: 'flexibility', value: 15, unit: 'cm', score: 60, benchmark: 20 }
        ],
        notes: '体能基础不错，有氧能力有待提升。',
        recommendations: ['增加有氧训练', '逐步提升力量训练强度']
      },
      {
        studentId: students[0]._id,
        coachId: coaches[0]._id,
        type: 'periodic',
        date: new Date('2024-07-01'),
        overallScore: 72,
        strengthScore: 78,
        enduranceScore: 62,
        flexibilityScore: 65,
        bodyCompositionScore: 75,
        bodyMetrics: {
          weight: 72,
          bodyFat: 16,
          muscleMass: 34,
          bmi: 23.5,
          restingHeartRate: 68
        },
        items: [
          { name: '卧推1RM', category: 'strength', value: 70, unit: 'kg', score: 75, benchmark: 80 },
          { name: '深蹲1RM', category: 'strength', value: 90, unit: 'kg', score: 78, benchmark: 100 },
          { name: '引体向上', category: 'strength', value: 10, unit: '次', score: 70, benchmark: 15 },
          { name: '5公里跑', category: 'endurance', value: 25, unit: '分钟', score: 62, benchmark: 22 },
          { name: '坐位体前屈', category: 'flexibility', value: 18, unit: 'cm', score: 65, benchmark: 20 }
        ],
        notes: '一个月训练后各项指标均有提升，继续保持。',
        recommendations: ['增加训练强度', '注意饮食营养']
      }
    ]);
    console.log(`✅ 已插入 ${assessments.length} 条评估记录`);

    console.log('\n🎉 种子数据插入完成！');
    console.log('\n📊 数据统计:');
    console.log(`   教练: ${coaches.length} 位`);
    console.log(`   学员: ${students.length} 位`);
    console.log(`   动作: ${exercises.length} 个`);
    console.log(`   评估记录: ${assessments.length} 条`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 种子数据插入失败:', error);
    process.exit(1);
  }
};

seedData();
