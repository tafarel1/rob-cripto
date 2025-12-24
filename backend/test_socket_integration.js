
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});

console.log('Attempting to connect to http://localhost:3000...');

socket.on('connect', () => {
  console.log('✅ Connected with ID:', socket.id);
  
  // Test Subscription
  const symbol = 'BTC/USDT';
  const timeframe = '1h';
  console.log(`Sending subscribe:smc for ${symbol}:${timeframe}`);
  socket.emit('subscribe:smc', { symbol, timeframe });
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection Error:', err.message);
});

socket.on('smc:update', (data) => {
  console.log('📩 Received smc:update:', data.symbol, data.timeframe, 'Signals:', data.data?.signals?.length);
});

socket.on('price:update', (data) => {
  console.log('💱 Received price:update:', data.symbol, data.price);
});

socket.on('engine:status', (data) => {
  console.log('⚙️ Received engine:status:', data.status);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('Closing connection...');
  socket.close();
}, 10000);
