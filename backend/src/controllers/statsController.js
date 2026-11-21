const db = require('../config/db');

exports.getSummary = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    let user = db.findById('users', userId);

    if (!user) {
      user = db.getCollection('users')[0] || {
        id: userId,
        name: 'Narendar Kumar',
        teaches: ['React', 'JavaScript', 'Node.js'],
        wants: ['UI/UX Design', 'Figma'],
        rating: 4.95,
        hoursExchanged: 51,
      };
    }

    const incomingRequests = db.find('exchangeRequests', {
      receiverId: user.id,
      status: 'pending',
    }).length;


    const sessions = db.find('sessions', { status: 'scheduled' });
    const userSessions = sessions.filter(
      (s) => s.teacherId === user.id || s.learnerId === user.id
    );

    let upcomingSession = null;
    if (userSessions.length > 0) {
      const ses = userSessions[0];
      const partnerId = ses.teacherId === user.id ? ses.learnerId : ses.teacherId;
      const partner = db.findById('users', partnerId);

      const d = new Date(ses.date);
      const dayName = isNaN(d) ? 'Saturday' : d.toLocaleDateString('en-US', { weekday: 'long' });

      upcomingSession = {
        day: dayName,
        time: ses.time || '6:00 PM',
        skill: ses.skill || 'Peer Skill Exchange',
        partner: partner ? partner.name : 'Priya Patel',
        meetingLink: ses.meetingLink || 'https://meet.skillor.io/room-priya-narendar',
      };
    } else {
      upcomingSession = {
        day: 'Saturday',
        time: '6:00 PM',
        skill: 'React & Architecture',
        partner: 'Priya Patel',
        meetingLink: 'https://meet.skillor.io/room-demo',
      };
    }


    const userSkills = db.find('userSkills', { userId: user.id });
    const teachingFromSkills = userSkills
      .filter((s) => s.type === 'teach')
      .map((s) => ({ name: s.skillName, level: s.level || 'Advanced' }));
    const learningFromSkills = userSkills
      .filter((s) => s.type === 'learn')
      .map((s) => ({ name: s.skillName, level: s.level || 'Beginner' }));

    const teaching = teachingFromSkills.length > 0
      ? teachingFromSkills
      : (user.teaches || ['React', 'JavaScript', 'Node.js']).map((name) => ({ name, level: 'Advanced' }));

    const learning = learningFromSkills.length > 0
      ? learningFromSkills
      : (user.wants || ['UI/UX Design', 'Figma']).map((name) => ({ name, level: 'Beginner' }));


    const otherUsers = db.getCollection('users').filter((u) => u.id !== user.id);
    const userWantsLower = (user.wants || []).map((w) => w.toLowerCase());
    const userTeachesLower = (user.teaches || []).map((t) => t.toLowerCase());

    const recommendedMatches = otherUsers.slice(0, 3).map((peer, i) => {
      const matchScore = 95 - i * 5;
      const peerTeaches = peer.teaches || [];
      const peerWants = peer.wants || [];

      return {
        id: peer.id,
        name: peer.name,
        role: peer.role || 'Skill Trader',
        avatar: peer.avatar || peer.name.slice(0, 2).toUpperCase(),
        matchScore,
        canTeachYou: peerTeaches[0] || 'UI/UX Design',
        wantsToLearn: peerWants[0] || 'React',
        rating: peer.rating || 4.9,
      };
    });


    const reviews = db.find('reviews', { revieweeId: user.id });
    let peerReview = null;
    if (reviews.length > 0) {
      const latest = reviews[reviews.length - 1];
      const reviewer = db.findById('users', latest.reviewerId);
      peerReview = {
        quote: latest.comment,
        reviewer: reviewer ? reviewer.name : 'Marcus Chen',
        role: reviewer ? reviewer.role : 'Distributed Systems Engineer',
        time: 'Recently',
      };
    } else {
      peerReview = {
        quote: 'Super patient mentor who explained custom hooks and concurrency patterns with crystal-clear metaphors. Saved me weeks of confusion!',
        reviewer: 'Marcus Chen',
        role: 'Full Stack Engineer',
        time: '2 days ago',
      };
    }

    const weeklyHours = [
      { day: 'Mon', taught: 1.5, learned: 1.5 },
      { day: 'Tue', taught: 3, learned: 2 },
      { day: 'Wed', taught: 1, learned: 1 },
      { day: 'Thu', taught: 4, learned: 4 },
      { day: 'Fri', taught: 0, learned: 0 },
      { day: 'Sat', taught: 2, learned: 2 },
      { day: 'Sun', taught: 0.5, learned: 0.5 },
    ];

    const data = {
      user: {
        name: user.name,
        incomingRequests,
        upcomingSession,
        stats: {
          skillsOffered: (user.teaches || []).length,
          skillsLearned: (user.wants || []).length,
          hoursExchanged: user.hoursExchanged || 51,
          rating: user.rating || 4.95,
        },
      },
      recommendedMatches,
      skillsPortfolio: {
        teaching,
        learning,
      },
      weeklyHours,
      peerReview,
    };

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
