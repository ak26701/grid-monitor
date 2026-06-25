import { Router, Request, Response } from 'express';
import { companies } from '../data/companies';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(companies);
});

router.get('/:id', (req: Request, res: Response) => {
  const c = companies.find(c => c.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  return res.json(c);
});

export default router;
