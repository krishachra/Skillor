const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, sessionController.getSessions);
router.post('/', optionalAuth, sessionController.createSession);
router.put('/:id', optionalAuth, sessionController.updateSession);
router.delete('/:id', optionalAuth, sessionController.deleteSession);

module.exports = router;
