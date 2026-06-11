const express = require('express');
const router = express.Router();
const coachController = require('../controllers/coachController');

router.post('/', coachController.createCoach);
router.get('/', coachController.getCoaches);
router.get('/:id', coachController.getCoachById);
router.put('/:id', coachController.updateCoach);
router.delete('/:id', coachController.deleteCoach);

router.get('/:id/students', coachController.getCoachStudents);
router.get('/:id/students/progress', coachController.getCoachStudentsProgress);

module.exports = router;
