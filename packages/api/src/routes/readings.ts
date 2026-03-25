import { Router, Request, Response } from 'express';
import { SubmitReadingBody } from '../types';
import { broadcast } from '../ws';

const router = Router();
const USE_MOCK = process.env.USE_MOCK === 'true';

/** POST /api/readings — submit a new IoT sensor reading */
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as SubmitReadingBody;
  const required = ['sensorId', 'participantId', 'role', 'supplyKW', 'demandKW', 'voltageV', 'frequencyHz'];
  const missing = required.filter((k) => body[k as keyof SubmitReadingBody] === undefined);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  if (USE_MOCK) {
    const { submitReading } = await import('../mockStore');
    const result = submitReading({
      sensorId: body.sensorId,
      participantId: body.participantId,
      role: body.role as 'utility' | 'solar_farm' | 'battery_operator' | 'sensor',
      supplyKW: body.supplyKW,
      demandKW: body.demandKW,
      voltageV: body.voltageV,
      frequencyHz: body.frequencyHz,
    });
    return res.status(201).json(result);
  }

  // Fabric path
  try {
    const { getContract } = await import('../fabricClient');
    const contract = await getContract();
    const resultBytes = await contract.submitTransaction(
      'SubmitReading',
      body.sensorId,
      body.participantId,
      body.role,
      String(body.supplyKW),
      String(body.demandKW),
      String(body.voltageV),
      String(body.frequencyHz),
    );
    const result = JSON.parse(resultBytes.toString());

    broadcast({ type: 'new_reading', payload: { ...body, ...result } });

    const stateBytes = await contract.evaluateTransaction('GetGridState');
    broadcast({ type: 'grid_state', payload: JSON.parse(stateBytes.toString()) });

    return res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

/** GET /api/readings — all recent readings (mock only) */
router.get('/', async (_req: Request, res: Response) => {
  if (USE_MOCK) {
    const { getAllReadings } = await import('../mockStore');
    return res.json(getAllReadings(200));
  }
  return res.status(501).json({ error: 'Not implemented for Fabric mode — query by participant.' });
});

/** GET /api/readings/:participantId — last 100 readings for a participant */
router.get('/:participantId', async (req: Request, res: Response) => {
  if (USE_MOCK) {
    const { getReadingsByParticipant } = await import('../mockStore');
    return res.json(getReadingsByParticipant(req.params.participantId));
  }

  try {
    const { getContract } = await import('../fabricClient');
    const contract = await getContract();
    const bytes = await contract.evaluateTransaction('QueryReadingsByParticipant', req.params.participantId);
    return res.json(JSON.parse(bytes.toString()));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

export default router;
