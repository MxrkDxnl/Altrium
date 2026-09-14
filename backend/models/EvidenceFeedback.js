const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Evidence = require('./Evidence');
const Plan = require('./Plan');
const User = require('./User');

const EvidenceFeedback = sequelize.define('EvidenceFeedback', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  evidence_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  feedback_text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  idempotency_key: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
}, {
  tableName: 'evidence_feedback',
  timestamps: true,
  indexes: [
    {
      unique: true,
      name: 'uq_evidence_feedback_idempotency',
      fields: ['evidence_id', 'manager_id', 'idempotency_key'],
    },
  ],
});

EvidenceFeedback.belongsTo(Evidence, { as: 'evidence', foreignKey: 'evidence_id' });
Evidence.hasMany(EvidenceFeedback, { as: 'feedbacks', foreignKey: 'evidence_id' });

EvidenceFeedback.belongsTo(Plan, { as: 'plan', foreignKey: 'plan_id' });
Plan.hasMany(EvidenceFeedback, { as: 'feedbacks', foreignKey: 'plan_id' });

EvidenceFeedback.belongsTo(User, { as: 'manager', foreignKey: 'manager_id' });
User.hasMany(EvidenceFeedback, { as: 'givenFeedbacks', foreignKey: 'manager_id' });

module.exports = EvidenceFeedback;
