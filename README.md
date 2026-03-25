# Grid Monitor

A decentralized energy grid monitoring system built on Hyperledger Fabric. IoT sensors (simulated) report live energy readings from multiple grid participants — a utility, a solar farm, and a battery operator — to a shared blockchain ledger. Supply, demand, voltage, frequency, and grid events are recorded immutably. A React dashboard visualizes real-time grid state, historical trends, and anomaly detection.

---

## Architecture

```
IoT Simulator ──► REST API ──► Hyperledger Fabric (Chaincode)
                     │
                  WebSocket
                     │
               React Dashboard
```

### Packages

| Package | Description |
|---|---|
| `packages/api` | Express + WebSocket server. Bridges the simulator and dashboard to the Fabric network via the Fabric SDK. |
| `packages/chaincode` | Hyperledger Fabric smart contract (`GridMonitorContract`). Handles reading submission, state aggregation, anomaly detection, and event management on-chain. |
| `packages/dashboard` | React + Vite frontend. Displays live grid state, a readings chart, and an anomaly panel. |

---

## Components

### IoT Simulator (`packages/api/src/simulator.ts`)

Simulates three participant sensors that POST energy readings to the API every 2 seconds:

| Participant | Role | Baseline Supply | Baseline Demand |
|---|---|---|---|
| `utility-01` | Utility | 500 kW | 420 kW |
| `solar-farm-01` | Solar Farm | 180 kW | 5 kW |
| `battery-op-01` | Battery Operator | 80 kW | 30 kW |

Each reading includes randomized jitter on supply/demand values, simulated voltage (±V around 230V), and simulated frequency (±Hz around 50Hz) with occasional larger drift events.

### API Server (`packages/api`)

- `POST /api/readings` — accepts a sensor reading and submits it to the Fabric chaincode via `SubmitReading`
- `GET /api/grid` — returns the current aggregated grid state from the ledger
- `GET /api/grid/events` — returns active (unresolved) grid events
- `PATCH /api/grid/events/:id/resolve` — marks an event resolved on-chain
- `ws://localhost:3001/ws` — pushes live updates to the dashboard as readings and events arrive

### Chaincode (`packages/chaincode`)

The `GridMonitorContract` runs on Fabric and exposes:

- **`InitLedger`** — bootstraps the initial grid state document
- **`SubmitReading`** — persists an energy reading, updates the aggregate grid state (total supply, demand, net balance, average frequency/voltage), and runs anomaly detection
- **`GetGridState`** — returns the current aggregate state
- **`QueryReadingsByParticipant`** — returns the last 100 readings for a given participant (CouchDB rich query)
- **`GetActiveEvents`** — returns all unresolved grid events
- **`ResolveEvent`** — marks an event as resolved

**Anomaly detection** fires on every reading submission and emits `GridEvent` records for:

| Anomaly | Trigger |
|---|---|
| `FREQUENCY_DEVIATION` | Frequency deviates from 50 Hz nominal |
| `VOLTAGE_SAP` | Voltage drops more than 10% below 230V nominal |
| `SURGE` | Voltage rises more than 10% above 230V nominal |
| `SUPPLY_SHORTFALL` | Net balance (supply − demand) is negative beyond threshold |
| `DEMAND_SPIKE` | Net balance is positive beyond threshold (excess demand elsewhere) |

Events are severity-tagged (`warning` / `critical`) and stored immutably on the ledger.

### Dashboard (`packages/dashboard`)

Three main UI components:

- **`GridStatusCard`** — live totals: supply, demand, net balance, average frequency and voltage, active participant count
- **`ReadingsChart`** — historical chart of supply/demand readings over time per participant
- **`AnomalyPanel`** — list of active grid events with severity, description, and a resolve action

The dashboard connects over WebSocket for real-time updates and falls back to polling REST endpoints on reconnect.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A running Hyperledger Fabric network with the `GridMonitorContract` deployed
- (Optional) CouchDB as the Fabric state database for rich queries

### Install

```bash
npm install
```

### Configure

Copy `packages/api/.env.example` to `packages/api/.env` and fill in your Fabric connection profile details.

### Run (dev)

```bash
# Starts the API server and the dashboard in parallel
npm run dev
```

The API listens on `http://localhost:3001` and the dashboard on `http://localhost:5173`.

### Run the Simulator

```bash
cd packages/api
npx ts-node src/simulator.ts
```

### Build

```bash
npm run build
```

---

## Network Participants

The ledger is designed for a multi-org Fabric network with one peer per participant:

- **Utility** — primary grid operator, largest supply and demand baseline
- **Solar Farm** — renewable energy contributor, low demand draw
- **Battery Operator** — storage buffer, balances supply/demand gaps

Each participant runs their own Fabric peer node. All energy readings and grid events are written to the shared channel ledger, visible to all parties but tamper-evident.
