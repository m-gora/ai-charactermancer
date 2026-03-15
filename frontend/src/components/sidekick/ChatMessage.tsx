import { Box, Typography, Avatar, Chip } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ActionItem } from '../../api/client';
import { useCharacterStore, type CharacterDraft } from '../../store/characterStore';

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionItem[];
}

interface Props {
  message: Message;
}

function isActionApplied(action: ActionItem, draft: CharacterDraft): boolean {
  if (action.field === 'race') return draft.race === action.value;
  if (action.field === 'class') return draft.class === action.value;
  const arr = draft[action.field as keyof CharacterDraft];
  return Array.isArray(arr) && arr.includes(action.value);
}

/**
 * Renders a single chat bubble in the sidekick panel.
 * Assistant messages may include click-to-apply action chips.
 */
export function ChatMessage({ message }: Readonly<Props>) {
  const isUser = message.role === 'user';
  const { draft, setDraft } = useCharacterStore();

  const handleApply = (action: ActionItem) => {
    const { field, value } = action;
    if (field === 'race' || field === 'class') {
      setDraft({ [field]: value } as Partial<CharacterDraft>);
    } else {
      const current = (draft[field as keyof CharacterDraft] as string[] | undefined) ?? [];
      if (!current.includes(value)) {
        setDraft({ [field]: [...current, value] } as Partial<CharacterDraft>);
      }
    }
  };

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

        {/* Action chips — only on assistant messages with recommendations */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Add to sheet:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {message.actions.map((action, i) => {
                const applied = isActionApplied(action, draft);
                return (
                  <Chip
                    key={i}
                    label={action.label}
                    size="small"
                    color={applied ? 'default' : 'primary'}
                    variant={applied ? 'outlined' : 'filled'}
                    icon={applied
                      ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} />
                      : <AddCircleOutlineIcon sx={{ fontSize: '14px !important' }} />
                    }
                    onClick={applied ? undefined : () => handleApply(action)}
                    title={action.description}
                    sx={{ opacity: applied ? 0.55 : 1, cursor: applied ? 'default' : 'pointer' }}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
