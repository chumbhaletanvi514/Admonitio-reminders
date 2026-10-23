const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Coordinator ID and Password required.' });
    }

    const coordinator = await prisma.coordinator.findUnique({
      where: { username: username.trim() },
    });

    if (!coordinator) {
      return res.status(401).json({ success: false, message: 'Invalid Coordinator ID or Password' });
    }

    const isMatch = await bcrypt.compare(password, coordinator.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Coordinator ID or Password' });
    }

    const categories = coordinator.categories || ['WATER_COOLER'];

    const token = jwt.sign(
      {
        id: coordinator.id,
        username: coordinator.username,
        categories: categories,
      },
      process.env.JWT_SECRET || 'admonitio_super_secret_jwt_key',
      { expiresIn: '24h' }
    );

    // Set HTTP-Only Cookie
    res.cookie('admonitio_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // Must be false for local development on http://localhost
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(200).json({
      success: true,
      coordinator: {
        id: coordinator.id,
        username: coordinator.username,
        name: coordinator.name,
        categories: categories,
        notificationEmail: coordinator.notificationEmail,
        roleTitle: coordinator.roleTitle,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
};

// Check active session & profile
exports.getMe = async (req, res) => {
  try {
    const coordinator = await prisma.coordinator.findUnique({
      where: { id: req.coordinator.id },
      select: {
        id: true,
        username: true,
        name: true,
        categories: true,
        notificationEmail: true,
        roleTitle: true,
      },
    });

    if (!coordinator) {
      return res.status(404).json({ success: false, message: 'Coordinator not found' });
    }

    return res.status(200).json({ success: true, coordinator });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve session' });
  }
};

// Logout by clearing cookie
exports.logout = (req, res) => {
  res.clearCookie('admonitio_token');
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
};