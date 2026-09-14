const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  link: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  timestamps: true,
});

Notification.belongsTo(User, { as: 'recipient', foreignKey: 'user_id' });
User.hasMany(Notification, { foreignKey: 'user_id' });

module.exports = Notification;
