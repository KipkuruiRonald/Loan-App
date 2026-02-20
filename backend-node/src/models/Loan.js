const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ============================================================
// OKOLEO 9-DAY LOAN MODEL (Section 1.1)
// ============================================================
const Loan = sequelize.define('Loan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  loan_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  borrower_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  borrower_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // ============================================================
  // OKOLEO 9-DAY LOAN PARAMETERS
  // ============================================================
  principal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false  // Loan amount in KSh (500-15000)
  },
  interest_rate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.0400  // Annual rate = 4%
  },
  term_days: {
    type: DataTypes.INTEGER,
    defaultValue: 9  // Fixed 9-day term
  },
  
  // Fee structure
  processing_fee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00  // Flat processing fee
  },
  
  // Calculated fields
  interest_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00  // Interest for the term
  },
  total_due: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false  // principal + interest + fees
  },
  
  // Repayment tracking
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  late_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0  // Days past due_date
  },
  perfect_repayment: {
    type: DataTypes.BOOLEAN,
    defaultValue: false  // True if paid on/before due_date
  },
  
  // Late penalty (6.8% of principal, not outstanding)
  late_penalty_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
   
  // Status
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'active', 'defaulted', 'completed', 'settled'),
    defaultValue: 'draft'
  },
  borrower_credit_score: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'loans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Loan;
