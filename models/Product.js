const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  photo: {
    type: DataTypes.STRING
  },
  costDollar: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  salePriceDollar: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  salePriceBs: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  timestamps: true
});

module.exports = Product;