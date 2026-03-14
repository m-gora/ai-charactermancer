import { Box, Typography, Avatar } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  message: Message;
}

/**
 * Renders a single chat bubble in the sidekick panel.
 */
export function ChatMessage({ message }: Readonly<Props>) {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1,
        mb: 2,
      }}
    >
      <Avatar
        sx={{
          width: 28,
          height: 28,
          bgcolor: isUser ? 'secondary.main' : 'primary.main',
          flexShrink: 0,
        }}
      >
        {isUser ? <PersonIcon sx={{ fontSize: 16 }} /> : <SmartToyIcon sx={{ fontSize: 16 }} />}
      </Avatar>

      <Box
        sx={{
          maxWidth: '85%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: isUser ? 'rgba(123,45,139,0.25)' : 'rgba(201,168,76,0.1)',
          border: '1px solid',
          borderColor: isUser ? 'secondary.dark' : 'divider',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content}
        </Typography>
      </Box>
    </Box>
  );
}
