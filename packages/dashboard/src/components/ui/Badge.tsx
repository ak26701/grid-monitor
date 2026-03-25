import { GridEventSeverity } from '../../types';

interface Props {
  severity: GridEventSeverity;
  children?: React.ReactNode;
}

const CLASSES: Record<GridEventSeverity, string> = {
  info: 'badge-info',
  warning: 'badge-warning',
  critical: 'badge-critical',
};

export function SeverityBadge({ severity, children }: Props) {
  return (
    <span className={`badge ${CLASSES[severity]}`}>
      {children ?? severity.toUpperCase()}
    </span>
  );
}

interface StaticBadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'muted';
}

export function StaticBadge({ label, variant = 'default' }: StaticBadgeProps) {
  return <span className={`badge badge-static badge-${variant}`}>{label}</span>;
}
