const db = require('../config/db');

exports.getAllSkills = async (req, res) => {
  try {
    const { search, category, popular } = req.query;
    let skills = db.getCollection('skills');

    if (search) {
      const q = search.toLowerCase();
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.category && s.category.toLowerCase().includes(q))
      );
    }

    if (category && category !== 'All') {
      skills = skills.filter(
        (s) => s.category && s.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (popular === 'true') {
      skills = skills.filter((s) => s.popular);
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
      const all = db.getCollection('skills');
      skill = all.find((s) => s.name.toLowerCase() === decodedId.toLowerCase());
    }

    if (!skill) {
      skill = {
        id: `skl_${decodedId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: decodedId,
        category: 'General',
        description: `Interactive peer-to-peer mentoring and collaborative exchange for ${decodedId}.`,
        popular: false,
        level: 'Intermediate',
        learnersCount: 120,
        teachersCount: 45,
        icon: 'BookOpen',
      };
    }

    const allUsers = db.getCollection('users').map(({ password, ...u }) => u);
    const teachers = allUsers.filter(
      (u) =>
        u.teaches &&
        u.teaches.some((s) => s.toLowerCase() === skill.name.toLowerCase())
    );
    const learners = allUsers.filter(
      (u) =>
        u.wants &&
        u.wants.some((s) => s.toLowerCase() === skill.name.toLowerCase())
    );

    return res.json({
      success: true,
      skill,
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
    const user = db.findById('users', userId);
    const userSkills = db.find('userSkills', { userId });

    const teaches = user?.teaches || [];
    const wants = user?.wants || [];

    return res.json({
      success: true,
      skills: userSkills,
      teaches,
      wants,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.addMySkill = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    const { skillName, type = 'teach', level = 'Intermediate', experienceYears = 1 } = req.body;

    if (!skillName || !skillName.trim()) {
      return res.status(400).json({ success: false, message: 'Skill name is required.' });
    }

    const trimmed = skillName.trim();
    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const field = type === 'learn' ? 'wants' : 'teaches';
    const currentList = Array.isArray(user[field]) ? user[field] : [];

    if (!currentList.includes(trimmed)) {
      db.update('users', userId, {
        [field]: [...currentList, trimmed],
      });
    }

    const newSkillRecord = db.insert('userSkills', {
      id: `us_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      skillName: trimmed,
      type,
      level,
      experienceYears: Number(experienceYears) || 1,
    });

    return res.status(201).json({
      success: true,
      message: `${trimmed} added to your ${type === 'learn' ? 'learning' : 'teaching'} list!`,
      skill: newSkillRecord,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMySkill = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'usr_narendar';
    const { id } = req.params;

    const skill = db.findById('userSkills', id);
    if (skill && skill.userId === userId) {
      db.delete('userSkills', id);

      const user = db.findById('users', userId);
      if (user) {
        const field = skill.type === 'learn' ? 'wants' : 'teaches';
        const updated = (user[field] || []).filter((s) => s !== skill.skillName);
        db.update('users', userId, { [field]: updated });
      }
    }

    return res.json({
      success: true,
      message: 'Skill removed successfully.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
