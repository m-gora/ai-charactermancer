import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress } from '@mui/material';
import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * Redirects unauthenticated users to Auth0 Universal Login.
 * While the SDK is initialising the access token, shows a spinner.
 */
export function ProtectedRoute({ children }: Readonly<Props>) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    void loginWithRedirect();
    return null;
  }

  return <>{children}</>;
}
