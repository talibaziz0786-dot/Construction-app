/**
 * Mobile color tokens — a compact dark palette aligned with the web app's
 * slate/amber calculator theme. Kept as plain values (no theming library) for
 * the MVP.
 */
export const colors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#263449',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#f59e0b',
  accentText: '#0f172a',
  danger: '#f87171',
  warning: '#fbbf24',
  success: '#4ade80',
  inputBackground: '#0b1220',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Minimum touch target recommended for Android (dp). */
export const MIN_TOUCH_TARGET = 48;
