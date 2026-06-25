import { Router, Request, Response } from 'express';
import { providers } from '../data/providers';
import { livePrices } from '../simulator';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const enriched = providers.map(p => ({
    ...p,
    livePrices: livePrices[p.id] ?? {},
  }));
  res.json(enriched);
});

router.get('/:id', (req: Request, res: Response) => {
  const p = providers.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Provider not found' });
  return res.json({ ...p, livePrices: livePrices[p.id] ?? {} });
});

export default router;
