import { Router, Request, Response } from 'express';
import { getContract } from '../fabricClient';
import { broadcast } from '../ws';

const router = Router();

/** GET /api/grid/state — current aggregate grid state */
router.get('/state', async (_req: Request, res: Response) => {
  try {
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
  try {
    const contract = await getContract();
    const bytes = await contract.evaluateTransaction('GetActiveEvents');
    return res.json(JSON.parse(bytes.toString()));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

/** POST /api/grid/events/:eventId/resolve */
router.post('/events/:eventId/resolve', async (req: Request, res: Response) => {
  try {
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
