import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createWsServer } from './ws';
import readingsRouter from './routes/readings';
import gridRouter from './routes/grid';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const USE_MOCK = process.env.USE_MOCK === 'true';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', mode: USE_MOCK ? 'mock' : 'fabric', ts: new Date().toISOString() }),
);

// API routes
app.use('/api/readings', readingsRouter);
app.use('/api/grid', gridRouter);

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Attach WS server to the same HTTP server
const server = createServer(app);
createWsServer(server);

server.listen(PORT, () => {
  console.log(`[API] listening on http://localhost:${PORT}  (mode: ${USE_MOCK ? 'MOCK' : 'FABRIC'})`);
  console.log(`[WS]  listening on ws://localhost:${PORT}/ws`);
});

// In mock mode, launch the IoT simulator in-process after a short boot delay
// so readings start flowing immediately without needing a separate terminal.
if (USE_MOCK) {
  setTimeout(() => {
    console.log('[SIM] starting in-process simulator...');
    import('./simulator').catch((e: Error) => {
      console.error('[SIM] failed to start simulator:', e.message);
    });
  }, 500);
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[API] shutting down...');
  if (!USE_MOCK) {
    const { disconnect } = await import('./fabricClient');
    await disconnect();
  }
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
