import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { useCharacterStore } from '../../../store/characterStore';
import { fetchFeats } from '../../../api/client';
import type { FeatData } from '../../../api/client';

/** Common PF1e feats available at level 1 (representative selection). */
const FALLBACK_FEATS: FeatData[] = [
  'Alertness', 'Athletic', 'Blind-Fight', 'Combat Casting', 'Combat Expertise',
  'Combat Reflexes', 'Dodge', 'Endurance', 'Improved Initiative', 'Iron Will',
  'Lightning Reflexes', 'Power Attack', 'Toughness', 'Weapon Finesse', 'Weapon Focus',
].map((name) => ({ id: name, name, summary: '', description: '', prerequisite_text: '', tags: [], sub_type: 'feat', prerequisite_names: [] }));

function maxFeats(cls?: string): number {
  if (cls === 'Fighter') return 2; // bonus feat at level 1
  return 1;
}

const humanOffset = (race?: string) => (race === 'Human' ? 1 : 0);

/** Split a plain-text description into Prerequisite / Benefit sections. */
const PREREQ_RE = /Prerequisites?\s*:\s*([^.]+\.)/i;
const BENEFIT_RE = /Benefits?\s*:\s*([\s\S]+)/i;

function splitDescription(feat: FeatData): { prereq: string; benefit: string } {
  const prereq =
    feat.prerequisite_text ||
    (feat.prerequisite_names?.join(', ') ?? '') ||
    (() => {
      const desc = feat.description ?? '';
      const m = PREREQ_RE.exec(desc);
      return m?.[1]?.trim() ?? '';
    })();

  const benefit = (() => {
    const desc = feat.description ?? '';
    const m = BENEFIT_RE.exec(desc);
    return m?.[1]?.trim() ?? desc;
  })();

  return { prereq, benefit };
}

export function FeatsStep() {
  const { draft, setDraft } = useCharacterStore();
  const [featOptions, setFeatOptions] = useState<FeatData[]>(FALLBACK_FEATS);
  const [featMap, setFeatMap] = useState<Map<string, FeatData>>(new Map());
  const limit = maxFeats(draft.class);
  const totalLimit = limit + humanOffset(draft.race);
  const overcommitted = draft.feats.length > totalLimit;

  useEffect(() => {
    fetchFeats()
      .then((feats) => {
        setFeatOptions(feats);
        setFeatMap(new Map(feats.map((f) => [f.name, f])));
      })
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
        options={featOptions.map((f) => f.name)}
        value={draft.feats}
        onChange={handleChange}
        freeSolo
        filterSelectedOptions
        getOptionDisabled={() => draft.feats.length >= totalLimit}
        renderOption={(props, option) => {
          const feat = featMap.get(option);
          const prereq = feat?.prerequisite_text ||
            (feat?.prerequisite_names?.length ? feat.prerequisite_names.join(', ') : null);
          return (
            <li {...props} key={option}>
              <Box sx={{ py: 0.25, width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <Typography variant="body2" fontWeight={600} component="span">
                    {option}
                  </Typography>
                  {feat?.tags?.slice(0, 3).map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined"
                      sx={{ height: 18, fontSize: '0.65rem', borderColor: 'primary.main', color: 'primary.main' }} />
                  ))}
                </Box>
                {prereq && (
                  <Typography variant="caption" color="warning.main" display="block">
                    Requires: {prereq}
                  </Typography>
                )}
                {feat?.summary && (
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {feat.summary}
                  </Typography>
                )}
              </Box>
            </li>
          );
        }}
        renderInput={(params) => {
          const selectedCount = draft.feats.length;
          const unitLabel = totalLimit === 1 ? 'feat' : 'feats';
          const helperText = overcommitted
            ? `Too many feats: ${selectedCount} / ${totalLimit} allowed`
            : `${selectedCount} / ${totalLimit} ${unitLabel} selected — type a custom name and press Enter`;
          return (
            <TextField
              {...params}
              variant="outlined"
              label="Select or type feat names"
              placeholder={selectedCount === 0 ? 'e.g. Power Attack' : ''}
              error={overcommitted}
              helperText={helperText}
            />
          );
        }}
      />

      {/* Detail cards for selected feats */}
      {draft.feats.length > 0 && (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {draft.feats.map((name) => {
            const feat = featMap.get(name);
            if (!feat) return null;
            const { prereq, benefit } = splitDescription(feat);
            return (
              <Card key={name} variant="outlined"
                sx={{ borderColor: 'divider', bgcolor: 'background.paper' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>{name}</Typography>
                    {feat.tags.slice(0, 4).map((tag) => (
                      <Chip key={tag} label={tag} size="small"
                        sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'secondary.main', color: 'white' }} />
                    ))}
                  </Box>

                  {prereq && (
                    <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 0.5 }}>
                      <strong>Prerequisites:</strong> {prereq}
                    </Typography>
                  )}

                  {prereq && benefit && <Divider sx={{ my: 0.75 }} />}

                  {benefit && (
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {benefit.length > 400 ? benefit.slice(0, 400) + '…' : benefit}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
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
