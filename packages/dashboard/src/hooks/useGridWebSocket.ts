import { useEffect, useRef, useCallback } from 'react';
import { WsMessage } from '../types';

type Handler = (msg: WsMessage) => void;

const WS_URL = (import.meta as { env: { VITE_WS_URL?: string } }).env.VITE_WS_URL ?? 'ws://localhost:3001/ws';
const RECONNECT_DELAY_MS = 3000;

export function useGridWebSocket(onMessage: Handler) {
  const socketRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<Handler>(onMessage);
  handlerRef.current = onMessage;

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => console.log('[WS] connected');
    ws.onclose = () => {
      console.log(`[WS] closed — reconnecting in ${RECONNECT_DELAY_MS}ms`);
      setTimeout(connect, RECONNECT_DELAY_MS);
    };
    ws.onerror = (e) => console.error('[WS] error', e);
    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        handlerRef.current(msg);
      } catch {
        console.warn('[WS] unparseable message', e.data);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.close();
    };
  }, [connect]);
}
