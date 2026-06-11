const express = require('express');
const router = express.Router();
const trainingSessionController = require('../controllers/trainingSessionController');

router.post('/', trainingSessionController.createSession);
router.get('/', trainingSessionController.getSessions);
router.get('/next/:studentId', trainingSessionController.getNextSession);
router.get('/:id', trainingSessionController.getSessionById);
router.put('/:id', trainingSessionController.updateSession);
router.delete('/:id', trainingSessionController.deleteSession);

router.put('/:id/start', trainingSessionController.startSession);
router.put('/:id/complete', trainingSessionController.completeSession);
router.put('/:id/skip', trainingSessionController.skipSession);
router.put('/:id/intensity', trainingSessionController.adjustSessionIntensityLevel);

router.post('/:id/exercises', trainingSessionController.addExerciseToSession);
router.delete('/:id/exercises/:exerciseIndex', trainingSessionController.removeExerciseFromSession);

module.exports = router;
