import { useEffect, useRef } from 'react';
import { MarketAlert, PricePoint } from '../types';

interface WsMessage {
  type: 'price_update' | 'new_alert';
  payload: unknown;
}

interface Handlers {
  onPriceUpdate: (p: { index: PricePoint }) => void;
  onNewAlert: (a: MarketAlert) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function useWebSocket(handlers: Handlers) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => handlersRef.current.onConnect();
      ws.onclose = () => {
        handlersRef.current.onDisconnect();
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as WsMessage;
          if (msg.type === 'price_update') {
            handlersRef.current.onPriceUpdate(msg.payload as { index: PricePoint });
          } else if (msg.type === 'new_alert') {
            handlersRef.current.onNewAlert(msg.payload as MarketAlert);
          }
        } catch { /* ignore */ }
      };
    }

    connect();
    return () => { wsRef.current?.close(); };
  }, []);
}
