const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
    }

    const user = await User.findOne({ where: { username } });
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Credenciales inválidas o usuario inactivo' });
    }

    const isValidPassword = await user.validPassword(password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const secret = process.env.JWT_SECRET || 'devsecret_pos2026_super_secure';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name }, 
      secret, 
      { expiresIn: '12h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        name: user.name 
      } 
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
