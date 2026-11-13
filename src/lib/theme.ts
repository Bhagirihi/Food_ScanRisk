import { Platform } from 'react-native';

/**
 * ScanRisk theme — merged house style:
 * Shubh Muhurat's "royal temple" palette (warm ivory, deep maroon, antique
 * gold, serif display type) + Rasoi's radius / spacing / shadow scale and
 * orange-gold CTA gradient.
 */
export const COLORS = {
  // Shubh base
  bg: '#FAF3E7',
  bgDeep: '#F3E8D3',
  card: '#FFFDF8',
  ink: '#2B2118',
  inkSoft: '#4A3A2A',
  soft: '#8A7A63',
  line: '#EADFC6',
  gold: '#C19A3D',
  goldBright: '#E3C565',
  goldDeep: '#9A7B24',
  maroon: '#5E1224',
  maroonDeep: '#3D0B18',
  saffron: '#C2570B',
  saffronSoft: '#FBEBD7',
  // Rasoi accents
  orange: '#FF6B35',
  orangeDeep: '#C44A00',
  cream: '#FAFAFA',
  charcoal: '#1A1A2E',
  muted: '#6B7280',
  border: '#E5E7EB',
  placeholder: '#9CA3AF',
  // Status
  danger: '#A61C1C',
  dangerBg: '#F9E8E4',
  good: '#177245',
  goodBg: '#E4F2E6',
  white: '#FFFFFF',
};

export const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) as string;

export const GRADIENTS = {
  hero: ['#4A0E1F', '#7A1E2B', '#A83A1F'] as const,
  gold: ['#E9CE7A', '#C19A3D', '#9A7B24'] as const,
  cta: ['#C44A00', '#FF6B35', '#FF9933'] as const,
  card: ['#FFFDF8', '#FBF3E2'] as const,
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
