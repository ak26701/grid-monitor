import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EnergyReading } from '../types';

interface Props {
  readings: EnergyReading[];
}

interface ChartPoint {
  time: string;
  supplyKW: number;
  demandKW: number;
  frequencyHz: number;
}

function toChartPoints(readings: EnergyReading[]): ChartPoint[] {
  return [...readings].reverse().map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString(),
    supplyKW: r.supplyKW,
    demandKW: r.demandKW,
    frequencyHz: r.frequencyHz,
  }));
}

export function ReadingsChart({ readings }: Props) {
  if (readings.length === 0) {
    return (
      <section className="card">
        <h2>Historical Trends</h2>
        <p className="placeholder">Waiting for readings...</p>
      </section>
    );
  }

  const data = toChartPoints(readings);

  return (
    <section className="card">
      <h2>Historical Trends</h2>

      <h3 className="chart-title">Supply vs Demand (kW)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="supplyKW" name="Supply kW" stroke="#22d3ee" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="demandKW" name="Demand kW" stroke="#f97316" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <h3 className="chart-title" style={{ marginTop: '1.5rem' }}>Grid Frequency (Hz)</h3>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[49, 51]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="frequencyHz" name="Freq Hz" stroke="#a78bfa" dot={false} strokeWidth={2} />
          {/* Nominal line at 50 Hz */}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
