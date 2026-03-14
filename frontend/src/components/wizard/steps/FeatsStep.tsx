import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Alert,
} from '@mui/material';
import { useCharacterStore } from '../../../store/characterStore';
import { fetchFeats } from '../../../api/client';

/** Common PF1e feats available at level 1 (representative selection). */
const FALLBACK_FEATS = [
  'Alertness', 'Athletic', 'Blind-Fight', 'Combat Casting', 'Combat Expertise',
  'Combat Reflexes', 'Dodge', 'Endurance', 'Improved Initiative', 'Iron Will',
  'Lightning Reflexes', 'Power Attack', 'Toughness', 'Weapon Finesse', 'Weapon Focus',
];

function maxFeats(cls?: string): number {
  if (cls === 'Fighter') return 2; // bonus feat at level 1
  return 1;
}

const humanOffset = (race?: string) => (race === 'Human' ? 1 : 0);

export function FeatsStep() {
  const { draft, setDraft } = useCharacterStore();
  const [featOptions, setFeatOptions] = useState<string[]>(FALLBACK_FEATS);
  const limit = maxFeats(draft.class);
  const totalLimit = limit + humanOffset(draft.race);
  const overcommitted = draft.feats.length > totalLimit;

  useEffect(() => {
    fetchFeats()
      .then((feats) => setFeatOptions(feats.map((f) => f.name)))
      .catch(() => { /* keep fallback */ });
  }, []);

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

      {draft.race === 'Human' && !overcommitted && (
        <Alert severity="info" sx={{ mb: 2 }}>
          As a Human you gain an extra bonus feat — you may select up to <strong>{totalLimit}</strong> feat{totalLimit === 1 ? '' : 's'}.
        </Alert>
      )}

      {overcommitted && (
        <Alert severity="error" sx={{ mb: 2 }}>
          You have <strong>{draft.feats.length}</strong> feats selected but your race/class combination
          only allows <strong>{totalLimit}</strong>. Please remove{' '}
          {draft.feats.length - totalLimit} feat{draft.feats.length - totalLimit > 1 ? 's' : ''}.
        </Alert>
      )}

      <Autocomplete
        multiple
        options={featOptions}
        value={draft.feats}
        onChange={handleChange}
        freeSolo
        filterSelectedOptions
        getOptionDisabled={() => draft.feats.length >= totalLimit}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Select or type feat names"
            placeholder={draft.feats.length === 0 ? 'e.g. Power Attack' : ''}
            error={overcommitted}
            helperText={
              overcommitted
                ? `Too many feats: ${draft.feats.length} / ${totalLimit} allowed`
                : `${draft.feats.length} / ${totalLimit} feat${totalLimit === 1 ? '' : 's'} selected — type a custom feat name and press Enter`
            }
          />
        )}
      />

      <Alert severity="info" sx={{ mt: 3 }} icon={false}>
        <Typography variant="caption">
          Ask the <strong>AI Sidekick</strong> for feat recommendations based on your race, class, and
          planned build — it can explain prerequisites and synergies.
        </Typography>
      </Alert>
    </Box>
  );
}
