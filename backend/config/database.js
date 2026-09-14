const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

const isCloudSsl = process.env.DB_SSL === 'true' || (dbUrl && dbUrl.includes('ssl-mode=REQUIRED'));
const sslConfig = isCloudSsl ? {
  require: true,
  rejectUnauthorized: false
} : false;

let sequelize;

if (dbUrl) {
  sequelize = new Sequelize(dbUrl, {
    dialect: 'mysql',
    logging: false,
    dialectOptions: sslConfig ? { ssl: sslConfig } : {}
  });
} else {
  const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306', 10);
  const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQLDATABASE || 'altrium_fresh_db';

  sequelize = new Sequelize(database, user, password, {
    host,
    port,
    dialect: 'mysql',
    logging: false,
    dialectOptions: sslConfig ? { ssl: sslConfig } : {}
  });
}

module.exports = sequelize;
