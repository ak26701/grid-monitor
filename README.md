# Compute Market Ops

A GPU compute market intelligence dashboard built to solve Ornn's two-sided marketplace GTM problem.

Ornn is building the financial infrastructure layer for GPU compute — an index, derivatives, and marketplace. Their first GTM hire needs to simultaneously identify which neoclouds want to hedge compute revenue risk, which AI companies need capacity access, and where the best matches are. This tool does that.

---

## What it does

**Supply Side** — Tracks 7 GPU compute providers (CoreWeave, Nebius, Lambda Labs, Crusoe, RunPod, Together AI, Voltage Park) with real-time pricing, utilization, contract types, and a **Hedge Readiness Score** that quantifies how motivated each provider is to engage with Ornn's financial products.

**Demand Side** — Tracks 10 AI companies and labs (Perplexity, Character.ai, Mistral, Cohere, Stability AI, Writer, Imbue, Aleph Alpha, Nous Research, Contextual AI) with funding signals, monthly GPU burn estimates, and a **Compute Urgency Score** that identifies who needs capacity access now.

**Market Index** — A live Compute Price Index (OCPI equivalent) — weighted average H100 price across providers by fleet size, with 48-hour history, on-demand / reserved / spot / H200 tracks, and real-time price updates via WebSocket.

**Match Engine** — Surfaces the top supply-demand matches scored on utilization pressure, regional alignment, contract preference overlap, and deal urgency. Each match includes estimated annual contract value and time-to-close.

**Intel Feed** — Live market alert stream: low utilization windows, new funding signals, arbitrage opportunities, capacity expansions, and capacity drought warnings.

---

## Architecture

```
Simulator (price random walk + alerts)
         │
    Express API ──────────── WebSocket (live price updates)
         │                           │
    ┌────┴────┐              React Dashboard
    │  /api   │                (Vite + Recharts)
    ├─ /supply          Supply Side tab
    ├─ /demand          Demand Side tab
    ├─ /market          Market Index tab
    └─ /matches         Match Engine tab
                        Intel Feed tab
```

---

## Stack

- **Backend**: Express + TypeScript + `ws` (WebSocket)
- **Frontend**: React + TypeScript + Vite + Recharts + lucide-react
- **Data**: Realistic static data seeded with live price simulation (±0.3% random walk every 3s)

---

## Run

```bash
npm install
npm run dev
```

- API: `http://localhost:3001`
- Dashboard: `http://localhost:5173`

---

## Scoring Methodology

**Hedge Readiness Score (Supply)** — quantifies provider motivation to engage with compute financial products. Factors: GPU fleet capex commitment, current utilization rate, debt financing exposure, contract flexibility offered, and revenue concentration risk.

**Compute Urgency Score (Demand)** — quantifies likelihood a company needs GPU access in the next 90 days. Factors: funding recency and size, model release cadence, compute use case (training vs inference), headcount growth, and preferred contract structure.

**Match Score** — combined (hedge readiness + compute urgency) / 2 × regional alignment multiplier × contract preference overlap multiplier.
