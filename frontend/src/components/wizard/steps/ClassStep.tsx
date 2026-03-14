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
} from '@mui/material';
import { useCharacterStore } from '../../../store/characterStore';

interface ClassInfo {
  name: string;
  role: string;
  hitDie: string;
  keyAttr: string;
}

const PF1E_CLASSES: ClassInfo[] = [
  { name: 'Barbarian', role: 'Melee Striker',      hitDie: 'd12', keyAttr: 'STR / CON'  },
  { name: 'Bard',      role: 'Skill & Support',    hitDie: 'd8',  keyAttr: 'CHA'        },
  { name: 'Cleric',    role: 'Divine Caster',      hitDie: 'd8',  keyAttr: 'WIS'        },
  { name: 'Druid',     role: 'Nature Caster',      hitDie: 'd8',  keyAttr: 'WIS'        },
  { name: 'Fighter',   role: 'Martial Specialist', hitDie: 'd10', keyAttr: 'STR / DEX'  },
  { name: 'Monk',      role: 'Unarmed Striker',    hitDie: 'd8',  keyAttr: 'WIS / STR'  },
  { name: 'Paladin',   role: 'Divine Champion',    hitDie: 'd10', keyAttr: 'STR / CHA'  },
  { name: 'Ranger',    role: 'Skirmisher',         hitDie: 'd10', keyAttr: 'DEX / STR'  },
  { name: 'Rogue',     role: 'Skill & Sneak',      hitDie: 'd8',  keyAttr: 'DEX'        },
  { name: 'Sorcerer',  role: 'Arcane Caster',      hitDie: 'd6',  keyAttr: 'CHA'        },
  { name: 'Wizard',    role: 'Arcane Scholar',     hitDie: 'd6',  keyAttr: 'INT'        },
];

export function ClassStep() {
  const { draft, setDraft } = useCharacterStore();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Choose Your Class
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your class defines your core combat style, spellcasting ability, and class features. You're starting at level 1.
      </Typography>

      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend" sx={{ mb: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
          Core Classes (Pathfinder 1e)
        </FormLabel>
        <RadioGroup
          value={draft.class ?? ''}
          onChange={(e) => setDraft({ class: e.target.value })}
        >
          <Stack spacing={1}>
            {PF1E_CLASSES.map((cls) => (
              <Paper
                key={cls.name}
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1.5,
                  cursor: 'pointer',
                  borderColor: draft.class === cls.name ? 'primary.main' : undefined,
                  bgcolor: draft.class === cls.name ? 'rgba(201,168,76,0.08)' : undefined,
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
                onClick={() => setDraft({ class: cls.name })}
              >
                <FormControlLabel
                  value={cls.name}
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ minWidth: 90 }}>
                        {cls.name}
                      </Typography>
                      <Chip label={cls.role}    size="small" variant="outlined" />
                      <Chip label={`HD: ${cls.hitDie}`}  size="small" color="secondary" variant="outlined" />
                      <Chip label={cls.keyAttr} size="small" color="primary"   variant="outlined" />
                    </Box>
                  }
                  sx={{ width: '100%', mx: 0 }}
                />
              </Paper>
            ))}
          </Stack>
        </RadioGroup>
      </FormControl>
    </Box>
  );
}
