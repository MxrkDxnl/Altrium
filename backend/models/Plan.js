const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.ENUM('PIP', 'PDP'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  quarter: {
    type: DataTypes.ENUM('Q1', 'Q2', 'Q3', 'Q4'),
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'evidence_submitted', 'completed'),
    defaultValue: 'pending',
  },
}, {
  tableName: 'plans',
  timestamps: true,
});

Plan.belongsTo(User, { as: 'manager', foreignKey: 'manager_id' });
Plan.belongsTo(User, { as: 'recipient', foreignKey: 'recipient_id' });

module.exports = Plan;
