const { verifyToken } = require('../utils/auth');

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.user = payload;
  next();
};

module.exports = {
  requireAuth
};
