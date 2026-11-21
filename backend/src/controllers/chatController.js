const db = require('../config/db');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    const allConvs = db.getCollection('conversations');

    const userConvs = allConvs.filter(
      (c) => Array.isArray(c.participants) && c.participants.includes(userId)
    );

    const populated = userConvs.map((conv) => {
      const peerId = conv.participants.find((p) => p !== userId) || conv.participants[0];
      const peer = db.findById('users', peerId);
      const safePeer = peer ? (({ password, ...u }) => u)(peer) : { id: peerId, name: 'Skill Partner' };


      const messages = db.find('messages', { conversationId: conv.id });
      messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const lastMessage = messages[messages.length - 1] || null;

      const unreadCount = messages.filter(
        (m) => m.senderId !== userId && !m.read
      ).length;

      const lastMsgText = lastMessage
        ? (typeof lastMessage === 'string' ? lastMessage : (lastMessage.text || ''))
        : '';

      const lastMsgTime = lastMessage
        ? (lastMessage.createdAt || conv.updatedAt)
        : (conv.updatedAt || conv.createdAt);

      return {
        ...conv,
        peerId,
        peer: safePeer,
        peerName: safePeer ? safePeer.name : 'Skill Partner',
        peerUsername: safePeer ? safePeer.username : '',
        peerAvatar: safePeer ? safePeer.avatar : 'SP',
        peerOnline: true,
        lastMessage: lastMsgText,
        lastMessageTime: lastMsgTime,
        lastMessageObj: lastMessage,
        unreadCount,
      };
    });


    populated.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.updatedAt || a.createdAt || 0);
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.updatedAt || b.createdAt || 0);
      return timeB - timeA;
    });

    return res.json({
      success: true,
      count: populated.length,
      conversations: populated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user ? req.user.id : 'usr_narendar';

    const messages = db.find('messages', { conversationId });
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    messages.forEach((m) => {
      if (m.senderId !== userId && !m.read) {
        db.update('messages', m.id, { read: true });
      }
    });

    return res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, image, fileUrl } = req.body;
    const senderId = req.user ? req.user.id : 'usr_narendar';

    if (!text && !image && !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required.',
      });
    }

    let conversation = db.findById('conversations', conversationId);
    if (!conversation) {
      conversation = db.insert('conversations', {
        id: conversationId,
        participants: [senderId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      db.update('conversations', conversationId, {
        updatedAt: new Date().toISOString(),
      });
    }

    const newMessage = db.insert('messages', {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId,
      text: text || '',
      image: image || fileUrl || null,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.startConversation = async (req, res) => {
  try {
    const { peerId, initialMessage } = req.body;
    const senderId = req.user ? req.user.id : 'usr_narendar';

    if (!peerId) {
      return res.status(400).json({ success: false, message: 'peerId is required.' });
    }

    const conversations = db.getCollection('conversations');
    let existing = conversations.find(
      (c) =>
        Array.isArray(c.participants) &&
        c.participants.includes(senderId) &&
        c.participants.includes(peerId)
    );

    if (!existing) {
      const convId = `conv_${senderId}_${peerId}_${Date.now().toString(36)}`;
      existing = db.insert('conversations', {
        id: convId,
        participants: [senderId, peerId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    let messageRecord = null;
    if (initialMessage) {
      messageRecord = db.insert('messages', {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        conversationId: existing.id,
        senderId,
        text: initialMessage,
        read: false,
        createdAt: new Date().toISOString(),
      });
      db.update('conversations', existing.id, { updatedAt: new Date().toISOString() });
    }

    return res.status(201).json({
      success: true,
      conversation: existing,
      message: messageRecord,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
