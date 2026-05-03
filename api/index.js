const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
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
const userRoutes = require('../routes/users');
const User = require('../models/User');

const app = express();
let databaseInitPromise;

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
app.use('/api/users', userRoutes);

async function syncDatabase() {
  try {
    console.log('Intentando conectar con la base de datos...');
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    
    await sequelize.sync({ alter: true });
    
    // Seed default admin user
    const adminExists = await User.findOne({ where: { username: 'pos2026' } });
    if (!adminExists) {
      await User.create({
        username: 'pos2026',
        password: 'pablo2026-.',
        name: 'Administrador Principal',
        role: 'admin',
        status: 'active'
      });
      console.log('Usuario administrador por defecto creado.');
    }
  } catch (error) {
    console.error('ERROR CRÍTICO: No se pudo conectar/sincronizar la base de datos:', error);
    // No matamos el proceso para permitir que los logs se guarden
  }
}

function initializeDatabase() {
  if (!databaseInitPromise) {
    databaseInitPromise = syncDatabase();
  }

  return databaseInitPromise;
}

initializeDatabase();

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  initializeDatabase().finally(() => {
    app.listen(PORT, () => {
      console.log(`Servidor iniciado en el puerto ${PORT}`);
    });
  });
}

module.exports = app;
