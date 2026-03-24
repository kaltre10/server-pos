const express = require('express');
const Product = require('../models/Product');
const { SaleProduct } = require('../models/Sale');
const ExchangeRate = require('../models/ExchangeRate');
const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate prices based on latest configuration
// Solo calcula si no se proporcionan los precios de venta
const calculatePrices = async (productData) => {
  // Si ya vienen los precios de venta en el body, los respetamos
  if (productData.salePriceDollar && productData.salePriceBs) {
    return productData;
  }

  const latestConfig = await ExchangeRate.findOne({ order: [['createdAt', 'DESC']] });
  if (latestConfig && productData.costDollar) {
    const salePriceDollarCalculated = productData.costDollar * (1 + latestConfig.profitPercentage / 100);
    const salePriceBsCalculated = salePriceDollarCalculated * latestConfig.rate;
    return {
      ...productData,
      salePriceDollar: productData.salePriceDollar || salePriceDollarCalculated,
      salePriceBs: productData.salePriceBs || salePriceBsCalculated
    };
  }
  return productData;
};

// Create a product
router.post('/', async (req, res) => {
  try {
    const productData = await calculatePrices(req.body);
    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a product
router.put('/:id', async (req, res) => {
  try {
    const productData = await calculatePrices(req.body);
    const [updated] = await Product.update(productData, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedProduct = await Product.findByPk(req.params.id);
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a product
router.delete('/:id', async (req, res) => {
  try {
    const hasSales = await SaleProduct.count({ where: { ProductId: req.params.id } });
    if (hasSales > 0) {
      return res.status(409).json({ message: 'No se puede eliminar el producto porque tiene ventas asociadas.' });
    }
    const deleted = await Product.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
