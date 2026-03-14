import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import { useCharacterStore } from '../../../store/characterStore';

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

const DEITIES = [
  'Abadar', 'Asmodeus', 'Calistria', 'Cayden Cailean', 'Desna',
  'Erastil', 'Gorum', 'Gozreh', 'Iomedae', 'Irori', 'Lamashtu',
  'Nethys', 'Norgorber', 'Pharasma', 'Rovagug', 'Sarenrae',
  'Shelyn', 'Torag', 'Urgathoa', 'Zon-Kuthon', 'None / Unaffiliated',
];

export function BasicInfoStep() {
  const { draft, setDraft } = useCharacterStore();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Basic Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Give your character an identity. These details don't affect game mechanics but
        help bring your character to life.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField
            fullWidth
            label="Character Name"
            value={draft.name ?? ''}
            onChange={(e) => setDraft({ name: e.target.value })}
            placeholder="e.g. Aldric Stonefist"
            required
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="Age"
            type="number"
            value={draft.age ?? ''}
            onChange={(e) => setDraft({ age: e.target.value ? Number(e.target.value) : undefined })}
            slotProps={{ htmlInput: { min: 1, max: 9999 } }}
            placeholder="e.g. 25"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Gender / Pronouns"
            value={draft.gender ?? ''}
            onChange={(e) => setDraft({ gender: e.target.value })}
            placeholder="e.g. Male, Female, Non-binary…"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Homeland"
            value={draft.homeland ?? ''}
            onChange={(e) => setDraft({ homeland: e.target.value })}
            placeholder="e.g. Absalom, Varisia…"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="Alignment"
            value={draft.alignment ?? ''}
            onChange={(e) => setDraft({ alignment: e.target.value })}
          >
            <MenuItem value=""><em>Select alignment…</em></MenuItem>
            {ALIGNMENTS.map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="Deity"
            value={draft.deity ?? ''}
            onChange={(e) => setDraft({ deity: e.target.value })}
          >
            <MenuItem value=""><em>Select deity…</em></MenuItem>
            {DEITIES.map((d) => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    </Box>
  );
}
