import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Grid,
} from '@mui/material';
import { type CharacterDraft } from '../../store/characterStore';

interface Props {
  draft: CharacterDraft;
}

const ATTR_LABELS: { key: keyof CharacterDraft['attributes']; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

function mod(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

/**
 * Read-only character sheet preview. Updated reactively as the wizard progresses.
 */
export function CharacterSheet({ draft }: Readonly<Props>) {
  const name = draft.name ?? '—';
  const hasBasics = draft.race || draft.class;

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" color="primary">
          {name !== '—' ? name : 'Unnamed Character'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {hasBasics ? `${draft.race ?? '—'} ${draft.class ?? '—'} — Level ${draft.level}` : 'No race/class chosen yet'}
        </Typography>
        {draft.id && (
          <Typography variant="caption" color="text.secondary">
            Draft ID: {draft.id}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Identity */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'Race',       value: draft.race      },
          { label: 'Class',      value: draft.class     },
          { label: 'Level',      value: String(draft.level) },
          { label: 'Alignment',  value: draft.alignment },
          { label: 'Deity',      value: draft.deity     },
          { label: 'Age',        value: draft.age != null ? String(draft.age) : undefined },
          { label: 'Gender',     value: draft.gender    },
          { label: 'Homeland',   value: draft.homeland  },
        ].map(({ label, value }) => (
          <Grid size={{ xs: 6, sm: 3 }} key={label}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body2">{value ?? '—'}</Typography>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* Ability Scores */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Ability Scores
      </Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {ATTR_LABELS.map(({ key, label }) => {
          const score = draft.attributes[key];
          return (
            <Grid size={{ xs: 4, sm: 2 }} key={key}>
              <Paper variant="outlined" sx={{ textAlign: 'center', py: 1, px: 0.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                <Typography variant="h6" color="primary.main" fontWeight={700}>{score}</Typography>
                <Typography variant="caption" color="text.secondary">{mod(score)}</Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* Feats */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Feats</Typography>
      {draft.feats.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {draft.feats.map((feat) => (
            <Chip key={feat} label={feat} size="small" variant="outlined" color="primary" />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>None selected.</Typography>
      )}

      {/* Traits */}
      {draft.traits.length > 0 && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Traits</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {draft.traits.map((trait) => (
              <Chip key={trait} label={trait} size="small" variant="outlined" color="secondary" />
            ))}
          </Box>
        </>
      )}

      {/* Skills */}
      {Object.keys(draft.skills).length > 0 && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Trained Skills</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {Object.entries(draft.skills).map(([skill, ranks]) => (
              <Chip key={skill} label={`${skill} (${ranks})`} size="small" variant="outlined" />
            ))}
          </Box>
        </>
      )}

      {/* Equipment */}
      {draft.equipment.length > 0 && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Equipment</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {draft.equipment.map((item) => (
              <Chip key={item} label={item} size="small" variant="outlined" />
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
}
