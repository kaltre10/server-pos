const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const envUser = process.env.ADMIN_USER || process.env.AUTH_USER;
  const envPass = process.env.ADMIN_PASS || process.env.AUTH_PASS;
  if (!envUser || !envPass) {
    return res.status(500).json({ message: 'Auth no configurado en el servidor' });
  }
  if (username !== envUser || password !== envPass) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }
  const secret = process.env.AUTH_SECRET || 'devsecret';
  const token = jwt.sign({ user: envUser }, secret, { expiresIn: '12h' });
  res.json({ token });
});

module.exports = router;
