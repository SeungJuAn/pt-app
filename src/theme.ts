import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'teal',
  primaryShade: { light: 6, dark: 4 },
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", Roboto, sans-serif',
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(32), lineHeight: '1.25' },
      h2: { fontSize: rem(24), lineHeight: '1.3' },
      h3: { fontSize: rem(20), lineHeight: '1.35' },
      h4: { fontSize: rem(18), lineHeight: '1.4' },
    },
  },
  shadows: {
    xs: '0 1px 2px rgba(15, 23, 42, 0.05)',
    sm: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
    lg: '0 12px 28px rgba(15, 23, 42, 0.1), 0 4px 8px rgba(15, 23, 42, 0.04)',
  },
  components: {
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'lg',
        padding: 'md',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Table: {
      defaultProps: {
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
    },
  },
  other: {
    brandGradient: {
      from: 'teal.6',
      to: 'cyan.5',
      deg: 135,
    },
    softGradientBg:
      'linear-gradient(135deg, rgba(20,184,166,0.08) 0%, rgba(14,165,233,0.06) 100%)',
    pageBg:
      'radial-gradient(circle at top right, rgba(20,184,166,0.08), transparent 60%), radial-gradient(circle at bottom left, rgba(168,85,247,0.05), transparent 55%)',
  },
});
