import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

interface CharacterSummary {
  id: string;
  name?: string;
  race?: string;
  class?: string;
  level: number;
  status?: 'draft' | 'complete';
}

/**
 * Post-login landing screen. Fetches saved characters and lets the user
 * resume an existing one or start a new wizard.
 */
export function CharacterOverview() {
  const { user, logout, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessTokenSilently();
        const data = await apiFetch<CharacterSummary[]>('/api/characters', { token });
        setCharacters(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [getAccessTokenSilently]);

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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/characters/new/basic-info')}>
            New Character
          </Button>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress color="primary" />
          </Box>
        )}

        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Could not load characters: {error}
          </Alert>
        )}

        {!loading && !error && characters.length === 0 && (
          <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
            <AutoStoriesIcon sx={{ fontSize: 56, color: 'primary.main', opacity: 0.4, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No characters yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first Pathfinder 1e character using the guided wizard.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/characters/new/basic-info')}>
              Create Your First Character
            </Button>
          </Paper>
        )}

        {!loading && characters.length > 0 && (
          <Stack spacing={2}>
            {characters.map((c) => (
              <Paper
                key={c.id}
                variant="outlined"
                sx={{
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' },
                }}
                onClick={() => navigate(`/characters/${c.id}/basic-info`)}
              >
                <AutoStoriesIcon sx={{ color: 'primary.main', fontSize: 36, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {c.name ?? 'Unnamed character'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                    {c.race  && <Chip label={c.race}  size="small" variant="outlined" />}
                    {c.class && <Chip label={c.class} size="small" variant="outlined" />}
                    <Chip label={`Level ${c.level}`} size="small" variant="outlined" />
                    {c.status === 'draft' && (
                      <Chip label="Draft" size="small" color="warning" variant="outlined" />
                    )}
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={(e) => { e.stopPropagation(); navigate(`/characters/${c.id}/basic-info`); }}
                >
                  {c.status === 'complete' ? 'Open' : 'Continue'}
                </Button>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
