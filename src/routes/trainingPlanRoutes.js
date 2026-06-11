const express = require('express');
const router = express.Router();
const trainingPlanController = require('../controllers/trainingPlanController');

router.post('/', trainingPlanController.createTrainingPlan);
router.post('/generate', trainingPlanController.generateWeeklyTrainingPlan);
router.get('/', trainingPlanController.getTrainingPlans);
router.get('/:id', trainingPlanController.getTrainingPlanById);
router.put('/:id', trainingPlanController.updateTrainingPlan);
router.delete('/:id', trainingPlanController.deleteTrainingPlan);

router.put('/:id/activate', trainingPlanController.activatePlan);
router.put('/:id/pause', trainingPlanController.pausePlan);
router.put('/:id/resume', trainingPlanController.resumePlan);
router.put('/:id/intensity', trainingPlanController.adjustPlanIntensity);

module.exports = router;
