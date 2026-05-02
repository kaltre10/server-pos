const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');
  if (!token) return res.status(401).json({ message: 'No autorizado' });
  try {
    const secret = process.env.AUTH_SECRET || 'devsecret';
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

module.exports = { verifyToken };
