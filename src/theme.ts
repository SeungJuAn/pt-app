import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'dark',
  primaryShade: { light: 8, dark: 6 },
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", Roboto, sans-serif',
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(32), lineHeight: '1.2' },
      h2: { fontSize: rem(26), lineHeight: '1.25' },
      h3: { fontSize: rem(22), lineHeight: '1.3' },
      h4: { fontSize: rem(18), lineHeight: '1.35' },
    },
  },
  shadows: {
    xs: '0 1px 3px rgba(15,23,42,0.06)',
    sm: '0 2px 8px rgba(15,23,42,0.08)',
    md: '0 4px 16px rgba(15,23,42,0.1)',
    lg: '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
    xl: '0 20px 60px rgba(15,23,42,0.15)',
  },
  components: {
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'xl',
        padding: 'md',
      },
    },
    Button: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Input: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Select: {
      defaultProps: {
        radius: 'lg',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'lg',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Table: {
      defaultProps: {
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'xl',
      },
    },
  },
});
