const { Sequelize } = require('sequelize');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const isLocalDatabase = /localhost|127\.0\.0\.1/i.test(connectionString || '');
const useSsl = process.env.DB_SSL
  ? process.env.DB_SSL === 'true'
  : !isLocalDatabase;

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
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });
}

module.exports = global.sequelize;
