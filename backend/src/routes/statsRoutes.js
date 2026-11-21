const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/summary', optionalAuth, statsController.getSummary);

module.exports = router;
