const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.post('/', studentController.createStudent);
router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

router.put('/:id/goals', studentController.setTrainingGoals);
router.put('/:id/available-time', studentController.setAvailableTime);
router.post('/:id/injuries', studentController.addInjury);

module.exports = router;
