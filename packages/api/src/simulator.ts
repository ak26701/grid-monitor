export {};

/**
 * IoT Sensor Simulator — realistic energy grid data
 *
 * Models:
 *   utility-01    : conventional thermal plant — stable base load, slow ramp
 *   solar-farm-01 : photovoltaic — diurnal sine curve, cloud-burst noise
 *   battery-op-01 : BESS — charges when supply > demand, discharges on shortfall
 *
 * Fault injection (random, ~1% per tick):
 *   - Frequency spike (grid disturbance)
 *   - Voltage sag (local brownout)
 *   - Solar output collapse (cloud cover event)
 *   - Battery over-discharge warning
 *
 * Can be run standalone:  npx ts-node-dev src/simulator.ts
 * Or imported by index.ts in mock mode.
 */

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const INTERVAL_MS = parseInt(process.env.SIM_INTERVAL_MS ?? '2000', 10);

// ── Simulation state ──────────────────────────────────────────────────────────

let tick = 0;
// Simulated time-of-day angle in radians — advances faster than wall clock for demo
let simTimeAngle = ((new Date().getHours() + new Date().getMinutes() / 60) / 24) * 2 * Math.PI;
const SIM_TIME_SPEED = 0.015; // radians per tick — roughly 1 simulated hour per ~3 real minutes

// Battery state of charge [0..1]
let batterySOC = 0.72;

// Cloud burst state for solar
let cloudBurst = false;
let cloudBurstTicksLeft = 0;

// Fault state
let freqFaultTicksLeft = 0;
let voltageSagTicksLeft = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function gaussian(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function solarIrradiance(angle: number): number {
  // Sunrise ~6am, sunset ~6pm → peak at solar noon
  // angle is 0–2π over 24h; sin peaks at π/2 (6am offset by quarter turn)
  const raw = Math.sin(angle - Math.PI / 4);
  return clamp(raw, 0, 1); // nighttime = 0
}

// ── Per-participant simulation ────────────────────────────────────────────────

interface Reading {
  sensorId: string;
  participantId: string;
  role: string;
  supplyKW: number;
  demandKW: number;
  voltageV: number;
  frequencyHz: number;
}

function simulateUtility(): Reading {
  // Base load 480–520 kW, slow random walk, demand tracks ~85% of supply
  const baseSupply = 500 + Math.sin(tick / 40) * 20 + gaussian(0, 4);
  const supplyKW = clamp(parseFloat(baseSupply.toFixed(2)), 420, 600);

  // Utility demand is grid-wide consumption fed from utility side
  const baseDemand = supplyKW * (0.82 + Math.random() * 0.06);
  const demandKW = parseFloat(clamp(baseDemand, 350, 560).toFixed(2));

  let frequencyHz = 50 + gaussian(0, 0.08);
  if (freqFaultTicksLeft > 0) {
    frequencyHz = 50 + (Math.random() > 0.5 ? 1.2 : -1.2) * (freqFaultTicksLeft / 10);
    freqFaultTicksLeft--;
  }

  let voltageV = 230 + gaussian(0, 2);
  if (voltageSagTicksLeft > 0) {
    voltageV = 230 - 35 * (voltageSagTicksLeft / 8);
    voltageSagTicksLeft--;
  }

  return {
    sensorId: 'sensor-util-1',
    participantId: 'utility-01',
    role: 'utility',
    supplyKW,
    demandKW,
    voltageV: parseFloat(clamp(voltageV, 180, 270).toFixed(1)),
    frequencyHz: parseFloat(clamp(frequencyHz, 47.0, 53.0).toFixed(3)),
  };
}

function simulateSolarFarm(): Reading {
  const irradiance = solarIrradiance(simTimeAngle);
  const peakCapacity = 200; // kW

  let outputFactor = irradiance;
  if (cloudBurst) {
    outputFactor *= 0.08 + Math.random() * 0.15; // cloud drops output to ~10%
  } else {
    outputFactor *= 0.88 + gaussian(0, 0.04); // panel efficiency noise
  }

  const supplyKW = parseFloat(clamp(peakCapacity * outputFactor, 0, peakCapacity).toFixed(2));
  // Solar farm draws minimal parasitic load (trackers, inverters)
  const demandKW = parseFloat((2.5 + Math.random() * 1.5).toFixed(2));

  // Solar inverters hold voltage close to grid
  const voltageV = parseFloat((230 + gaussian(0, 3)).toFixed(1));
  // Frequency at point of coupling
  const frequencyHz = parseFloat((50 + gaussian(0, 0.12)).toFixed(3));

  return {
    sensorId: 'sensor-solar-1',
    participantId: 'solar-farm-01',
    role: 'solar_farm',
    supplyKW,
    demandKW,
    voltageV: clamp(voltageV, 215, 245),
    frequencyHz: clamp(frequencyHz, 49.0, 51.0),
  };
}

function simulateBattery(): Reading {
  // Compute net grid balance from utility + solar estimates
  const utilSupply = 500 + Math.sin(tick / 40) * 20;
  const solarSupply = solarIrradiance(simTimeAngle) * 180;
  const gridDemand = utilSupply * 0.85;
  const netBalance = (utilSupply + solarSupply) - gridDemand;

  // Battery acts as grid balancer
  let supplyKW = 0;
  let demandKW = 0;

  if (netBalance < -20) {
    // Discharge to cover shortfall
    const discharge = clamp(Math.abs(netBalance) * 0.6, 0, 80);
    supplyKW = parseFloat(discharge.toFixed(2));
    batterySOC = clamp(batterySOC - discharge * (INTERVAL_MS / 3_600_000) / 100, 0.05, 1.0);
  } else if (netBalance > 40) {
    // Charge from excess
    const charge = clamp(netBalance * 0.4, 0, 60);
    demandKW = parseFloat(charge.toFixed(2));
    batterySOC = clamp(batterySOC + charge * (INTERVAL_MS / 3_600_000) / 100, 0, 1.0);
  } else {
    // Idle — slight parasitic draw
    demandKW = parseFloat((1.5 + Math.random()).toFixed(2));
  }

  const voltageV = parseFloat((230 + gaussian(0, 1.5)).toFixed(1));
  const frequencyHz = parseFloat((50 + gaussian(0, 0.06)).toFixed(3));

  return {
    sensorId: 'sensor-batt-1',
    participantId: 'battery-op-01',
    role: 'battery_operator',
    supplyKW,
    demandKW,
    voltageV: clamp(voltageV, 220, 242),
    frequencyHz: clamp(frequencyHz, 49.5, 50.5),
  };
}

// ── Fault injection ───────────────────────────────────────────────────────────

function maybeInjectFault(): void {
  const r = Math.random();

  if (r < 0.008 && freqFaultTicksLeft === 0) {
    console.log('[SIM] FAULT: frequency spike injected');
    freqFaultTicksLeft = 8;
  } else if (r < 0.012 && voltageSagTicksLeft === 0) {
    console.log('[SIM] FAULT: voltage sag injected');
    voltageSagTicksLeft = 6;
  } else if (r < 0.015 && !cloudBurst) {
    console.log('[SIM] FAULT: cloud burst — solar output collapsing');
    cloudBurst = true;
    cloudBurstTicksLeft = 12 + Math.floor(Math.random() * 8);
  }

  if (cloudBurst) {
    cloudBurstTicksLeft--;
    if (cloudBurstTicksLeft <= 0) {
      console.log('[SIM] cloud burst ended — solar output recovering');
      cloudBurst = false;
    }
  }
}

// ── Tick loop ─────────────────────────────────────────────────────────────────

async function sendReading(reading: Reading): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reading),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error: string };
      console.error(`[SIM] ${reading.sensorId} error:`, data.error);
    }
  } catch (e) {
    // API may not be ready on first ticks — suppress noise after first success
    if (tick < 5) {
      console.error(`[SIM] ${reading.sensorId} fetch failed:`, (e as Error).message);
    }
  }
}

async function runTick(): Promise<void> {
  tick++;
  simTimeAngle += SIM_TIME_SPEED;
  if (simTimeAngle > 2 * Math.PI) simTimeAngle -= 2 * Math.PI;

  maybeInjectFault();

  const readings = [
    simulateUtility(),
    simulateSolarFarm(),
    simulateBattery(),
  ];

  await Promise.all(readings.map(sendReading));

  if (tick % 30 === 0) {
    const timeHours = (simTimeAngle / (2 * Math.PI)) * 24;
    const h = Math.floor(timeHours).toString().padStart(2, '0');
    const m = Math.floor((timeHours % 1) * 60).toString().padStart(2, '0');
    console.log(`[SIM] tick=${tick} sim-time=${h}:${m} battery-SOC=${(batterySOC * 100).toFixed(1)}%`);
  }
}

console.log(`[SIM] starting — 3 participants, interval ${INTERVAL_MS}ms`);
setInterval(() => { void runTick(); }, INTERVAL_MS);
void runTick();
