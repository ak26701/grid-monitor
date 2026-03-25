/**
 * IoT Sensor Simulator
 * Run standalone: ts-node src/simulator.ts
 * Periodically POSTs synthetic energy readings to the local API so the
 * dashboard has live data without real Fabric hardware.
 */

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const INTERVAL_MS = parseInt(process.env.SIM_INTERVAL_MS ?? '2000', 10);

interface Participant {
  participantId: string;
  role: 'utility' | 'solar_farm' | 'battery_operator';
  sensorId: string;
  /** Baseline supply output in kW */
  baseSupply: number;
  /** Baseline demand draw in kW */
  baseDemand: number;
}

const PARTICIPANTS: Participant[] = [
  { participantId: 'utility-01',        role: 'utility',           sensorId: 'sensor-util-1',    baseSupply: 500, baseDemand: 420 },
  { participantId: 'solar-farm-01',     role: 'solar_farm',        sensorId: 'sensor-solar-1',   baseSupply: 180, baseDemand:   5 },
  { participantId: 'battery-op-01',     role: 'battery_operator',  sensorId: 'sensor-batt-1',    baseSupply:  80, baseDemand:  30 },
];

function jitter(base: number, pct = 0.05): number {
  return base + base * pct * (Math.random() * 2 - 1);
}

function nominalFreq(): number {
  // Mostly stable, occasional small drift
  const drift = Math.random() < 0.05 ? (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * 0.3;
  return parseFloat((50 + drift).toFixed(3));
}

function nominalVoltage(): number {
  const drift = Math.random() < 0.03 ? (Math.random() - 0.5) * 50 : (Math.random() - 0.5) * 10;
  return parseFloat((230 + drift).toFixed(1));
}

let tick = 0;

async function sendReading(p: Participant): Promise<void> {
  const body = {
    sensorId: p.sensorId,
    participantId: p.participantId,
    role: p.role,
    supplyKW: parseFloat(jitter(p.baseSupply).toFixed(2)),
    demandKW: parseFloat(jitter(p.baseDemand).toFixed(2)),
    voltageV: nominalVoltage(),
    frequencyHz: nominalFreq(),
  };

  try {
    const res = await fetch(`${API_URL}/api/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[SIM] ${p.sensorId} error:`, data);
    } else {
      console.log(`[SIM] tick=${tick} ${p.sensorId} → readingId=${data.readingId}`);
    }
  } catch (e) {
    console.error(`[SIM] ${p.sensorId} fetch failed:`, (e as Error).message);
  }
}

async function runTick() {
  tick++;
  await Promise.all(PARTICIPANTS.map(sendReading));
}

console.log(`[SIM] starting — ${PARTICIPANTS.length} participants, interval ${INTERVAL_MS}ms`);
setInterval(runTick, INTERVAL_MS);
runTick();
