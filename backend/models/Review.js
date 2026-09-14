const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Task = require('./Task');
const User = require('./User');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  content: {
    type: DataTypes.JSON, // Stores the form fields
    allowNull: false,
  },
  submitted_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'reviews',
  timestamps: true,
});

// Associations
Review.belongsTo(Task, { foreignKey: 'task_id' });
Review.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewer_id' });
Review.belongsTo(User, { as: 'reviewee', foreignKey: 'reviewee_id' });

module.exports = Review;
