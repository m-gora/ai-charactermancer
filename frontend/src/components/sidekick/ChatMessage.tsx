import { Box, Typography, Avatar } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
        {isUser ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </Typography>
        ) : (
          <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word',
            '& p': { m: 0, mb: 0.5 },
            '& p:last-child': { mb: 0 },
            '& ul, & ol': { mt: 0, mb: 0.5, pl: 2.5 },
            '& li': { mb: 0.25 },
            '& code': { fontFamily: 'monospace', fontSize: '0.85em',
              bgcolor: 'rgba(255,255,255,0.08)', px: 0.5, borderRadius: 0.5 },
            '& pre': { m: 0, mb: 0.5, p: 1, bgcolor: 'rgba(0,0,0,0.3)',
              borderRadius: 1, overflowX: 'auto' },
            '& strong': { color: 'primary.light' },
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </Typography>
        )}
      </Box>
    </Box>
  );
}
