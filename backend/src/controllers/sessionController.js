const db = require('../config/db');

exports.getSessions = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    const { status } = req.query;

    let sessions = db.getCollection('sessions');

    if (userId) {
      sessions = sessions.filter(
        (s) => s.teacherId === userId || s.learnerId === userId
      );
    }

    if (status) {
      sessions = sessions.filter(
        (s) => (s.status || '').toLowerCase() === status.toLowerCase()
      );
    }

    const populated = sessions.map((ses) => {
      const teacher = db.findById('users', ses.teacherId);
      const learner = db.findById('users', ses.learnerId);

      const safeTeacher = teacher ? (({ password, ...u }) => u)(teacher) : null;
      const safeLearner = learner ? (({ password, ...u }) => u)(learner) : null;

      const isTeacher = String(ses.teacherId) === String(userId);
      const partner = isTeacher ? safeLearner : safeTeacher;

      return {
        ...ses,
        teacher: safeTeacher,
        learner: safeLearner,
        partner: partner || { name: 'Partner', avatar: 'SP' },
        isTeacher,
      };
    });

    populated.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
      return dateA - dateB;
    });

    return res.json({
      success: true,
      count: populated.length,
      sessions: populated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createSession = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 'usr_narendar';
    const {
      exchangeId,
      learnerId,
      teacherId,
      skill,
      date,
      time,
      duration = 60,
      notes,
      meetingLink,
    } = req.body;

    const actualTeacherId = teacherId || currentUserId;
    const actualLearnerId = learnerId || (currentUserId === actualTeacherId ? 'usr_priya' : currentUserId);

    const generatedLink =
      meetingLink ||
      `https://meet.skillor.io/room-${Math.random().toString(36).substring(2, 9)}`;

    const newSession = db.insert('sessions', {
      id: `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      exchangeId: exchangeId || null,
      teacherId: actualTeacherId,
      learnerId: actualLearnerId,
      skill: skill || 'Full-Stack Skill Exchange',
      date: date || new Date().toISOString().split('T')[0],
      time: time || '18:00',
      duration: Number(duration) || 60,
      meetingLink: generatedLink,
      status: 'scheduled',
      notes: notes || 'Live peer-to-peer interactive practice and feedback session.',
      createdAt: new Date().toISOString(),
    });

    const teacher = db.findById('users', actualTeacherId);
    const learner = db.findById('users', actualLearnerId);

    return res.status(201).json({
      success: true,
      message: 'Learning session booked and scheduled successfully!',
      session: {
        ...newSession,
        teacher: teacher ? (({ password, ...u }) => u)(teacher) : null,
        learner: learner ? (({ password, ...u }) => u)(learner) : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = db.update('sessions', id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    return res.json({
      success: true,
      message: 'Session updated successfully.',
      session: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = db.delete('sessions', id);

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    return res.json({
      success: true,
      message: 'Session cancelled and deleted.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
