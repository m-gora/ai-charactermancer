import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { ThemeProvider, CssBaseline, Box, Button, Typography, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { theme } from './theme/theme';
import { WizardShell } from './components/wizard/WizardShell';
import { CharacterOverview } from './components/CharacterOverview';
import { useCharacterStore } from './store/characterStore';
import { apiFetch } from './api/client';

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

/** Guards the wizard behind Auth0 authentication. */
function AuthGate() {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const { reset, setDraft, setStep } = useCharacterStore();
  const [view, setView] = useState<'overview' | 'wizard'>('overview');

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isAuthenticated) return <Landing />;

  if (view === 'wizard') {
    return <WizardShell onExit={() => setView('overview')} />;
  }

  const handleResume = async (id: string) => {
    try {
      const token = await getAccessTokenSilently();
      const draft = await apiFetch<Record<string, unknown>>(`/api/characters/${id}`, { token });
      reset();
      setDraft(draft as Parameters<typeof setDraft>[0]);
      setStep(0);
      setView('wizard');
    } catch {
      // If fetch fails, fall through — user can still start a new character
    }
  };

  return (
    <CharacterOverview
      onNewCharacter={() => {
        reset();
        setView('wizard');
      }}
      onResumeCharacter={(id) => void handleResume(id)}
    />
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
        <AuthGate />
      </ThemeProvider>
    </Auth0Provider>
  );
}

export default App;
