const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'operational_manager', 'hr_manager', 'department_manager', 'team_manager', 'employee'),
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  team: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  report_portfolio: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quarter_batch: {
    type: DataTypes.ENUM('Q1', 'Q2', 'Q3', 'Q4', 'ALL'),
    allowNull: true,
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  profile_picture: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'users',
  timestamps: true,
});

// Self-referencing association for manager-employee relationship
User.belongsTo(User, { as: 'manager', foreignKey: 'manager_id' });
User.hasMany(User, { as: 'subordinates', foreignKey: 'manager_id' });

module.exports = User;
