const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Product = require('./Product');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  totalAmountBs: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  totalAmountDollar: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('completed', 'voided'),
    defaultValue: 'completed'
  }
}, {
  timestamps: true
});

const SaleProduct = sequelize.define('SaleProduct', {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  priceBs: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  priceDollar: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  costDollar: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  timestamps: true
});

Sale.belongsToMany(Product, { through: SaleProduct });
Product.belongsToMany(Sale, { through: SaleProduct });

SaleProduct.belongsTo(Sale);
SaleProduct.belongsTo(Product);
Sale.hasMany(SaleProduct);
Product.hasMany(SaleProduct);

module.exports = { Sale, SaleProduct };