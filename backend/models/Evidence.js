const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Plan = require('./Plan');

const Evidence = sequelize.define('Evidence', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  recipient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  original_filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  idempotency_key: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  payload_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  submitted_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
}, {
  tableName: 'evidence',
  timestamps: true,
  indexes: [
    {
      unique: true,
      name: 'uq_evidence_plan_recipient_idempotency',
      fields: ['plan_id', 'recipient_id', 'idempotency_key'],
    },
  ],
});

Evidence.belongsTo(Plan, { as: 'plan', foreignKey: 'plan_id' });
Plan.hasMany(Evidence, { as: 'evidences', foreignKey: 'plan_id' });
Evidence.belongsTo(User, { as: 'recipient', foreignKey: 'recipient_id' });
User.hasMany(Evidence, { as: 'submittedEvidences', foreignKey: 'recipient_id' });

module.exports = Evidence;
