import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { WsMessage } from './types';

let wss: WebSocketServer | null = null;

export function createWsServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket: WebSocket, _req: IncomingMessage) => {
    console.log('[WS] client connected — total:', wss!.clients.size);

    socket.on('close', () => {
      console.log('[WS] client disconnected — total:', wss!.clients.size);
    });

    socket.on('error', (err) => {
      console.error('[WS] error:', err.message);
    });
  });

  return wss;
}

/** Broadcast a typed message to all connected WebSocket clients. */
export function broadcast(message: WsMessage): void {
  if (!wss) return;
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
