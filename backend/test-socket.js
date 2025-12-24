import { io } from 'socket.io-client';

const socket = io('http://127.0.0.1:3000', {
  transports: ['websocket', 'polling'],
  path: '/socket.io'
});

socket.on('connect', () => {
  console.log('Successfully connected to backend!');
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('Timeout connecting to backend');
  process.exit(1);
}, 5000);
