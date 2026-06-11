const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');

router.post('/', assessmentController.createAssessment);
router.get('/', assessmentController.getAssessments);

router.get('/student/:studentId/trend', assessmentController.getStudentAssessmentTrend);

router.get('/:id', assessmentController.getAssessmentById);
router.put('/:id', assessmentController.updateAssessment);
router.delete('/:id', assessmentController.deleteAssessment);
router.post('/:id/items', assessmentController.addAssessmentItem);

module.exports = router;
