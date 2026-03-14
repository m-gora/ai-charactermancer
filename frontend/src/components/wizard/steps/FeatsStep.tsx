import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Chip,
  Paper,
  Alert,
} from '@mui/material';
import { useCharacterStore } from '../../../store/characterStore';

/** Common PF1e feats available at level 1 (representative selection). */
const COMMON_FEATS = [
  'Alertness',
  'Athletic',
  'Blind-Fight',
  'Combat Casting',
  'Combat Expertise',
  'Combat Reflexes',
  'Deceitful',
  'Deft Hands',
  'Dodge',
  'Endurance',
  'Eschew Materials',
  'Extra Channel',
  'Fleet',
  'Great Fortitude',
  'Improved Bull Rush',
  'Improved Channel',
  'Improved Disarm',
  'Improved Familiar',
  'Improved Grapple',
  'Improved Initiative',
  'Improved Overrun',
  'Improved Shield Bash',
  'Improved Sunder',
  'Improved Trip',
  'Improved Unarmed Strike',
  'Intimidating Prowess',
  'Iron Will',
  'Lightning Reflexes',
  'Martial Weapon Proficiency',
  'Mounted Combat',
  'Natural Spell',
  'Nimble Moves',
  'Persuasive',
  'Power Attack',
  'Quick Draw',
  'Run',
  'Skill Focus',
  'Stealthy',
  'Step Up',
  'Toughness',
  'Two-Weapon Fighting',
  'Vital Strike',
  'Weapon Finesse',
  'Weapon Focus',
];

function maxFeats(cls?: string): number {
  if (cls === 'Fighter') return 2; // bonus feat at level 1
  return 1;
}

const humanOffset = (race?: string) => (race === 'Human' ? 1 : 0);

export function FeatsStep() {
  const { draft, setDraft } = useCharacterStore();
  const limit = maxFeats(draft.class);
  const totalLimit = limit + humanOffset(draft.race);

  const handleChange = (_: unknown, value: string[]) => {
    setDraft({ feats: value });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Choose Your Feats
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        At level 1, every character receives <strong>1 feat</strong>. Fighters receive an additional
        bonus combat feat. Humans receive an additional bonus feat as well.
      </Typography>

      {draft.race === 'Human' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          As a Human you gain an extra bonus feat — you may select up to <strong>{totalLimit}</strong> feat{totalLimit === 1 ? '' : 's'}.
        </Alert>
      )}

      <Autocomplete
        multiple
        options={COMMON_FEATS}
        value={draft.feats}
        onChange={handleChange}
        freeSolo
        filterSelectedOptions
        getOptionDisabled={() => draft.feats.length >= totalLimit}
        renderTags={(value, getTagProps) =>
          value.map((feat, index) => {
            // Destructure key from getTagProps to prevent the key-after-spread warning
            const { key: _tagKey, ...tagProps } = getTagProps({ index });
            return (
              <Chip
                key={feat}
                variant="outlined"
                label={feat}
                color="primary"
                size="small"
                {...tagProps}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Select or type feat names"
            placeholder={draft.feats.length === 0 ? 'e.g. Power Attack' : ''}
            helperText={`${draft.feats.length} / ${totalLimit} feat${totalLimit === 1 ? '' : 's'} selected — type a custom feat name and press Enter`}
          />
        )}
      />

      {draft.feats.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Selected Feats
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {draft.feats.map((feat) => (
              <Chip
                key={feat}
                label={feat}
                color="primary"
                variant="outlined"
                onDelete={() => setDraft({ feats: draft.feats.filter((f) => f !== feat) })}
              />
            ))}
          </Box>
        </Paper>
      )}

      <Alert severity="info" sx={{ mt: 3 }} icon={false}>
        <Typography variant="caption">
          Ask the <strong>AI Sidekick</strong> for feat recommendations based on your race, class, and
          planned build — it can explain prerequisites and synergies.
        </Typography>
      </Alert>
    </Box>
  );
}
