const express = require('express');
const ExchangeRate = require('../models/ExchangeRate');
const Product = require('../models/Product');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(verifyToken);

// Get recent exchange rates (last 10)
router.get('/', async (req, res) => {
  try {
    const rates = await ExchangeRate.findAll({ 
      order: [['createdAt', 'DESC']],
      limit: 10 
    });
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest exchange rate
router.get('/latest', async (req, res) => {
  try {
    const rate = await ExchangeRate.findOne({ order: [['createdAt', 'DESC']] });
    res.json(rate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new configuration and update all product prices
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const { rate, profitPercentage } = req.body;
    const exchangeRate = await ExchangeRate.create({ rate, profitPercentage });
    // No modificamos los precios de productos existentes.
    // El precio en Bs se calculará dinámicamente usando la tasa vigente al momento de la venta.
    res.status(201).json(exchangeRate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
