import { createTheme } from '@mui/material/styles';

// Dark fantasy palette for a Pathfinder 1e character creator
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c9a84c',       // antique gold
      contrastText: '#1a1209',
    },
    secondary: {
      main: '#7b2d8b',       // arcane purple
    },
    background: {
      default: '#0f1117',    // near-black
      paper: '#1a1f2e',      // deep navy
    },
    text: {
      primary: '#e8d5b7',    // parchment
      secondary: '#9e8c78',  // aged ink
    },
    error: {
      main: '#cf3232',
    },
    success: {
      main: '#4caf50',
    },
    divider: 'rgba(201,168,76,0.2)',
  },
  typography: {
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    h4: { fontWeight: 700, letterSpacing: '0.05em' },
    h5: { fontWeight: 600, letterSpacing: '0.04em' },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(201,168,76,0.15)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: 'linear-gradient(135deg, #c9a84c 0%, #a07830 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #ddbf6a 0%, #b88c40 100%)',
          },
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontFamily: '"Palatino Linotype", serif',
        },
      },
    },
  },
});
