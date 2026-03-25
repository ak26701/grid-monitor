import { Router, Request, Response } from 'express';
import { broadcast } from '../ws';

const router = Router();
const USE_MOCK = process.env.USE_MOCK === 'true';

/** GET /api/grid/state — current aggregate grid state */
router.get('/state', async (_req: Request, res: Response) => {
  if (USE_MOCK) {
    const { getGridState } = await import('../mockStore');
    return res.json(getGridState());
  }
  try {
    const { getContract } = await import('../fabricClient');
    const contract = await getContract();
    const bytes = await contract.evaluateTransaction('GetGridState');
    return res.json(JSON.parse(bytes.toString()));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

/** GET /api/grid/events — all unresolved grid events */
router.get('/events', async (_req: Request, res: Response) => {
  if (USE_MOCK) {
    const { getActiveEvents } = await import('../mockStore');
    return res.json(getActiveEvents());
  }
  try {
    const { getContract } = await import('../fabricClient');
    const contract = await getContract();
    const bytes = await contract.evaluateTransaction('GetActiveEvents');
    return res.json(JSON.parse(bytes.toString()));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

/** GET /api/grid/events/all — all events including resolved */
router.get('/events/all', async (_req: Request, res: Response) => {
  if (USE_MOCK) {
    const { getAllEvents } = await import('../mockStore');
    const limit = parseInt(String((_req as Request & { query: Record<string, string> }).query.limit ?? '100'), 10);
    return res.json(getAllEvents(limit));
  }
  return res.status(501).json({ error: 'Not implemented for Fabric mode.' });
});

/** GET /api/grid/participants — latest snapshot per participant */
router.get('/participants', async (_req: Request, res: Response) => {
  if (USE_MOCK) {
    const { getParticipantSnapshots } = await import('../mockStore');
    return res.json(getParticipantSnapshots());
  }
  return res.status(501).json({ error: 'Not implemented for Fabric mode.' });
});

/** GET /api/grid/network — Fabric network / ledger stats */
router.get('/network', async (_req: Request, res: Response) => {
  if (USE_MOCK) {
    const { getNetworkStats } = await import('../mockStore');
    return res.json(getNetworkStats());
  }
  return res.status(501).json({ error: 'Not implemented for Fabric mode.' });
});

/** POST /api/grid/events/:eventId/resolve */
router.post('/events/:eventId/resolve', async (req: Request, res: Response) => {
  if (USE_MOCK) {
    try {
      const { resolveEvent } = await import('../mockStore');
      resolveEvent(req.params.eventId);
      broadcast({ type: 'event_resolved', payload: { eventId: req.params.eventId } });
      return res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(404).json({ error: message });
    }
  }

  try {
    const { getContract } = await import('../fabricClient');
    const contract = await getContract();
    await contract.submitTransaction('ResolveEvent', req.params.eventId);
    broadcast({ type: 'event_resolved', payload: { eventId: req.params.eventId } });
    return res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

export default router;
