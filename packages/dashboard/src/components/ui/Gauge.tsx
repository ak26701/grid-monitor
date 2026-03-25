/**
 * SVG semicircle gauge used for key grid metrics.
 * angle=0 → left end of arc; angle=1 → right end.
 */
interface Props {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  /** Color when in the normal range */
  normalColor?: string;
  /** Color when outside the normal range */
  alertColor?: string;
  /** Fraction [0..1] of the range considered "normal" center zone */
  normalZone?: [number, number];
  size?: number;
}

export function Gauge({
  value,
  min,
  max,
  label,
  unit,
  normalColor = '#22d3ee',
  alertColor = '#ef4444',
  normalZone = [0.3, 0.7],
  size = 140,
}: Props) {
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const inNormal = fraction >= normalZone[0] && fraction <= normalZone[1];
  const color = inNormal ? normalColor : alertColor;

  // SVG arc parameters
  const cx = size / 2;
  const cy = size * 0.58;
  const r = size * 0.38;
  const startAngle = -180;
  const endAngle = 0;
  const totalAngle = endAngle - startAngle; // 180°

  function polarToXY(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  // Background arc
  const bg0 = polarToXY(startAngle, r);
  const bg1 = polarToXY(endAngle, r);
  const bgPath = `M ${bg0.x} ${bg0.y} A ${r} ${r} 0 0 1 ${bg1.x} ${bg1.y}`;

  // Value arc
  const valAngle = startAngle + fraction * totalAngle;
  const val0 = polarToXY(startAngle, r);
  const val1 = polarToXY(valAngle, r);
  const largeArc = fraction > 0.5 ? 1 : 0;
  const valPath = `M ${val0.x} ${val0.y} A ${r} ${r} 0 ${largeArc} 1 ${val1.x} ${val1.y}`;

  // Needle
  const needleAngle = startAngle + fraction * totalAngle;
  const needleTip = polarToXY(needleAngle, r - 6);
  const needleBase = polarToXY(needleAngle + 180, 6);

  const fontSize = size * 0.145;
  const labelSize = size * 0.085;

  return (
    <svg width={size} height={size * 0.68} viewBox={`0 0 ${size} ${size * 0.68}`} aria-label={`${label}: ${value} ${unit}`}>
      {/* Track */}
      <path d={bgPath} fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      {/* Value fill */}
      {fraction > 0 && (
        <path d={valPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      )}
      {/* Needle */}
      <line
        x1={needleBase.x} y1={needleBase.y}
        x2={needleTip.x} y2={needleTip.y}
        stroke={color} strokeWidth="2.5" strokeLinecap="round"
        style={{ transition: 'all 0.4s ease' }}
      />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      {/* Value */}
      <text x={cx} y={cy - r * 0.18} textAnchor="middle" fontSize={fontSize} fontWeight="700" fill={color}
        style={{ fontFamily: "'JetBrains Mono', monospace", transition: 'fill 0.4s ease' }}>
        {typeof value === 'number' ? value.toFixed(unit === 'Hz' ? 2 : 1) : value}
      </text>
      <text x={cx} y={cy - r * 0.18 + fontSize * 1.1} textAnchor="middle" fontSize={labelSize} fill="#94a3b8">
        {unit}
      </text>
      {/* Label */}
      <text x={cx} y={size * 0.66} textAnchor="middle" fontSize={labelSize} fill="#64748b" letterSpacing="0.04em">
        {label.toUpperCase()}
      </text>
      {/* Scale ticks */}
      <text x={bg0.x - 4} y={cy + 14} textAnchor="end" fontSize={labelSize * 0.85} fill="#475569">{min}</text>
      <text x={bg1.x + 4} y={cy + 14} textAnchor="start" fontSize={labelSize * 0.85} fill="#475569">{max}</text>
    </svg>
  );
}
