const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Importar rotas
const tradingRoutes = require('./routes/trading');
const marketRoutes = require('./routes/market');
const riskRoutes = require('./routes/risk');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/trading', tradingRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/notifications', notificationRoutes);

// WebSocket para dados em tempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Exportar para Vercel
module.exports = app;