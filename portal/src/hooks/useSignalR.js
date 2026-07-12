












import { useEffect, useRef, useCallback, useState } from 'react';
import * as signalR from '@microsoft/signalr';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';


if (API_URL.endsWith('/')) {
  API_URL = API_URL.slice(0, -1);
}


const checkMixedContent = (url) => {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (url.startsWith('http://')) {
      const isLocalhost = url.includes('://localhost') || url.includes('://127.0.0.1');
      if (!isLocalhost) {
        throw new Error(
          `Insecure Connection Blocked: Portal is running on secure HTTPS, but the API URL is configured to use insecure HTTP: ${url}. A secure HTTPS API endpoint is required for production connectivity.`
        );
      }
    }
  }
};

export const useSignalR = (onEvent) => {
  const connectionRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [devMode,   setDevMode]   = useState(false);

  const connect = useCallback(async () => {
    try {
      checkMixedContent(API_URL);
      
      const negotiate = await fetch(`${API_URL}/signalr/negotiate`).then(r => r.json());

      if (negotiate.devMode || !negotiate.url) {
        console.log('ℹ️  SignalR: dev mode — real-time disabled');
        setDevMode(true);
        return;
      }

      
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(negotiate.url, {
          accessTokenFactory: () => negotiate.accessToken,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      
      const events = ['AmlAlert', 'CustomerUpdated', 'TransactionCreated', 'KycStatusChanged'];
      events.forEach(event => {
        connection.on(event, (data) => {
          console.log(`[SignalR] ${event}:`, data);
          onEvent?.(event, data);
        });
      });

      connection.onreconnecting(() => setConnected(false));
      connection.onreconnected(() => setConnected(true));
      connection.onclose(() => setConnected(false));

      await connection.start();
      connectionRef.current = connection;
      setConnected(true);
      console.log('✅ SignalR connected to adminHub');
    } catch (err) {
      console.error('[SignalR] Connection failed:', err.message);
    }
  }, [onEvent]);

  useEffect(() => {
    connect();
    return () => {
      connectionRef.current?.stop();
    };
  }, [connect]);

  return { connected, devMode };
};
