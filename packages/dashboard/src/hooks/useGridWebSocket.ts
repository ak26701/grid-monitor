import { useEffect, useRef, useCallback } from 'react';
import { WsMessage } from '../types';
import { ConnectionStatus } from './useGridData';

type Handler = (msg: WsMessage) => void;
type StatusHandler = (s: ConnectionStatus) => void;

const WS_URL = (import.meta as { env: { VITE_WS_URL?: string } }).env.VITE_WS_URL ?? 'ws://localhost:3001/ws';
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 15000;

export function useGridWebSocket(onMessage: Handler, onStatusChange: StatusHandler) {
  const socketRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<Handler>(onMessage);
  const statusRef = useRef<StatusHandler>(onStatusChange);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  handlerRef.current = onMessage;
  statusRef.current = onStatusChange;

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    statusRef.current('connecting');
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      console.log('[WS] connected');
      reconnectAttemptsRef.current = 0;
      statusRef.current('connected');
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      statusRef.current('disconnected');
      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(1.5, reconnectAttemptsRef.current),
        RECONNECT_MAX_MS,
      );
      reconnectAttemptsRef.current++;
      console.log(`[WS] closed — reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current})`);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onclose fires immediately after onerror — no duplicate logging needed
    };

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
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [connect]);
}
