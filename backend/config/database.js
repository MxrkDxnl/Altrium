const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  process.env.MYSQL_PRIVATE_URL ||
  process.env.MYSQL_PUBLIC_URL;

const host = process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost';
const isCloudHost = (host && (host.includes('aivencloud.com') || host.includes('rlwy.net'))) ||
                    (dbUrl && (dbUrl.includes('aivencloud.com') || dbUrl.includes('rlwy.net') || dbUrl.includes('ssl-mode=REQUIRED') || dbUrl.includes('ssl=true')));

const isCloudSsl = process.env.DB_SSL === 'true' || isCloudHost;
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
  const port = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway';

  console.log(`[DB] Connecting to MySQL at ${host}:${port}/${database} as user '${user}' (SSL: ${isCloudSsl ? 'ENABLED' : 'DISABLED'})...`);

  sequelize = new Sequelize(database, user, password, {
    host,
    port,
    dialect: 'mysql',
    logging: false,
    dialectOptions: sslConfig ? { ssl: sslConfig } : {}
  });
}

module.exports = sequelize;
