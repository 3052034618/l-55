const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');

router.post('/', exerciseController.createExercise);
router.get('/', exerciseController.getExercises);
router.get('/categories', exerciseController.getExerciseCategories);
router.get('/difficulties', exerciseController.getDifficultyLevels);
router.get('/:id', exerciseController.getExerciseById);
router.put('/:id', exerciseController.updateExercise);
router.delete('/:id', exerciseController.deleteExercise);

module.exports = router;
