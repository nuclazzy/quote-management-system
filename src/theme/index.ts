import { createTheme } from '@mui/material/styles';
import * as colors from './colors';
import { typography } from './typography';
import * as spacing from './spacing';
import { components } from './components';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.secondary.main,
      light: colors.secondary.light,
      dark: colors.secondary.dark,
      contrastText: '#ffffff',
    },
    success: {
      main: colors.success.main,
      light: colors.success.light,
      dark: colors.success.dark,
    },
    warning: {
      main: colors.warning.main,
      light: colors.warning.light,
      dark: colors.warning.dark,
    },
    error: {
      main: colors.error.main,
      light: colors.error.light,
      dark: colors.error.dark,
    },
    info: {
      main: colors.info.main,
      light: colors.info.light,
      dark: colors.info.dark,
    },
    grey: colors.grey,
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography,
  spacing: (factor: number) => `${spacing.base * factor}px`,
  shape: {
    borderRadius: 8,
  },
  components,
});

export default theme;
