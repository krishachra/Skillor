const db = require('../config/db');

exports.getRequests = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    const { status } = req.query;

    let requests = db.getCollection('exchangeRequests');

    requests = requests.filter(
      (r) => r.senderId === userId || r.receiverId === userId
    );

    if (status) {
      requests = requests.filter(
        (r) => (r.status || '').toLowerCase() === status.toLowerCase()
      );
    }

    const populated = requests.map((reqItem) => {
      const sender = db.findById('users', reqItem.senderId);
      const receiver = db.findById('users', reqItem.receiverId);

      const safeSender = sender ? (({ password, ...u }) => u)(sender) : null;
      const safeReceiver = receiver ? (({ password, ...u }) => u)(receiver) : null;

      return {
        ...reqItem,
        sender: safeSender,
        receiver: safeReceiver,
        offeredSkills: reqItem.offeredSkills || (reqItem.proposedTeachSkill ? [reqItem.proposedTeachSkill] : []),
        requestedSkills: reqItem.requestedSkills || (reqItem.requestedLearnSkill ? [reqItem.requestedLearnSkill] : []),
      };
    });

    return res.json({
      success: true,
      count: populated.length,
      requests: populated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const senderId = req.user ? req.user.id : 'usr_narendar';
    const {
      receiverId,
      proposedTeachSkill,
      requestedLearnSkill,
      senderSkills,
      receiverSkills,
      offeredTitle,
      requestedTitle,
      offeredSkills,
      requestedSkills,
      message,
      proposedDate,
      proposedTime,
      date,
      time,
    } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'receiverId is required to send an exchange request.',
      });
    }

    const teachSkillsList = offeredSkills || senderSkills || (proposedTeachSkill ? [proposedTeachSkill] : ['Web Development']);
    const learnSkillsList = requestedSkills || receiverSkills || (requestedLearnSkill ? [requestedLearnSkill] : ['Design']);

    const newRequest = db.insert('exchangeRequests', {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId,
      receiverId,
      proposedTeachSkill: offeredTitle || proposedTeachSkill || (teachSkillsList[0] || 'Skill'),
      requestedLearnSkill: requestedTitle || requestedLearnSkill || (learnSkillsList[0] || 'Skill'),
      offeredSkills: teachSkillsList,
      requestedSkills: learnSkillsList,
      message: message || '',
      proposedDate: proposedDate || date || null,
      proposedTime: proposedTime || time || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const sender = db.findById('users', senderId);
    const receiver = db.findById('users', receiverId);

    return res.status(201).json({
      success: true,
      message: 'Exchange proposal submitted successfully!',
      request: {
        ...newRequest,
        sender: sender ? (({ password, ...u }) => u)(sender) : null,
        receiver: receiver ? (({ password, ...u }) => u)(receiver) : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = db.findById('exchangeRequests', id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const updated = db.update('exchangeRequests', id, {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });

    const conversations = db.getCollection('conversations');
    let conv = conversations.find(
      (c) =>
        Array.isArray(c.participants) &&
        c.participants.includes(request.senderId) &&
        c.participants.includes(request.receiverId)
    );

    if (!conv) {
      conv = db.insert('conversations', {
        id: `conv_${request.senderId}_${request.receiverId}_${Date.now().toString(36)}`,
        participants: [request.senderId, request.receiverId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    db.insert('messages', {
      id: `msg_${Date.now()}`,
      conversationId: conv.id,
      senderId: request.receiverId,
      text: `Exchange request accepted! Looking forward to learning ${request.proposedTeachSkill || 'together'} and sharing knowledge.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Exchange request accepted! A direct chat room has been activated.',
      request: updated,
      conversationId: conv.id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = db.update('exchangeRequests', id, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    return res.json({
      success: true,
      message: 'Exchange request declined.',
      request: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.completeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = db.findById('exchangeRequests', id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const updated = db.update('exchangeRequests', id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    [request.senderId, request.receiverId].forEach((uid) => {
      const user = db.findById('users', uid);
      if (user) {
        db.update('users', uid, {
          sessionsCompleted: (user.sessionsCompleted || 0) + 1,
          hoursExchanged: (user.hoursExchanged || 0) + 1.5,
        });
      }
    });

    return res.json({
      success: true,
      message: 'Exchange successfully marked as completed!',
      request: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
