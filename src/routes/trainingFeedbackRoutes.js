const express = require('express');
const router = express.Router();
const trainingFeedbackController = require('../controllers/trainingFeedbackController');

router.post('/', trainingFeedbackController.createFeedback);
router.get('/', trainingFeedbackController.getFeedbacks);

router.get('/student/:studentId/fatigue-trend', trainingFeedbackController.getStudentFatigueTrend);
router.get('/student/:studentId/overtraining-risk', trainingFeedbackController.getOvertrainingRisk);

router.get('/:id', trainingFeedbackController.getFeedbackById);
router.put('/:id', trainingFeedbackController.updateFeedback);
router.delete('/:id', trainingFeedbackController.deleteFeedback);
router.put('/:id/coach-comment', trainingFeedbackController.addCoachComment);

module.exports = router;
