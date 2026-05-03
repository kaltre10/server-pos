const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const DailyClosure = sequelize.define('DailyClosure', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  closureDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  },
  totalSalesCount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  totalRevenueBs: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  totalRevenueDollar: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  totalProfitBs: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  totalProfitDollar: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  exchangeRate: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  profitPercentage: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('open', 'closed'),
    defaultValue: 'closed'
  }
}, {
  timestamps: true
});

DailyClosure.belongsTo(User, { as: 'ClosedBy', foreignKey: 'userId' });
User.hasMany(DailyClosure, { foreignKey: 'userId' });

module.exports = DailyClosure;
