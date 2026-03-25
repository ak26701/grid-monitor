import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createWsServer } from './ws';
import readingsRouter from './routes/readings';
import gridRouter from './routes/grid';
import { disconnect } from './fabricClient';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// API routes
app.use('/api/readings', readingsRouter);
app.use('/api/grid', gridRouter);

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Attach WS server to the same HTTP server
const server = createServer(app);
createWsServer(server);

server.listen(PORT, () => {
  console.log(`[API] listening on http://localhost:${PORT}`);
  console.log(`[WS]  listening on ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[API] shutting down...');
  await disconnect();
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
