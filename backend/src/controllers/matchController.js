const db = require('../config/db');

const calculateMatchScore = (currentUser, targetUser) => {
  const currentTeaches = (currentUser.teaches || []).map((s) => s.toLowerCase());
  const currentWants = (currentUser.wants || []).map((s) => s.toLowerCase());
  const targetTeaches = (targetUser.teaches || []).map((s) => s.toLowerCase());
  const targetWants = (targetUser.wants || []).map((s) => s.toLowerCase());

  const canTeachThem = currentTeaches.filter((s) => targetWants.includes(s));
  const canLearnFromThem = currentWants.filter((s) => targetTeaches.includes(s));

  let baseScore = 50;

  if (canTeachThem.length > 0 && canLearnFromThem.length > 0) {
    baseScore = 80 + Math.min(15, (canTeachThem.length + canLearnFromThem.length) * 4);
  } else if (canTeachThem.length > 0 || canLearnFromThem.length > 0) {
    baseScore = 65 + Math.min(12, (canTeachThem.length + canLearnFromThem.length) * 3);
  } else {
    baseScore = 40;
  }

  if (targetUser.rating) {
    baseScore += Math.round((targetUser.rating - 4.0) * 5);
  }

  if (currentUser.availability && targetUser.availability) {
    const overlap = currentUser.availability.some((a) => targetUser.availability.includes(a));
    if (overlap) baseScore += 3;
  }

  const finalScore = Math.min(98, Math.max(45, Math.round(baseScore)));

  let why = '';
  if (canTeachThem.length > 0 && canLearnFromThem.length > 0) {
    const teachSkill = targetUser.wants.find((s) => currentTeaches.includes(s.toLowerCase())) || targetUser.wants[0];
    const learnSkill = targetUser.teaches.find((s) => currentWants.includes(s.toLowerCase())) || targetUser.teaches[0];
    why = `You can teach ${teachSkill}, and ${targetUser.name.split(' ')[0]} can help you learn ${learnSkill}.`;
  } else if (canLearnFromThem.length > 0) {
    const learnSkill = targetUser.teaches.find((s) => currentWants.includes(s.toLowerCase())) || targetUser.teaches[0];
    why = `${targetUser.name.split(' ')[0]} is an expert in ${learnSkill} that you want to learn.`;
  } else if (canTeachThem.length > 0) {
    const teachSkill = targetUser.wants.find((s) => currentTeaches.includes(s.toLowerCase())) || targetUser.wants[0];
    why = `${targetUser.name.split(' ')[0]} wants to learn ${teachSkill} which you can teach.`;
  } else {
    why = `Great potential peer with complementary interests and strong community ratings.`;
  }

  return {
    score: finalScore,
    why,
    canTeachThem,
    canLearnFromThem,
  };
};

exports.getMatches = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 'usr_narendar';
    let currentUser = db.findById('users', currentUserId);

    if (!currentUser) {
      currentUser = {
        id: 'usr_narendar',
        name: 'Narendar Kumar',
        teaches: ['React', 'JavaScript', 'Node.js', 'Python'],
        wants: ['UI/UX Design', 'Figma', 'Video Editing'],
        availability: ['Weekdays', 'Evenings'],
      };
    }


    const existingRequests = db.find('exchangeRequests', { senderId: currentUserId });
    const requestedReceiverIds = new Set(existingRequests.map((r) => r.receiverId));

    const otherUsers = db.getCollection('users').filter((u) => u.id !== currentUser.id);

    const matches = otherUsers.map((u, idx) => {
      const matchCalc = calculateMatchScore(currentUser, u);
      const isOnline = idx % 2 === 0;

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        location: u.location || 'Remote',
        score: matchCalc.score,
        status: isOnline ? 'Online now' : 'Last seen 2h ago',
        online: isOnline,
        bio: u.bio,
        teaches: u.teaches || [],
        wants: u.wants || [],
        interests: (u.teaches || []).slice(0, 3).join(', '),
        why: matchCalc.why,
        level: u.rating > 4.9 ? 'Advanced' : 'Intermediate',
        modes: u.modes || ['Online'],
        availability: u.availability || ['Weekdays'],
        languages: u.languages || ['English'],
        isNew: idx < 2,
        requestSent: requestedReceiverIds.has(u.id),
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
    const currentUserId = req.user ? req.user.id : 'usr_narendar';
    const { userId } = req.params;

    const currentUser = db.findById('users', currentUserId) || {
      teaches: ['React', 'JavaScript', 'Python'],
      wants: ['UI/UX Design', 'Figma'],
    };

    const targetUser = db.findById('users', userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const matchCalc = calculateMatchScore(currentUser, targetUser);

    return res.json({
      success: true,
      match: {
        userId: targetUser.id,
        userName: targetUser.name,
        score: matchCalc.score,
        why: matchCalc.why,
        canTeachThem: matchCalc.canTeachThem,
        canLearnFromThem: matchCalc.canLearnFromThem,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
