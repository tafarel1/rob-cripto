import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, 'dist')));

// Rota API simples para health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Robo Cripto SMC - Servidor Online',
    timestamp: new Date().toISOString()
  });
});

// Rota para servir o frontend (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Robo Cripto SMC rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
});