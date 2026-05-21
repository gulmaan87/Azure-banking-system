/**
 * useSignalR.js — React hook for real-time alerts via Azure SignalR
 *
 * How it works:
 *   1. Calls /api/signalr/negotiate to get the SignalR Service URL + token
 *   2. Establishes a WebSocket connection to Azure SignalR Service
 *   3. Returns event handlers so components can subscribe to specific events
 *
 * In dev mode (no SIGNALR_CONNECTION_STRING): 
 *   - Negotiate returns { devMode: true }
 *   - Connection is skipped, returns a mock dispatcher for testing
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import * as signalR from '@microsoft/signalr';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Normalize: Trim trailing slash
if (API_URL.endsWith('/')) {
  API_URL = API_URL.slice(0, -1);
}

// Check for mixed content issues to fail-fast
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
      // Step 1: Ask backend for the negotiate URL
      const negotiate = await fetch(`${API_URL}/signalr/negotiate`).then(r => r.json());

      if (negotiate.devMode || !negotiate.url) {
        console.log('ℹ️  SignalR: dev mode — real-time disabled');
        setDevMode(true);
        return;
      }

      // Step 2: Build SignalR connection to Azure SignalR Service
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(negotiate.url, {
          accessTokenFactory: () => negotiate.accessToken,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      // Step 3: Register all event handlers
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
