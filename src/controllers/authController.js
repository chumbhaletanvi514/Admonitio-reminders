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

    return res.status(200).json({
      success: true,
      token,
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
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
};