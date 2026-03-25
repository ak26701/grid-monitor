import { ParticipantRole } from '../types';

export interface ParticipantConfig {
  id: string;
  label: string;
  role: ParticipantRole;
  color: string;
  /** Dimmer version of color for fills */
  colorMuted: string;
  icon: string;
}

export const PARTICIPANT_CONFIG: Record<string, ParticipantConfig> = {
  'utility-01': {
    id: 'utility-01',
    label: 'Utility',
    role: 'utility',
    color: '#3b82f6',
    colorMuted: '#1d4ed8',
    icon: 'U',
  },
  'solar-farm-01': {
    id: 'solar-farm-01',
    label: 'Solar Farm',
    role: 'solar_farm',
    color: '#f59e0b',
    colorMuted: '#b45309',
    icon: 'S',
  },
  'battery-op-01': {
    id: 'battery-op-01',
    label: 'Battery Op',
    role: 'battery_operator',
    color: '#10b981',
    colorMuted: '#065f46',
    icon: 'B',
  },
};

export const ROLE_COLOR: Record<ParticipantRole, string> = {
  utility: '#3b82f6',
  solar_farm: '#f59e0b',
  battery_operator: '#10b981',
  sensor: '#a78bfa',
};

export function getParticipantConfig(participantId: string): ParticipantConfig {
  return (
    PARTICIPANT_CONFIG[participantId] ?? {
      id: participantId,
      label: participantId,
      role: 'sensor' as ParticipantRole,
      color: '#a78bfa',
      colorMuted: '#7c3aed',
      icon: '?',
    }
  );
}

export function formatParticipantLabel(participantId: string): string {
  return getParticipantConfig(participantId).label;
}
