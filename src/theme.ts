// Custom Fluent UI v9 brand theme for the Document Intake app. A deep navy → blue
// brand ramp drives primary buttons, selected states, and accents. The decorative
// navy header bar and hero-banner gradients are exported separately because they are
// surfaces, not themeable tokens.

import { createLightTheme } from '@fluentui/react-components';
import type { BrandVariants, Theme } from '@fluentui/react-components';

const brand: BrandVariants = {
  10: '#040608',
  20: '#0d1a31',
  30: '#11264a',
  40: '#15315f',
  50: '#193c75',
  60: '#1d488c',
  70: '#2154a3',
  80: '#2861bb',
  90: '#4275c7',
  100: '#5d8ad2',
  110: '#789fdd',
  120: '#94b4e7',
  130: '#b1c9f0',
  140: '#cfddf7',
  150: '#e8effb',
  160: '#f5f9fe',
};

export const appLightTheme: Theme = {
  ...createLightTheme(brand),
  // Slightly rounder cards to match the reference design language.
  borderRadiusMedium: '8px',
  borderRadiusLarge: '12px',
  borderRadiusXLarge: '16px',
};

/** Decorative surfaces (not themeable tokens). */
export const surfaces = {
  /** Dark navy top app bar. */
  headerGradient: 'linear-gradient(90deg, #0f1f3d 0%, #16294d 55%, #1b3666 100%)',
  /** Rich navy → blue hero banner. */
  heroGradient: 'linear-gradient(120deg, #13264a 0%, #21457f 52%, #2861bb 100%)',
  onDark: '#ffffff',
  onDarkMuted: 'rgba(255,255,255,0.72)',
  onDarkSubtle: 'rgba(255,255,255,0.55)',
  headerBorder: 'rgba(255,255,255,0.10)',
};
