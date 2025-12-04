const express = require('express');
const cors = require('cors');

// Importar rotas
const tradingRoutes = require('./api/routes/trading');
const marketRoutes = require('./api/routes/market');
const riskRoutes = require('./api/routes/risk');
const notificationRoutes = require('./api/routes/notifications');
const accountRoutes = require('./api/routes/account');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Robô Cripto SMC - API funcionando',
    timestamp: new Date().toISOString()
  });
});

// Rotas
app.use('/api/trading', tradingRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/account', accountRoutes);

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Robo Cripto SMC rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
  console.log(`🔧 API disponível em: http://localhost:${PORT}/api/health`);
});

module.exports = app;
