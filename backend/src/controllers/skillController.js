const db = require('../config/db');

exports.getAllSkills = async (req, res) => {
  try {
    const { category, search } = req.query;
    let skills = db.getCollection('skills');

    if (category && category !== 'All') {
      skills = skills.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      skills = skills.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: skills.length,
      skills,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSkillById = async (req, res) => {
  try {
    const { id } = req.params;
    const decodedId = decodeURIComponent(id);

    let skill = db.findById('skills', decodedId);
    if (!skill) {
      skill = db.findOne('skills', { name: decodedId });
    }
    if (!skill) {
      // Case insensitive fallback
      skill = db.getCollection('skills').find(
        (s) => s.name.toLowerCase() === decodedId.toLowerCase() || s.id.toLowerCase() === decodedId.toLowerCase()
      );
    }

    if (!skill) {
      // Dynamic fallback for any search
      skill = {
        id: `skl_${decodedId.toLowerCase().replace(/\s+/g, '_')}`,
        name: decodedId,
        category: 'Technology',
        description: `Explore peer exchanges and collaborative learning for ${decodedId}.`,
        level: 'Intermediate',
        learnersCount: 120,
        teachersCount: 45,
      };
    }

    // Find teachers and learners for this skill
    const allUsers = db.getCollection('users').map(({ password, ...u }) => u);
    const teachers = allUsers.filter(
      (u) => u.teaches && u.teaches.some((s) => s.toLowerCase() === skill.name.toLowerCase())
    );
    const learners = allUsers.filter(
      (u) => u.wants && u.wants.some((s) => s.toLowerCase() === skill.name.toLowerCase())
    );

    return res.json({
      success: true,
      skill: {
        ...skill,
        teachers,
        learners,
      },
      teachers,
      learners,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMySkills = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    const userSkills = db.find('userSkills', { userId });
    return res.json({
      success: true,
      skills: userSkills,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.addSkill = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    const { skillName, type = 'teach', level = 'Intermediate' } = req.body;

    if (!skillName || !skillName.trim()) {
      return res.status(400).json({ success: false, message: 'Skill name is required.' });
    }

    const trimmedName = skillName.trim();

    // Check if user already has this skill
    const existing = db.findOne('userSkills', {
      userId,
      skillName: trimmedName,
      type,
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Skill already present in your portfolio.',
        skill: existing,
      });
    }

    const newSkillRecord = db.insert('userSkills', {
      userId,
      skillName: trimmedName,
      type,
      level,
      experienceYears: level === 'Advanced' ? 3 : level === 'Intermediate' ? 1 : 0,
    });

    // Also update user's teaches or wants array
    const user = db.findById('users', userId);
    if (user) {
      const field = type === 'teach' ? 'teaches' : 'wants';
      const currentList = user[field] || [];
      if (!currentList.includes(trimmedName)) {
        db.update('users', userId, {
          [field]: [...currentList, trimmedName],
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Added ${trimmedName} to your skills!`,
      skill: newSkillRecord,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSkill = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    const { id } = req.params;


    let record = db.findById('userSkills', id);
    if (!record) {
      record = db.findOne('userSkills', { userId, skillName: id });
    }

    if (record) {
      db.delete('userSkills', record.id);

      const user = db.findById('users', userId);
      if (user) {
        const field = record.type === 'teach' ? 'teaches' : 'wants';
        const updatedList = (user[field] || []).filter((s) => s !== record.skillName);
        db.update('users', userId, { [field]: updatedList });
      }
    }

    return res.json({
      success: true,
      message: 'Skill removed from portfolio.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
