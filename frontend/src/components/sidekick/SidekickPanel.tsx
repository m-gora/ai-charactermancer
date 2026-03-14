import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Collapse,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ChatMessage } from './ChatMessage';
import { useSidekick } from './useSidekick';
import { useCharacterStore } from '../../store/characterStore';
import { type StepMeta } from '../wizard/StepRegistry';

interface Props {
  currentStep: StepMeta;
}

const PANEL_WIDTH = 360;

/**
 * Collapsible AI sidekick chat panel attached to the right edge of the viewport.
 */
export function SidekickPanel({ currentStep }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { draft } = useCharacterStore();

  const { messages, streaming, error, sendMessage, clearError } = useSidekick({
    draft,
    step: currentStep.path,
  });

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = () => {
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        height: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 1200,
        pointerEvents: 'none',
      }}
    >
      {/* Toggle tab */}
      <Box
        sx={{
          alignSelf: 'center',
          pointerEvents: 'auto',
        }}
      >
        <Tooltip title={open ? 'Close AI Sidekick' : 'Open AI Sidekick'} placement="left">
          <Paper
            onClick={() => setOpen((v) => !v)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 1.5,
              px: 0.5,
              cursor: 'pointer',
              borderRight: 'none',
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              '&:hover': { bgcolor: 'rgba(201,168,76,0.12)' },
            }}
          >
            <AutoAwesomeIcon sx={{ color: 'primary.main', mb: 0.5, fontSize: 20 }} />
            <Typography
              variant="caption"
              color="primary"
              sx={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontWeight: 600, fontSize: 10 }}
            >
              AI Sidekick
            </Typography>
            <ChevronRightIcon
              sx={{
                mt: 0.5,
                fontSize: 16,
                color: 'text.secondary',
                transform: open ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.2s',
              }}
            />
          </Paper>
        </Tooltip>
      </Box>

      {/* Panel */}
      <Collapse in={open} orientation="horizontal" timeout={250} sx={{ pointerEvents: 'auto' }}>
        <Paper
          elevation={8}
          sx={{
            width: PANEL_WIDTH,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            borderTop: 'none',
            borderBottom: 'none',
            borderRight: 'none',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <AutoAwesomeIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>
              AI Sidekick
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              Step: {currentStep.label}
            </Typography>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              px: 2,
              py: 2,
            }}
          >
            {messages.length === 0 && (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <AutoAwesomeIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.5, mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Ask me anything about the <strong>{currentStep.label}</strong> step — rules, recommendations,
                  prerequisites, or lore.
                </Typography>
              </Box>
            )}

            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {streaming && messages.at(-1)?.content === '' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                <CircularProgress size={14} color="primary" />
                <Typography variant="caption" color="text.secondary">Thinking…</Typography>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* Error banner */}
          {error && (
            <Alert severity="error" onClose={clearError} sx={{ mx: 2, mb: 1, py: 0.5 }}>
              {error}
            </Alert>
          )}

          <Divider />

          {/* Input */}
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              multiline
              maxRows={4}
              fullWidth
              size="small"
              placeholder="Ask the sidekick…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              size="small"
              sx={{ mb: 0.5 }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
}
