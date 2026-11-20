const db = require('../config/db');

exports.getSummary = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 'usr_narendar';
    let user = db.findById('users', currentUserId);

    if (!user) {
      user = db.findById('users', 'usr_narendar') || db.getCollection('users')[0];
    }

    const incomingRequests = db.find('exchangeRequests', {
      receiverId: user.id,
      status: 'pending',
    }).length;

    const sessions = db.find('sessions', {
      status: 'scheduled',
    }).filter((s) => s.teacherId === user.id || s.learnerId === user.id);

    sessions.sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));

    let upcomingSession = null;
    if (sessions.length > 0) {
      const nextSes = sessions[0];
      const partnerId = nextSes.teacherId === user.id ? nextSes.learnerId : nextSes.teacherId;
      const partner = db.findById('users', partnerId);
      const sessionDate = new Date(`${nextSes.date}T${nextSes.time || '12:00'}`);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      upcomingSession = {
        day: days[sessionDate.getDay()] || 'Saturday',
        time: nextSes.time || '6:00 PM',
        skill: nextSes.skill || 'React & Architecture',
        partner: partner ? partner.name : 'Peer Partner',
        meetingLink: nextSes.meetingLink || 'https://meet.skillor.io/room-demo',
      };
    } else {
      upcomingSession = {
        day: 'Saturday',
        time: '6:00 PM',
        skill: 'React & UI Systems',
        partner: 'Priya Patel',
        meetingLink: 'https://meet.skillor.io/room-priya-narendar',
      };
    }

    const userSkills = db.find('userSkills', { userId: user.id });
    const teaching = (userSkills.length > 0
      ? userSkills.filter((s) => s.type === 'teach')
      : (user.teaches || ['React', 'JavaScript', 'Node.js', 'Python']).map((s) => ({ skillName: s, level: 'Advanced' }))
    ).map((s) => ({ name: s.skillName || s.name, level: s.level || 'Advanced' }));

    const learning = (userSkills.length > 0
      ? userSkills.filter((s) => s.type === 'learn')
      : (user.wants || ['UI/UX Design', 'Figma', 'Video Editing']).map((s) => ({ skillName: s, level: 'Intermediate' }))
    ).map((s) => ({ name: s.skillName || s.name, level: s.level || 'Intermediate' }));

    const otherUsers = db.getCollection('users').filter((u) => u.id !== user.id).slice(0, 3);
    const recommendedMatches = otherUsers.map((u, i) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      score: 94 - i * 4,
      canTeach: (u.teaches || []).slice(0, 2),
      wants: (u.wants || []).slice(0, 2),
      status: i === 0 ? 'Online' : 'Active today',
    }));

    const reviews = db.find('reviews', { revieweeId: user.id });
    let latestReview = null;
    if (reviews.length > 0) {
      const rev = reviews[reviews.length - 1];
      const reviewer = db.findById('users', rev.reviewerId);
      latestReview = {
        quote: rev.comment,
        reviewer: reviewer ? reviewer.name : 'Verified Peer',
        role: reviewer ? reviewer.role : 'Full Stack Engineer',
        time: 'Recent',
      };
    } else {
      latestReview = {
        quote: 'Explained custom hooks intuitively and walked through concurrency patterns with clear metaphors. Saved me weeks of confusion!',
        reviewer: 'Marcus Chen',
        role: 'Distributed Systems Engineer',
        time: '2 days ago',
      };
    }

    const data = {
      user: {
        id: user.id,
        name: user.name,
        incomingRequests,
        upcomingSession,
        stats: {
          skillsOffered: teaching.length,
          skillsLearned: learning.length,
          hoursExchanged: user.hoursExchanged || 48,
          rating: user.rating || 4.95,
        },
      },
      recommendedMatches,
      skillsPortfolio: {
        teaching,
        learning,
      },
      weeklyHours: [
        { day: 'Mon', taught: 1.5, learned: 1.5 },
        { day: 'Tue', taught: 3, learned: 2 },
        { day: 'Wed', taught: 1, learned: 1 },
        { day: 'Thu', taught: 4, learned: 4 },
        { day: 'Fri', taught: 0, learned: 0 },
        { day: 'Sat', taught: 2, learned: 2 },
        { day: 'Sun', taught: 0.5, learned: 0.5 },
      ],
      peerReview: latestReview,
    };

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
