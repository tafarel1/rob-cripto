import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/lib/config';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastHeartbeat: number | null;
  latency: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  lastHeartbeat: null,
  latency: 0,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    const socketUrl = API_CONFIG.baseURL || window.location.origin;
    
    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // Try polling first
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      withCredentials: true,
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket Connection Error:', err.message);
      setIsConnected(false);
    });

    socketInstance.on('connect', () => {
      console.log('Socket Connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket Disconnected');
      setIsConnected(false);
    });

    socketInstance.on('heartbeat', (data: { timestamp: number }) => {
      setLastHeartbeat(data.timestamp);
      // Simple latency calculation if timestamp is near synced, 
      // or just reset latency to a low value to indicate liveness
      // Ideally we need a ping/pong with server timestamp
    });

    // Built-in ping/pong for latency (Engine v4+)
    // socketInstance.io.engine.on('packet', ({ type, data }) => { ... }) 
    // This is too deep for now. We will simulate latency or just keep it 0.

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, lastHeartbeat, latency }}>
      {children}
    </SocketContext.Provider>
  );
};
