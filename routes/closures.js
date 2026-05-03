const express = require('express');
const router = express.Router();
const { Sale, SaleProduct } = require('../models/Sale');
const DailyClosure = require('../models/DailyClosure');
const ExchangeRate = require('../models/ExchangeRate');
const Product = require('../models/Product');
const User = require('../models/User');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// Get last 10 closures
router.get('/', async (req, res) => {
  try {
    const closures = await DailyClosure.findAll({
      order: [['closureDate', 'DESC']],
      limit: 10,
      include: [{ model: User, as: 'ClosedBy', attributes: ['id', 'name', 'username'] }]
    });
    res.json(closures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current day's preliminary data (before closing)
router.get('/preview', async (req, res) => {
  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Check if already closed
    const existingClosure = await DailyClosure.findOne({ where: { closureDate: today } });
    if (existingClosure) {
      return res.json({ alreadyClosed: true, closure: existingClosure });
    }

    // Get current exchange rate
    const exchangeRateData = await ExchangeRate.findOne({ order: [['createdAt', 'DESC']] });
    if (!exchangeRateData) {
      return res.status(404).json({ message: 'No se ha configurado la tasa de cambio.' });
    }

    // Get sales for today
    const sales = await Sale.findAll({
      where: {
        createdAt: {
          [Op.gte]: `${today} 00:00:00`,
          [Op.lte]: `${today} 23:59:59`
        },
        status: 'completed'
      },
      include: [Product]
    });

    let totalRevenueBs = 0;
    let totalRevenueDollar = 0;
    let totalProfitDollar = 0;
    let totalProfitBs = 0;

    sales.forEach(sale => {
      totalRevenueBs += sale.totalAmountBs;
      totalRevenueDollar += sale.totalAmountDollar;
      
      // Calculate profit for this sale
      sale.Products.forEach(product => {
        const qty = product.SaleProduct.quantity;
        const priceDollar = product.SaleProduct.priceDollar;
        const priceBs = product.SaleProduct.priceBs;
        const costDollar = product.SaleProduct.costDollar || product.costDollar; // Fallback to current cost if not stored in SaleProduct
        
        totalProfitDollar += (priceDollar - costDollar) * qty;
        
        const rateAtSale = priceDollar > 0 ? (priceBs / priceDollar) : 0;
        totalProfitBs += (priceBs - (costDollar * rateAtSale)) * qty;
      });
    });

    res.json({
      alreadyClosed: false,
      date: today,
      salesCount: sales.length,
      totalRevenueBs,
      totalRevenueDollar,
      totalProfitBs,
      totalProfitDollar,
      exchangeRate: exchangeRateData.rate,
      profitPercentage: exchangeRateData.profitPercentage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Perform daily closure
router.post('/', async (req, res) => {
  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Check if already closed
    const existingClosure = await DailyClosure.findOne({ where: { closureDate: today } });
    if (existingClosure) {
      return res.status(400).json({ message: 'El cierre de caja para hoy ya ha sido realizado.' });
    }

    // Get current exchange rate
    const exchangeRateData = await ExchangeRate.findOne({ order: [['createdAt', 'DESC']] });
    
    // Get sales for today
    const sales = await Sale.findAll({
      where: {
        createdAt: {
          [Op.gte]: `${today} 00:00:00`,
          [Op.lte]: `${today} 23:59:59`
        },
        status: 'completed'
      },
      include: [Product]
    });

    let totalRevenueBs = 0;
    let totalRevenueDollar = 0;
    let totalProfitDollar = 0;
    let totalProfitBs = 0;

    sales.forEach(sale => {
      totalRevenueBs += sale.totalAmountBs;
      totalRevenueDollar += sale.totalAmountDollar;
      
      sale.Products.forEach(product => {
        const qty = product.SaleProduct.quantity;
        const priceDollar = product.SaleProduct.priceDollar;
        const priceBs = product.SaleProduct.priceBs;
        const costDollar = product.SaleProduct.costDollar || product.costDollar;
        
        totalProfitDollar += (priceDollar - costDollar) * qty;
        
        const rateAtSale = priceDollar > 0 ? (priceBs / priceDollar) : 0;
        totalProfitBs += (priceBs - (costDollar * rateAtSale)) * qty;
      });
    });

    const closure = await DailyClosure.create({
      closureDate: today,
      totalSalesCount: sales.length,
      totalRevenueBs,
      totalRevenueDollar,
      totalProfitBs,
      totalProfitDollar,
      exchangeRate: exchangeRateData ? exchangeRateData.rate : 0,
      profitPercentage: exchangeRateData ? exchangeRateData.profitPercentage : 0,
      status: 'closed',
      userId: req.user.id
    });

    res.status(201).json(closure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
