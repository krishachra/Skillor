const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, requestController.getRequests);
router.post('/', optionalAuth, requestController.createRequest);
router.put('/:id/accept', optionalAuth, requestController.acceptRequest);
router.put('/:id/reject', optionalAuth, requestController.rejectRequest);
router.put('/:id/complete', optionalAuth, requestController.completeRequest);

module.exports = router;
