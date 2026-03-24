const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
// const path = require('path');

// Set process timezone to Venezuela
process.env.TZ = 'America/Caracas';

const sequelize = require('../config/database');

// Import models
// const Product = require('./models/Product');
// const ExchangeRate = require('./models/ExchangeRate');
// const { Sale, SaleProduct } = require('./models/Sale');
// const DailyClosure = require('./models/DailyClosure');

// Import routes
const productRoutes = require('../routes/products');
const saleRoutes = require('../routes/sales');
const exchangeRateRoutes = require('../routes/exchangeRates');
const closureRoutes = require('../routes/closures');
const authRoutes = require('../routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API funcionando 🚀' });
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/exchange-rates', exchangeRateRoutes);
app.use('/api/closures', closureRoutes);
app.use('/api/auth', authRoutes);

async function syncDatabase() {
  try {
    console.log('Intentando conectar con la base de datos...');
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    await sequelize.sync();
    // console.log('Modelos sincronizados con la base de datos.');
  } catch (error) {
    console.error('ERROR CRÍTICO: No se pudo conectar/sincronizar la base de datos:', error);
    // No matamos el proceso para permitir que los logs se guarden
  }
}
// Start server
// const PORT = process.env.PORT || 5000;

  syncDatabase();
  // app.listen(PORT, () => {
  //   console.log(`Servidor iniciado en el puerto ${PORT}`);
  //   syncDatabase();
  // });
module.exports = app;