const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.admonitio_token) {
      token = req.cookies.admonitio_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admonitio_super_secret_jwt_key');
    req.coordinator = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
};