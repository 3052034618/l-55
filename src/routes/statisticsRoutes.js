const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');

router.get('/student/:studentId/progress', statisticsController.getStudentProgress);
router.get('/student/:studentId/monthly-report', statisticsController.getMonthlyReport);
router.get('/coach/:coachId/overview', statisticsController.getCoachOverview);

module.exports = router;
