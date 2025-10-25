import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      return;
    }

    // Connect to Socket.IO
    const socket = io(`${SOCKET_URL}/events`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const on = (event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    socketRef.current?.off(event, callback);
  };

  return {
    socket: socketRef.current,
    isConnected,
    on,
    off,
  };
}
