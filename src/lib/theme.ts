// ScanRisk theme — Stitch "NutriScan" design system (13 Nov 2026 rebuild).
// Primary maroon, amber secondary, green tertiary, slate neutrals;
// Plus Jakarta Sans headlines, Inter body. Risk-band colors live here —
// src/lib/risk.ts owns the scoring model and must not be edited.

import type { RiskBand } from './risk';

export const COLORS = {
  bg: '#F8F7FC',
  card: '#FFFFFF',
  ink: '#171321',
  inkSoft: '#3A3444',
  soft: '#64748B',
  line: '#E5E3F0',
  maroon: '#4A121A',
  maroonDeep: '#3B0710',
  maroonSoft: '#F3E4E6',
  amber: '#D97706',
  amberDeep: '#B56100',
  amberSoft: '#FDF0DC',
  green: '#15803D',
  greenSoft: '#E7F4EA',
  orange: '#EA580C',
  red: '#DC2626',
  danger: '#DC2626',
  dangerBg: '#FDECEC',
  good: '#15803D',
  goodBg: '#E7F4EA',
  white: '#FFFFFF',
  placeholder: '#9AA3B2',
  // Stitch spec colours for the Result stat tiles and Home Recent Scans.
  softBlue: '#EAF1FF',
  navy: '#1E293B',
  paleBlue: '#DBEAFE',
  paleRed: '#FEE2E2',
  paleGreen: '#DCFCE7',
  paleAmber: '#FEF3C7',
  amberBrown: '#92400E',
  amberMid: '#B45309',
};

// Font family names registered by @expo-google-fonts. If a font fails to
// load, React Native falls back to the system font — the app never blocks.
export const FONTS = {
  headline: 'PlusJakartaSans_700Bold',
  headlineSemi: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/** Display colors for the risk bands (design tokens, not scoring). */
export const BANDS: Record<RiskBand, { label: string; color: string; range: string }> = {
  low: { label: 'Low risk', color: '#15803D', range: '0–10' },
  moderate: { label: 'Moderate risk', color: '#D97706', range: '11–25' },
  high: { label: 'High risk', color: '#EA580C', range: '26–40' },
  'very-high': { label: 'Very high risk', color: '#DC2626', range: '41–50' },
};

export const GRADIENTS = {
  hero: ['#3B0710', '#4A121A', '#6B2230'] as const,
  auth: ['#FDFBFF', '#F4EFFA'] as const,
};

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 22,
  pill: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
