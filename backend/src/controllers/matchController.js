const db = require('../config/db');

exports.getMatches = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    let currentUser = db.findById('users', userId);
    if (!currentUser) {
      currentUser = db.getCollection('users')[0] || {
        id: userId,
        name: 'User',
        teaches: ['React', 'JavaScript', 'Node.js'],
        wants: ['UI/UX Design', 'Figma'],
      };
    }

    const allUsers = db.getCollection('users').filter((u) => u.id !== userId);
    const userTeaches = (currentUser.teaches || []).map((s) => s.toLowerCase());
    const userWants = (currentUser.wants || []).map((s) => s.toLowerCase());

    const matches = allUsers.map((peer, idx) => {
      const peerTeaches = (peer.teaches || []).map((s) => s.toLowerCase());
      const peerWants = (peer.wants || []).map((s) => s.toLowerCase());

      const canLearnFromThem = (peer.teaches || []).filter((s) =>
        userWants.some((w) => w.includes(s.toLowerCase()) || s.toLowerCase().includes(w))
      );

      const canTeachThem = (currentUser.teaches || []).filter((s) =>
        peerWants.some((w) => w.includes(s.toLowerCase()) || s.toLowerCase().includes(w))
      );

      const isTwoWay = canLearnFromThem.length > 0 && canTeachThem.length > 0;
      const isOneWay = canLearnFromThem.length > 0 || canTeachThem.length > 0;

      let score = 50;
      let why = '';

      if (isTwoWay) {
        score = Math.min(98, 85 + canLearnFromThem.length * 4 + canTeachThem.length * 3);
        why = `You can teach ${canTeachThem.join(', ')}, and ${peer.name.split(' ')[0]} can help you learn ${canLearnFromThem.join(', ')}.`;
      } else if (canLearnFromThem.length > 0) {
        score = Math.min(84, 70 + canLearnFromThem.length * 5);
        why = `${peer.name.split(' ')[0]} teaches ${canLearnFromThem.join(', ')} which matches your learning goals.`;
      } else if (canTeachThem.length > 0) {
        score = Math.min(80, 68 + canTeachThem.length * 4);
        why = `You can teach ${canTeachThem.join(', ')} which ${peer.name.split(' ')[0]} wants to learn.`;
      } else {
        score = 55 + (idx % 15);
        why = `${peer.name.split(' ')[0]} shares adjacent technical interests with your background.`;
      }

      const existingReq = db.findOne('exchangeRequests', {
        senderId: userId,
        receiverId: peer.id,
      });

      return {
        id: peer.id,
        name: peer.name,
        username: peer.username,
        avatar: peer.avatar,
        location: peer.location || 'Remote',
        score,
        status: idx % 2 === 0 ? 'Online now' : 'Last active 2h ago',
        online: true,
        bio: peer.bio || '',
        teaches: peer.teaches || [],
        wants: peer.wants || [],
        interests: peer.interests || 'Tech, Design, Learning',
        why,
        level: peer.experienceLevel || (idx % 2 === 0 ? 'Intermediate' : 'Advanced'),
        modes: peer.modes || ['Online'],
        availability: peer.availability || ['Weekdays', 'Weekends'],
        languages: peer.languages || ['English'],
        isNew: idx < 2,
        requestSent: !!existingReq,
        saved: false,
        activeRank: idx + 1,
      };
    });

    matches.sort((a, b) => b.score - a.score);

    return res.json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMatchWithUser = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    const targetId = req.params.userId;

    const currentUser = db.findById('users', userId) || {
      id: userId,
      name: 'User',
      teaches: ['React', 'JavaScript'],
      wants: ['UI/UX Design'],
    };

    const peer = db.findById('users', targetId);
    if (!peer) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { password, ...safePeer } = peer;
    return res.json({
      success: true,
      match: {
        user: safePeer,
        score: 92,
        reasons: [
          'High complement between teaching and learning goals',
          'Compatible availability schedule (Weekdays)',
          'High peer satisfaction rating (4.9+)',
        ],
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
