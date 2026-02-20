const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const loanRoutes = require('./routes/loans');
const transactionRoutes = require('./routes/transactions');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS middleware - Configure with explicit origins for security
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/transactions', transactionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Okoleo Loan Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      loans: '/api/loans',
      transactions: '/api/transactions'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection (skip for now, use in-memory or mock)
    console.log('⚠ Database connection skipped (configure PostgreSQL to enable)');

    // Start server without database sync for now
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Endpoints:`);
      console.log(`   - Health: http://localhost:${PORT}/health`);
      console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
      console.log(`   - Loans: http://localhost:${PORT}/api/loans`);
      console.log(`   - Transactions: http://localhost:${PORT}/api/transactions`);
      console.log(`\n⚠ Note: Database not connected. Configure PostgreSQL in .env to enable full functionality.`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
