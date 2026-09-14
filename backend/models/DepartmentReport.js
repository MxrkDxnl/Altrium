const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const DepartmentReport = sequelize.define('DepartmentReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  department: {
    type: DataTypes.STRING(50),
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  reviews_summary: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  pip_summary: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  pdp_summary: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  author_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  recipient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  original_filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  revision_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  revision_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_latest: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  parent_report_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  submission_key: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  payload_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'department_reports',
  timestamps: true,
});

DepartmentReport.belongsTo(User, { as: 'author', foreignKey: 'author_id' });
User.hasMany(DepartmentReport, { as: 'authoredReports', foreignKey: 'author_id' });

DepartmentReport.belongsTo(User, { as: 'recipient', foreignKey: 'recipient_id' });
User.hasMany(DepartmentReport, { as: 'receivedReports', foreignKey: 'recipient_id' });

DepartmentReport.belongsTo(DepartmentReport, { as: 'parentReport', foreignKey: 'parent_report_id' });
DepartmentReport.hasMany(DepartmentReport, { as: 'revisions', foreignKey: 'parent_report_id' });

module.exports = DepartmentReport;
