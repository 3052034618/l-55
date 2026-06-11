const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { connectDB } = require('./config/database');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const coachRoutes = require('./routes/coachRoutes');
const studentRoutes = require('./routes/studentRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const trainingPlanRoutes = require('./routes/trainingPlanRoutes');
const trainingSessionRoutes = require('./routes/trainingSessionRoutes');
const trainingFeedbackRoutes = require('./routes/trainingFeedbackRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '智慧体育训练计划后端服务运行正常',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv
    }
  });
});

app.use('/api/coaches', coachRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/training-plans', trainingPlanRoutes);
app.use('/api/training-sessions', trainingSessionRoutes);
app.use('/api/training-feedbacks', trainingFeedbackRoutes);
app.use('/api/statistics', statisticsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
