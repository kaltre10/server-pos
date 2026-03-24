const express = require('express');
const { Sale, SaleProduct } = require('../models/Sale');
const Product = require('../models/Product');
const ExchangeRate = require('../models/ExchangeRate');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const router = express.Router();

// Get all sales with products and optional filters
router.get('/', async (req, res) => {
  try {
    const { id, startDate, endDate } = req.query;
    const where = {};

    // Priorizamos la búsqueda por ID si se proporciona y no está vacío
    if (id && id.trim() !== '') {
      // Limpiamos el ID de ceros a la izquierda para la búsqueda numérica si es necesario,
      // pero mantenemos la capacidad de buscar por coincidencia parcial (LIKE)
      // Para IDs numéricos en MySQL, podemos usar CAST o simplemente manejarlo como string en el LIKE
      const cleanId = id.replace(/^0+/, ''); // Quitamos ceros iniciales para buscar el número real
      
      if (cleanId === '') {
        // Si el usuario puso "000", buscamos el ID literal 0 si existiera (poco probable en autoincrement)
        where.id = 0;
      } else {
        // Buscamos coincidencias que contengan el número ingresado
        where.id = { [Op.like]: `%${cleanId}%` };
      }
    } 
    // Si no hay ID, aplicamos el rango de fechas
    else if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        // Aseguramos el inicio del día
        where.createdAt[Op.gte] = `${startDate} 00:00:00`;
      }
      if (endDate) {
        // Aseguramos el fin del día
        where.createdAt[Op.lte] = `${endDate} 23:59:59`;
      }
    }

    const sales = await Sale.findAll({
      where,
      include: [Product],
      order: [['createdAt', 'DESC']]
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single sale with products
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [Product]
    });
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new sale
router.post('/', async (req, res) => {
  try {
    const { products } = req.body;
    // Get latest exchange rate at the time of sale
    const latestRateObj = await ExchangeRate.findOne({ order: [['createdAt', 'DESC']] });
    const currentRate = latestRateObj ? latestRateObj.rate : 1;
    
    // Calculate totals
    let totalAmountBs = 0;
    let totalAmountDollar = 0;
    
    for (const item of products) {
      const product = await Product.findByPk(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product with id ${item.productId} not found` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for product ${product.name}` });
      }
      
      // Use dynamic Bs based on current exchange rate; USD remains as product price
      const priceDollar = product.salePriceDollar;
      const priceBsDynamic = priceDollar * currentRate;
      totalAmountBs += priceBsDynamic * item.quantity;
      totalAmountDollar += product.salePriceDollar * item.quantity;
      
      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }
    
    // Create sale
    const sale = await Sale.create({
      totalAmountBs,
      totalAmountDollar
    });
    
    // Create sale products
    for (const item of products) {
      const product = await Product.findByPk(item.productId);
      await sale.addProduct(product, {
        through: {
          quantity: item.quantity,
          // Persist prices used at sale time
          priceBs: product.salePriceDollar * currentRate,
          priceDollar: product.salePriceDollar,
          costDollar: product.costDollar
        }
      });
    }
    
    // Include products in the response
    const saleWithProducts = await Sale.findByPk(sale.id, {
      include: [Product]
    });
    
    res.status(201).json(saleWithProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Void a sale and restore stock
router.post('/:id/void', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [Product]
    });

    if (!sale) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    if (sale.status === 'voided') {
      await transaction.rollback();
      return res.status(400).json({ message: 'La venta ya ha sido anulada' });
    }

    // Restore stock for each product in the sale
    for (const product of sale.Products) {
      const quantity = product.SaleProduct.quantity;
      await Product.update(
        { stock: sequelize.literal(`stock + ${quantity}`) },
        { where: { id: product.id }, transaction }
      );
    }

    // Update sale status
    sale.status = 'voided';
    await sale.save({ transaction });

    await transaction.commit();
    
    // Return updated sale with products
    const updatedSale = await Sale.findByPk(sale.id, {
      include: [Product]
    });
    
    res.json(updatedSale);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

// Get sales statistics with filters
router.get('/statistics/summary', async (req, res) => {
  try {
    const { startDate, endDate, period } = req.query;
    
    // Set default dates to today if not provided
    const today = new Date().toISOString().split('T')[0];
    const actualStartDate = startDate || today;
    const actualEndDate = endDate || today;

    // Base where clause for sales (only completed sales in date range)
    const where = { 
      status: 'completed',
      createdAt: {
        [Op.gte]: `${actualStartDate} 00:00:00`,
        [Op.lte]: `${actualEndDate} 23:59:59`
      }
    };

    // 1. General Metrics
    const totalSales = await Sale.count({ where });
    const totalRevenueBs = await Sale.sum('totalAmountBs', { where }) || 0;
    const totalRevenueDollar = await Sale.sum('totalAmountDollar', { where }) || 0;

    // 2. Profit Calculation - Use the stored costDollar and historical rate
    const completedSales = await Sale.findAll({
      where,
      include: [{
        model: Product,
        through: { attributes: ['quantity', 'priceBs', 'priceDollar', 'costDollar'] }
      }]
    });

    let totalProfitDollar = 0;
    let totalProfitBs = 0;

    completedSales.forEach(sale => {
      sale.Products.forEach(product => {
        const qty = product.SaleProduct.quantity;
        const priceDollar = product.SaleProduct.priceDollar;
        const priceBs = product.SaleProduct.priceBs;
        const costDollar = product.SaleProduct.costDollar || product.costDollar;
        
        // Profit in Dollar is stable
        totalProfitDollar += (priceDollar - costDollar) * qty;
        
        // Profit in Bs depends on the rate at the time of sale
        // Rate at sale = priceBs / priceDollar (if priceDollar > 0)
        const rateAtSale = priceDollar > 0 ? (priceBs / priceDollar) : 0;
        totalProfitBs += (priceBs - (costDollar * rateAtSale)) * qty;
      });
    });

    // 3. Top 10 Products
    let topProductsInfo = [];
    if (completedSales.length > 0) {
      const saleIds = completedSales.map(s => s.id);

      const topProducts = await SaleProduct.findAll({
        where: {
          SaleId: { [Op.in]: saleIds }
        },
        attributes: [
          'ProductId', 
          [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
          [sequelize.fn('SUM', sequelize.literal('SaleProduct.quantity * SaleProduct.priceBs')), 'totalRevenueBs']
        ],
        group: ['ProductId'],
        order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
        limit: 10
      });

      topProductsInfo = await Promise.all(topProducts.map(async (item) => {
        const product = await Product.findByPk(item.ProductId);
        return {
          product: product ? product.name : 'Desconocido',
          totalQuantity: parseInt(item.dataValues.totalQuantity || 0),
          totalRevenueBs: parseFloat(item.dataValues.totalRevenueBs || 0)
        };
      }));
    }

    // 4. Chart Data
    let dateFunc;
    const dialect = sequelize.getDialect();
    if (dialect === 'sqlite') {
      if (period === 'month') {
        dateFunc = [sequelize.fn('strftime', '%Y-%m', sequelize.col('createdAt')), 'date'];
      } else if (period === 'year') {
        dateFunc = [sequelize.fn('strftime', '%Y', sequelize.col('createdAt')), 'date'];
      } else {
        dateFunc = [sequelize.fn('strftime', '%Y-%m-%d', sequelize.col('createdAt')), 'date'];
      }
    } else if (dialect === 'mysql') {
      let dateFormat = '%Y-%m-%d';
      if (period === 'month') dateFormat = '%Y-%m';
      if (period === 'year') dateFormat = '%Y';
      dateFunc = [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), dateFormat), 'date'];
    } else if (dialect === 'postgres') {
      // Use to_char for formatting in Postgres
      let dateFormat = 'YYYY-MM-DD';
      if (period === 'month') dateFormat = 'YYYY-MM';
      if (period === 'year') dateFormat = 'YYYY';
      dateFunc = [sequelize.fn('to_char', sequelize.col('createdAt'), dateFormat), 'date'];
    } else {
      // Fallback: ISO date string by day
      dateFunc = [sequelize.col('createdAt'), 'date'];
    }

    const salesHistory = await Sale.findAll({
      where,
      attributes: [
        dateFunc,
        [sequelize.fn('SUM', sequelize.col('totalAmountBs')), 'revenueBs'],
        [sequelize.fn('SUM', sequelize.col('totalAmountDollar')), 'revenueDollar'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [dateFunc[0]],
      order: [[dateFunc[0], 'ASC']]
    });

    const latestConfig = await ExchangeRate.findOne({ order: [['createdAt', 'DESC']] });

    res.json({
      metrics: {
        totalSales,
        totalRevenueBs,
        totalRevenueDollar,
        estimatedProfitBs: totalProfitBs,
        estimatedProfitDollar: totalProfitDollar,
        profitPercentage: latestConfig ? latestConfig.profitPercentage : 0
      },
      topProducts: topProductsInfo,
      chartData: salesHistory.map(s => ({
        date: s.dataValues.date,
        revenueBs: parseFloat(s.dataValues.revenueBs || 0),
        revenueDollar: parseFloat(s.dataValues.revenueDollar || 0),
        count: parseInt(s.dataValues.count || 0)
      }))
    });
  } catch (error) {
    console.error('Error in /statistics/summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
