// App-wide constants
export const APP_NAME = 'BoxStat';
export const APP_VERSION = '1.0.0';

// Color palette (matching web app)
export const COLORS = {
  primary: '#DC2626', // Red
  primaryDark: '#B91C1C',
  secondary: '#333333',
  background: '#FFFFFF',
  backgroundDark: '#0A0A0A',
  text: '#1F2937',
  textLight: '#6B7280',
  textDark: '#FAFAFA',
  border: '#E5E7EB',
  borderDark: '#27272A',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Role-specific accents
  player: '#14B8A6', // Teal
  parent: '#8B5CF6', // Purple
  coach: '#F97316', // Orange
  admin: '#DC2626', // Red
};

// Spacing scale (matching Tailwind)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Border radius
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Font sizes
export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
};

// Font weights
export const FONT_WEIGHT = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
