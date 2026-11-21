const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/my-skills', optionalAuth, skillController.getMySkills);
router.post('/my-skills', optionalAuth, skillController.addMySkill);
router.delete('/my-skills/:id', optionalAuth, skillController.deleteMySkill);

router.get('/', skillController.getAllSkills);
router.get('/:id', skillController.getSkillById);

module.exports = router;
