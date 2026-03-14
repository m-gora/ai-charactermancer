import {
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Paper,
  Chip,
  Stack,
  MenuItem,
  TextField,
  Alert,
} from '@mui/material';
import { useCharacterStore, type Attributes } from '../../../store/characterStore';

interface RaceInfo {
  name: string;
  bonus: string;
  flavour: string;
}

const PF1E_RACES: RaceInfo[] = [
  { name: 'Human',    bonus: '+2 to one ability score of choice',          flavour: 'Adaptable and ambitious; the most widespread of all races.' },
  { name: 'Elf',      bonus: '+2 DEX, +2 INT, −2 CON',                    flavour: 'Ancient scholars of magic who sleep in trances rather than true slumber.' },
  { name: 'Dwarf',    bonus: '+2 CON, +2 WIS, −2 CHA',                    flavour: 'Stoic miners and warriors forged by centuries underground.' },
  { name: 'Gnome',    bonus: '+2 CON, +2 CHA, −2 STR',                    flavour: 'Quirky illusionists with a powerful connection to the First World.' },
  { name: 'Halfling', bonus: '+2 DEX, +2 CHA, −2 STR',                    flavour: 'Cheerful wanderers blessed by an uncanny luck.' },
  { name: 'Half-Elf', bonus: '+2 to one ability score of choice',          flavour: 'Bridge between two worlds, with elven senses and human drive.' },
  { name: 'Half-Orc', bonus: '+2 to one ability score of choice',          flavour: 'Fierce survivors who channel orcish ferocity through civilised skill.' },
];

const FLEX_BONUS_RACES = new Set(['Human', 'Half-Elf', 'Half-Orc']);

const ATTR_OPTIONS: { key: keyof Attributes; label: string }[] = [
  { key: 'str', label: 'Strength (STR)' },
  { key: 'dex', label: 'Dexterity (DEX)' },
  { key: 'con', label: 'Constitution (CON)' },
  { key: 'int', label: 'Intelligence (INT)' },
  { key: 'wis', label: 'Wisdom (WIS)' },
  { key: 'cha', label: 'Charisma (CHA)' },
];

export function RaceStep() {
  const { draft, setDraft } = useCharacterStore();

  const selected = PF1E_RACES.find((r) => r.name === draft.race);
  const needsBonusChoice = draft.race ? FLEX_BONUS_RACES.has(draft.race) : false;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Choose Your Race
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your race grants ability score adjustments and racial traits that shape your character throughout their adventuring career.
      </Typography>

      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend" sx={{ mb: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
          Core Races (Pathfinder 1e)
        </FormLabel>
        <RadioGroup
          value={draft.race ?? ''}
          onChange={(e) => {
            setDraft({ race: e.target.value, humanBonusAttr: undefined });
          }}
        >
          <Stack spacing={1}>
            {PF1E_RACES.map((race) => (
              <Paper
                key={race.name}
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1.5,
                  cursor: 'pointer',
                  borderColor: draft.race === race.name ? 'primary.main' : undefined,
                  bgcolor: draft.race === race.name ? 'rgba(201,168,76,0.08)' : undefined,
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
                onClick={() => setDraft({ race: race.name })}
              >
                <FormControlLabel
                  value={race.name}
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {race.name}
                        </Typography>
                        <Chip label={race.bonus} size="small" variant="outlined" color="primary" />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {race.flavour}
                      </Typography>
                    </Box>
                  }
                  sx={{ width: '100%', mx: 0 }}
                />
              </Paper>
            ))}
          </Stack>
        </RadioGroup>
      </FormControl>

      {selected && (
        <Paper sx={{ mt: 3, p: 2, bgcolor: 'rgba(201,168,76,0.05)' }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Selected: {selected.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: needsBonusChoice ? 2 : 0 }}>
            <strong>Ability score adjustment:</strong> {selected.bonus}
          </Typography>

          {needsBonusChoice && (
            <>
              {!draft.humanBonusAttr && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  You must choose which ability score receives the free <strong>+2</strong> racial bonus.
                </Alert>
              )}
              <TextField
                select
                fullWidth
                label="Choose your +2 ability score bonus"
                value={draft.humanBonusAttr ?? ''}
                onChange={(e) => setDraft({ humanBonusAttr: e.target.value as keyof Attributes })}
                size="small"
                error={!draft.humanBonusAttr}
              >
                <MenuItem value=""><em>Select an ability score…</em></MenuItem>
                {ATTR_OPTIONS.map(({ key, label }) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </TextField>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}
