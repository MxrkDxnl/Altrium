const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  process.env.MYSQL_PRIVATE_URL ||
  process.env.MYSQL_PUBLIC_URL;

const isCloudSsl = process.env.DB_SSL === 'true' || (dbUrl && dbUrl.includes('ssl-mode=REQUIRED'));
const sslConfig = isCloudSsl ? {
  require: true,
  rejectUnauthorized: false
} : false;

let sequelize;

if (dbUrl) {
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`[DB] Connecting to MySQL using connection string: ${maskedUrl}`);
  sequelize = new Sequelize(dbUrl, {
    dialect: 'mysql',
    logging: false,
    dialectOptions: sslConfig ? { ssl: sslConfig } : {}
  });
} else {
  const host = process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway';

  console.log(`[DB] Connecting to MySQL at ${host}:${port}/${database} as user '${user}'...`);

  sequelize = new Sequelize(database, user, password, {
    host,
    port,
    dialect: 'mysql',
    logging: false,
    dialectOptions: sslConfig ? { ssl: sslConfig } : {}
  });
}

module.exports = sequelize;
