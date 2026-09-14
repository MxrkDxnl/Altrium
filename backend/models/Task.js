const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.ENUM('self_review', 'peer_review', 'upward_review', 'downward_review', 'pip', 'pdp'),
    allowNull: false,
  },
  feedback_type: {
    type: DataTypes.ENUM('self', 'peer', 'upward', 'downward'),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed'),
    defaultValue: 'pending',
  },
  quarter: {
    type: DataTypes.ENUM('Q1', 'Q2', 'Q3', 'Q4'),
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  plan_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  group_subject_ids: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  draft_content: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  submission_key: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  payload_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
}, {
  timestamps: true,
});

// Associations
Task.belongsTo(User, { as: 'assignee', foreignKey: 'assignee_id' }); // Who does the task
Task.belongsTo(User, { as: 'reviewee', foreignKey: 'reviewee_id' }); // Who is being reviewed
const Plan = require('./Plan');
Task.belongsTo(Plan, { as: 'plan', foreignKey: 'plan_id' });
Plan.hasOne(Task, { as: 'task', foreignKey: 'plan_id' });

module.exports = Task;
