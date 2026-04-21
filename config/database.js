const { Sequelize } = require('sequelize');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL

if (!global.sequelize) {
  global.sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
      acquire: 30000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
}

module.exports = global.sequelize;