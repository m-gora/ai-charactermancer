import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { ThemeProvider, CssBaseline, Box, Button, Typography, CircularProgress } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { theme } from './theme/theme';
import { WizardShell } from './pages/wizard/WizardShell';
import { CharacterOverview } from './pages/CharacterOverview';
import { FeatBrowser } from './pages/FeatBrowser';
import { NavBar } from './components/NavBar';

/** Shows a landing page when the user is not authenticated. */
function Landing() {
  const { loginWithRedirect } = useAuth0();
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={3}
      sx={{ textAlign: 'center', px: 2 }}
    >
      <Typography variant="h3" color="primary">
        AI Charactermancer
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" maxWidth={480}>
        A guided Pathfinder 1e character creation wizard with an AI sidekick that
        explains rules, suggests feats, and answers your questions at every step.
      </Typography>
      <Button variant="contained" size="large" onClick={() => void loginWithRedirect()}>
        Login to Begin
      </Button>
    </Box>
  );
}

/** Redirects /characters/:id → /characters/:id/basic-info */
function WizardStepRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/characters/${id ?? 'new'}/basic-info`} replace />;
}

/** Guards all app routes behind Auth0 authentication. */
function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isAuthenticated) return <Landing />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      <Box component="main" sx={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/characters" replace />} />
          <Route path="/characters" element={<CharacterOverview />} />
          <Route path="/characters/:id/:step" element={<WizardShell />} />
          <Route path="/characters/:id" element={<WizardStepRedirect />} />          <Route path="/feats" element={<FeatBrowser />} />          <Route path="*" element={<Navigate to="/characters" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

export function App() {
  const domain   = import.meta.env.VITE_AUTH0_DOMAIN    ?? '';
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID ?? '';
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE  ?? '';

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: location.origin,
        ...(audience ? { audience } : {}),
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthGate />
        </BrowserRouter>
      </ThemeProvider>
    </Auth0Provider>
  );
}

export default App;
