const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/conversations', optionalAuth, chatController.getConversations);
router.get('/conversations/:conversationId/messages', optionalAuth, chatController.getMessages);
router.post('/conversations/:conversationId/messages', optionalAuth, chatController.sendMessage);
router.post('/conversations/start', optionalAuth, chatController.startConversation);

module.exports = router;
