import { AppBar, Toolbar, Typography, Button, Box, Avatar, Tooltip } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useMatch } from 'react-router-dom';

export function NavBar() {
  const { user, logout } = useAuth0();
  const navigate = useNavigate();
  const onCharacters = useMatch('/characters');
  const onFeats = useMatch('/feats');

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {/* Brand */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', mr: 3 }}
          onClick={() => navigate('/characters')}
        >
          <AutoStoriesIcon sx={{ color: 'primary.main' }} />
          <Typography
            variant="h6"
            sx={{ color: 'primary.main', letterSpacing: '0.04em', userSelect: 'none' }}
          >
            AI Charactermancer
          </Typography>
        </Box>

        {/* Nav links */}
        <Button
          color={onCharacters ? 'primary' : 'inherit'}
          onClick={() => navigate('/characters')}
          sx={{ fontFamily: 'inherit', textTransform: 'none', fontSize: '0.95rem' }}
        >
          Characters
        </Button>

        <Button
          color={onFeats ? 'primary' : 'inherit'}
          startIcon={<AccountTreeIcon fontSize="small" />}
          onClick={() => navigate('/feats')}
          sx={{ fontFamily: 'inherit', textTransform: 'none', fontSize: '0.95rem' }}
        >
          Feats
        </Button>

        <Box sx={{ flex: 1 }} />

        {/* User avatar + logout */}
        {user && (
          <Tooltip title={user.email ?? user.name ?? ''}>
            <Avatar
              src={user.picture}
              alt={user.name}
              sx={{ width: 32, height: 32, cursor: 'default' }}
            />
          </Tooltip>
        )}
        <Tooltip title="Log out">
          <Button
            size="small"
            startIcon={<LogoutIcon fontSize="small" />}
            onClick={() => void logout({ logoutParams: { returnTo: location.origin } })}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Log out
          </Button>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
