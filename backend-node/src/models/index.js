const sequelize = require('../config/database');
const User = require('./User');
const Loan = require('./Loan');
const Transaction = require('./Transaction');

// Define associations
Loan.belongsTo(User, { foreignKey: 'borrower_id', as: 'borrower' });
User.hasMany(Loan, { foreignKey: 'borrower_id', as: 'loans' });

Transaction.belongsTo(Loan, { foreignKey: 'loan_id', as: 'loan' });
Transaction.belongsTo(User, { foreignKey: 'borrower_id', as: 'borrower' });
User.hasMany(Transaction, { foreignKey: 'borrower_id', as: 'payments' });

module.exports = {
  sequelize,
  User,
  Loan,
  Transaction
};
