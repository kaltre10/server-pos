const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';
let sequelize;

if (dbType === 'mysql') {
  const mysql = require('mysql2');
  
  // Create a synchronous connection to MySQL server
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || ''
  });

  // Create the database if it doesn't exist
  connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'inventas'};`, (error) => {
    if (error) {
      console.error('Error creating database:', error);
    } else {
      console.log(`Database "${process.env.DB_NAME || 'inventas'}" is ready.`);
    }
    connection.end();
  });

  sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'inventas',
    logging: false,
    timezone: '-04:00',
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
      timezone: '-04:00'
    }
  });
} else if (dbType === 'postgres' || dbType === 'supabase') {
  // Postgres/Supabase configuration
  // Prefer a full connection string if provided (e.g., from Supabase)
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const pgConfig = {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  };

  if (connectionString) {
    sequelize = new Sequelize(connectionString, pgConfig);
    console.log('Using Postgres via connection string (Supabase compatible).');
  } else {
    // Fallback to discrete env vars
    sequelize = new Sequelize({
      dialect: 'postgres',
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
      username: process.env.PGUSER || process.env.DB_USER,
      password: process.env.PGPASSWORD || process.env.DB_PASS,
      database: process.env.PGDATABASE || process.env.DB_NAME || 'inventas',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
    console.log(`Using Postgres connection to ${process.env.PGHOST || process.env.DB_HOST || 'localhost'}:${process.env.PGPORT || '5432'}`);
  }
} else {
  // SQLite configuration using sqlite3
  const sqlitePath = process.env.DB_STORAGE || './database.sqlite';
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: false
  });
  console.log(`Using SQLite database (sqlite3) at: ${sqlitePath}`);
}

module.exports = sequelize;
