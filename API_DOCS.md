# 智慧体育训练计划后端服务 API 文档

## 概述

智慧体育训练计划后端服务，为俱乐部教练系统提供会员训练计划生成与管理能力。

### 基础信息
- **基础路径**: `/api`
- **数据格式**: JSON
- **默认端口**: 3000

### 健康检查
```
GET /api/health
```

---

## 一、学员档案模块

### 1.1 创建学员
```
POST /api/students
```

**请求体**:
```json
{
  "coachId": "教练ID",
  "name": "学员姓名",
  "gender": "male/female/other",
  "age": 28,
  "height": 175,
  "weight": 70,
  "phone": "13800138000",
  "level": "beginner/intermediate/advanced/professional",
  "availableDays": [1, 3, 5],
  "availableDuration": 60
}
```

### 1.2 获取学员列表
```
GET /api/students?page=1&limit=20&coachId=xxx&status=active&level=beginner&keyword=张
```

### 1.3 获取学员详情
```
GET /api/students/:id
```

### 1.4 更新学员信息
```
PUT /api/students/:id
```

### 1.5 删除学员
```
DELETE /api/students/:id
```

### 1.6 设置训练目标
```
PUT /api/students/:id/goals
```

**请求体**:
```json
{
  "goals": [
    {
      "type": "strength",
      "description": "提升卧推重量",
      "targetValue": 100,
      "currentValue": 60,
      "unit": "kg",
      "deadline": "2024-12-31"
    }
  ]
}
```

### 1.7 设置可训练时间
```
PUT /api/students/:id/available-time
```

**请求体**:
```json
{
  "availableDays": [1, 3, 5],
  "availableDuration": 90
}
```

### 1.8 添加伤病记录
```
POST /api/students/:id/injuries
```

---

## 二、教练模块

### 2.1 创建教练
```
POST /api/coaches
```

### 2.2 获取教练列表
```
GET /api/coaches?page=1&limit=20&status=active&specialty=strength
```

### 2.3 获取教练详情
```
GET /api/coaches/:id
```

### 2.4 更新教练信息
```
PUT /api/coaches/:id
```

### 2.5 删除教练
```
DELETE /api/coaches/:id
```

### 2.6 获取教练的学员列表
```
GET /api/coaches/:id/students
```

### 2.7 获取教练学员进展
```
GET /api/coaches/:id/students/progress
```

---

## 三、动作库模块

### 3.1 创建动作
```
POST /api/exercises
```

### 3.2 获取动作列表
```
GET /api/exercises?page=1&limit=20&category=chest&difficulty=beginner&equipment=dumbbell
```

### 3.3 获取动作分类
```
GET /api/exercises/categories
```

### 3.4 获取难度等级
```
GET /api/exercises/difficulties
```

### 3.5 获取动作详情
```
GET /api/exercises/:id
```

### 3.6 更新动作
```
PUT /api/exercises/:id
```

### 3.7 删除动作（软删除）
```
DELETE /api/exercises/:id
```

---

## 四、能力评估模块

### 4.1 创建评估记录
```
POST /api/assessments
```

**请求体**:
```json
{
  "studentId": "学员ID",
  "coachId": "教练ID",
  "type": "initial/periodic/special",
  "date": "2024-01-01",
  "items": [
    {
      "name": "卧推1RM",
      "category": "strength",
      "value": 60,
      "unit": "kg",
      "score": 65,
      "benchmark": 80
    }
  ],
  "bodyMetrics": {
    "weight": 70,
    "bodyFat": 18,
    "muscleMass": 32
  },
  "notes": "评估备注",
  "recommendations": ["建议1", "建议2"]
}
```

### 4.2 获取评估列表
```
GET /api/assessments?studentId=xxx&coachId=xxx&type=periodic
```

### 4.3 获取评估详情
```
GET /api/assessments/:id
```

### 4.4 更新评估
```
PUT /api/assessments/:id
```

### 4.5 删除评估
```
DELETE /api/assessments/:id
```

### 4.6 获取学员评估趋势
```
GET /api/assessments/student/:studentId/trend?limit=10
```

### 4.7 添加测试项目
```
POST /api/assessments/:id/items
```

---

## 五、训练计划模块

### 5.1 创建训练计划
```
POST /api/training-plans
```

### 5.2 生成周训练计划
```
POST /api/training-plans/generate
```

**请求体**:
```json
{
  "studentId": "学员ID",
  "coachId": "教练ID",
  "goalType": "strength/endurance/fat_loss/muscle_gain/rehabilitation/comprehensive",
  "intensity": "low/medium/high",
  "sessionsPerWeek": 3,
  "sessionDuration": 60,
  "startDate": "2024-01-01"
}
```

### 5.3 获取训练计划列表
```
GET /api/training-plans?studentId=xxx&coachId=xxx&status=active
```

### 5.4 获取训练计划详情（含训练单元）
```
GET /api/training-plans/:id
```

### 5.5 更新训练计划
```
PUT /api/training-plans/:id
```

### 5.6 删除训练计划
```
DELETE /api/training-plans/:id
```

### 5.7 激活训练计划
```
PUT /api/training-plans/:id/activate
```

### 5.8 暂停训练计划
```
PUT /api/training-plans/:id/pause
```

**请求体**:
```json
{
  "reason": "暂停原因"
}
```

### 5.9 恢复训练计划
```
PUT /api/training-plans/:id/resume
```

### 5.10 调整计划强度
```
PUT /api/training-plans/:id/intensity
```

**请求体**:
```json
{
  "intensity": "high"
}
```

---

## 六、训练单元模块

### 6.1 创建训练单元
```
POST /api/training-sessions
```

### 6.2 获取训练单元列表
```
GET /api/training-sessions?studentId=xxx&coachId=xxx&planId=xxx&status=completed
```

### 6.3 获取下次训练（推送内容）
```
GET /api/training-sessions/next/:studentId
```

返回下次训练内容及过度训练风险提示。

### 6.4 获取训练单元详情
```
GET /api/training-sessions/:id
```

### 6.5 更新训练单元
```
PUT /api/training-sessions/:id
```

### 6.6 删除训练单元
```
DELETE /api/training-sessions/:id
```

### 6.7 开始训练
```
PUT /api/training-sessions/:id/start
```

### 6.8 完成训练（登记完成情况）
```
PUT /api/training-sessions/:id/complete
```

**请求体**:
```json
{
  "actualDuration": 75,
  "completedExercises": [
    {
      "exerciseId": "动作ID",
      "completedSets": 4,
      "actualWeight": 65,
      "actualReps": 10
    }
  ],
  "notes": "训练感受"
}
```

### 6.9 跳过训练
```
PUT /api/training-sessions/:id/skip
```

### 6.10 调整单次训练强度
```
PUT /api/training-sessions/:id/intensity
```

**请求体**:
```json
{
  "intensity": "high"
}
```

### 6.11 添加动作到训练单元
```
POST /api/training-sessions/:id/exercises
```

### 6.12 从训练单元移除动作
```
DELETE /api/training-sessions/:id/exercises/:exerciseIndex
```

---

## 七、训练反馈模块

### 7.1 提交训练反馈
```
POST /api/training-feedbacks
```

**请求体**:
```json
{
  "sessionId": "训练单元ID",
  "studentId": "学员ID",
 "coachId": "教练ID",
  "overallRating": 4,
  "difficultyRating": 3,
  "fatigueLevel": 6,
  "muscleSoreness": 5,
  "sorenessAreas": ["legs", "back"],
  "mood": "good",
  "sleepQuality": 4,
  "appetite": "good",
  "notes": "训练反馈备注"
}
```

### 7.2 获取反馈列表
```
GET /api/training-feedbacks?studentId=xxx&coachId=xxx&minFatigueLevel=7
```

### 7.3 获取反馈详情
```
GET /api/training-feedbacks/:id
```

### 7.4 更新反馈
```
PUT /api/training-feedbacks/:id
```

### 7.5 删除反馈
```
DELETE /api/training-feedbacks/:id
```

### 7.6 获取学员疲劳趋势
```
GET /api/training-feedbacks/student/:studentId/fatigue-trend?limit=14
```

### 7.7 获取过度训练风险评估
```
GET /api/training-feedbacks/student/:studentId/overtraining-risk
```

### 7.8 添加教练评论
```
PUT /api/training-feedbacks/:id/coach-comment
```

---

## 八、进度统计模块

### 8.1 获取学员进度
```
GET /api/statistics/student/:studentId/progress?startDate=2024-01-01&endDate=2024-01-31
```

返回包含训练次数、完成率、训练量、疲劳度、评估变化等数据。

### 8.2 获取月度成长报告
```
GET /api/statistics/student/:studentId/monthly-report?year=2024&month=0
```

返回完整的月度报告，包括：
- 训练统计摘要
- 每日训练数据
- 周度对比
- 训练类型分布
- 评估成绩变化
- 目标进度
- 亮点总结
- 改进建议
- 过度训练风险

### 8.3 获取教练概览
```
GET /api/statistics/coach/:coachId/overview?period=month
```

返回教练管理的学员整体情况。

---

## 数据模型说明

### 学员状态 (status)
- `active` - 活跃
- `paused` - 暂停
- `inactive` - 不活跃

### 训练水平 (level)
- `beginner` - 初级
- `intermediate` - 中级
- `advanced` - 高级
- `professional` - 专业

### 训练计划状态 (status)
- `draft` - 草稿
- `active` - 进行中
- `paused` - 已暂停
- `completed` - 已完成
- `cancelled` - 已取消

### 训练单元状态 (status)
- `scheduled` - 已安排
- `in_progress` - 进行中
- `completed` - 已完成
- `skipped` - 已跳过
- `cancelled` - 已取消

### 过度训练风险等级
- `low` - 低风险
- `medium` - 中风险
- `high` - 高风险

---

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

### 分页响应
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "docs": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误信息",
  "code": "ERROR_CODE"
}
```
