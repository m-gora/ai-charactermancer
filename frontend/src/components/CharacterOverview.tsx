import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { useAuth0 } from '@auth0/auth0-react';

interface Props {
  onNewCharacter: () => void;
}

/**
 * Post-login landing screen. Shows saved characters (future) and a
 * "New Character" button to start the creation wizard.
 */
export function CharacterOverview({ onNewCharacter }: Readonly<Props>) {
  const { user, logout } = useAuth0();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 900,
        mx: 'auto',
        px: { xs: 2, sm: 4 },
        py: 4,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" color="primary">AI Charactermancer</Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back, {user?.name ?? user?.email ?? 'Adventurer'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => void logout({ logoutParams: { returnTo: location.origin } })}
        >
          Log out
        </Button>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Character list */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Your Characters</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onNewCharacter}
          >
            New Character
          </Button>
        </Box>

        {/* Empty state */}
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            textAlign: 'center',
            borderStyle: 'dashed',
          }}
        >
          <AutoStoriesIcon sx={{ fontSize: 56, color: 'primary.main', opacity: 0.4, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No characters yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first Pathfinder 1e character using the guided wizard.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onNewCharacter}>
            Create Your First Character
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
