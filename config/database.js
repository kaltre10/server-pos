const { Sequelize } = require('sequelize');
const pg = require('pg');

const connectionString = "postgresql://postgres.amqhlxpmcacpwnnhjjac:Milka140225-.@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

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