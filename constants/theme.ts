import { Platform } from 'react-native';

export const Colors = {
  light: {
    // PRD §8.1 design tokens
    primaryBlue: '#1A56DB',
    darkNavy: '#0E4D99',
    background: '#F5F7FA',
    cardBg: '#FFFFFF',
    successGreen: '#10823B',
    errorRed: '#9B1C1C',
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    // Tab bar (keep compatible with existing usage)
    text: '#1A1A2E',
    tint: '#1A56DB',
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#1A56DB',
  },
  dark: {
    // iOS dark mode system colours
    primaryBlue: '#0A84FF',
    darkNavy: '#1C3D6E',
    background: '#000000',
    cardBg: '#1C1C1E',
    successGreen: '#30D158',
    errorRed: '#FF453A',
    textPrimary: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    // Tab bar
    text: '#FFFFFF',
    tint: '#0A84FF',
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#0A84FF',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const IOSFonts = {
  largeTitle:  { fontFamily: 'System' as const, fontSize: 34, fontWeight: '700' as const },
  title1:      { fontFamily: 'System' as const, fontSize: 28, fontWeight: '700' as const },
  title2:      { fontFamily: 'System' as const, fontSize: 22, fontWeight: '700' as const },
  title3:      { fontFamily: 'System' as const, fontSize: 20, fontWeight: '600' as const },
  headline:    { fontFamily: 'System' as const, fontSize: 17, fontWeight: '600' as const },
  body:        { fontFamily: 'System' as const, fontSize: 17, fontWeight: '400' as const },
  callout:     { fontFamily: 'System' as const, fontSize: 16, fontWeight: '400' as const },
  subheadline: { fontFamily: 'System' as const, fontSize: 15, fontWeight: '400' as const },
  footnote:    { fontFamily: 'System' as const, fontSize: 13, fontWeight: '400' as const },
  caption1:    { fontFamily: 'System' as const, fontSize: 12, fontWeight: '400' as const },
  caption2:    { fontFamily: 'System' as const, fontSize: 11, fontWeight: '400' as const },
};
