import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Importar rotas
import accountRoutes from './backend/api/routes/account.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/account', accountRoutes);

// Rota API simples para health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Robo Cripto SMC - Servidor Online',
    timestamp: new Date().toISOString()
  });
});

// Servir arquivos estáticos do build (em produção)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Rota para servir o frontend (SPA)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Export for Vercel serverless functions
export default app;

// Start server only if not in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Robo Cripto SMC rodando na porta ${PORT}`);
    console.log(`📊 Acesse: http://localhost:${PORT}`);
    console.log(`💰 Sistema de Conta Dual ativado`);
  });
}