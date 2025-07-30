import { TypographyOptions } from '@mui/material/styles/createTypography';

// 타이포그래피 스케일
export const typographyScale = {
  // Font families
  fontFamily: {
    primary: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    monospace: [
      'SFMono-Regular',
      'Menlo',
      'Monaco',
      'Consolas',
      '"Liberation Mono"',
      '"Courier New"',
      'monospace',
    ].join(','),
  },

  // Font weights
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
  },

  // Font sizes (rem)
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
  },

  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Material-UI 타이포그래피 옵션
export const typography: TypographyOptions = {
  fontFamily: typographyScale.fontFamily.primary,

  // 헤드라인
  h1: {
    fontSize: typographyScale.fontSize['5xl'],
    fontWeight: typographyScale.fontWeight.bold,
    lineHeight: typographyScale.lineHeight.tight,
    letterSpacing: '-0.025em',
  },
  h2: {
    fontSize: typographyScale.fontSize['4xl'],
    fontWeight: typographyScale.fontWeight.bold,
    lineHeight: typographyScale.lineHeight.tight,
    letterSpacing: '-0.025em',
  },
  h3: {
    fontSize: typographyScale.fontSize['3xl'],
    fontWeight: typographyScale.fontWeight.semiBold,
    lineHeight: typographyScale.lineHeight.tight,
  },
  h4: {
    fontSize: typographyScale.fontSize['2xl'],
    fontWeight: typographyScale.fontWeight.semiBold,
    lineHeight: typographyScale.lineHeight.tight,
  },
  h5: {
    fontSize: typographyScale.fontSize.xl,
    fontWeight: typographyScale.fontWeight.semiBold,
    lineHeight: typographyScale.lineHeight.normal,
  },
  h6: {
    fontSize: typographyScale.fontSize.lg,
    fontWeight: typographyScale.fontWeight.semiBold,
    lineHeight: typographyScale.lineHeight.normal,
  },

  // 본문
  body1: {
    fontSize: typographyScale.fontSize.base,
    fontWeight: typographyScale.fontWeight.regular,
    lineHeight: typographyScale.lineHeight.normal,
  },
  body2: {
    fontSize: typographyScale.fontSize.sm,
    fontWeight: typographyScale.fontWeight.regular,
    lineHeight: typographyScale.lineHeight.normal,
  },

  // 기타
  subtitle1: {
    fontSize: typographyScale.fontSize.base,
    fontWeight: typographyScale.fontWeight.medium,
    lineHeight: typographyScale.lineHeight.normal,
  },
  subtitle2: {
    fontSize: typographyScale.fontSize.sm,
    fontWeight: typographyScale.fontWeight.medium,
    lineHeight: typographyScale.lineHeight.normal,
  },
  caption: {
    fontSize: typographyScale.fontSize.xs,
    fontWeight: typographyScale.fontWeight.regular,
    lineHeight: typographyScale.lineHeight.normal,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  overline: {
    fontSize: typographyScale.fontSize.xs,
    fontWeight: typographyScale.fontWeight.medium,
    lineHeight: typographyScale.lineHeight.normal,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  button: {
    fontSize: typographyScale.fontSize.sm,
    fontWeight: typographyScale.fontWeight.medium,
    lineHeight: typographyScale.lineHeight.normal,
    textTransform: 'none', // 버튼 텍스트 대문자 변환 비활성화
  },
};
