const db = require('../config/db');

exports.createReview = async (req, res) => {
  try {
    const reviewerId = req.user ? req.user.id : 'usr_narendar';
    const { revieweeId, rating, comment, skill, tags = [], exchangeId } = req.body;

    if (!revieweeId || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Reviewee ID and comment are required.',
      });
    }

    const newReview = db.insert('reviews', {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reviewerId,
      revieweeId,
      exchangeId: exchangeId || null,
      rating: Number(rating) || 5,
      comment: comment.trim(),
      skill: skill || 'General Skill Exchange',
      tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
      createdAt: new Date().toISOString(),
    });

    const reviewee = db.findById('users', revieweeId);
    if (reviewee) {
      const allReviews = db.find('reviews', { revieweeId });
      const totalScore = allReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
      const newAvg = Number((totalScore / allReviews.length).toFixed(2));

      db.update('users', revieweeId, {
        rating: newAvg,
        reviewsCount: allReviews.length,
      });
    }

    const reviewer = db.findById('users', reviewerId);

    return res.status(201).json({
      success: true,
      message: 'Verified peer review submitted successfully!',
      review: {
        ...newReview,
        reviewer: reviewer ? (({ password, ...u }) => u)(reviewer) : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.params.userId || req.params.id;
    const reviews = db.find('reviews', { revieweeId: userId });

    const populated = reviews.map((r) => {
      const reviewer = db.findById('users', r.reviewerId);
      return {
        ...r,
        reviewer: reviewer ? (({ password, ...u }) => u)(reviewer) : { name: 'Peer Trader', avatar: 'PT' },
      };
    });

    populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      count: populated.length,
      reviews: populated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
