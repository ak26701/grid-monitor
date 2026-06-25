import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import supplyRouter from './routes/supply';
import demandRouter from './routes/demand';
import marketRouter, { pushAlert } from './routes/market';
import matchesRouter from './routes/matches';
import { onPriceUpdate, onAlert } from './simulator';
import { WsMessage } from './types';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', ts: new Date().toISOString() }),
);

app.use('/api/supply', supplyRouter);
app.use('/api/demand', demandRouter);
app.use('/api/market', marketRouter);
app.use('/api/matches', matchesRouter);
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(msg: WsMessage) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

wss.on('connection', (ws) => {
  console.log('[WS] client connected');
  ws.on('close', () => console.log('[WS] client disconnected'));
});

onPriceUpdate((prices, index) => {
  broadcast({ type: 'price_update', payload: { prices, index } });
});

onAlert((alert) => {
  pushAlert(alert);
  broadcast({ type: 'new_alert', payload: alert });
});

server.listen(PORT, () => {
  console.log(`[API] http://localhost:${PORT}`);
  console.log(`[WS]  ws://localhost:${PORT}/ws`);
});

process.on('SIGINT', () => { server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
