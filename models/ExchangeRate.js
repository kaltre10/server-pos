const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExchangeRate = sequelize.define('ExchangeRate', {
  rate: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  profitPercentage: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  }
}, {
  timestamps: true
});

module.exports = ExchangeRate;