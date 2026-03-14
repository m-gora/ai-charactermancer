import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import { useCharacterStore } from '../../../store/characterStore';

interface Trait {
  name: string;
  category: 'Combat' | 'Faith' | 'Magic' | 'Social' | 'Regional';
  description: string;
}

const TRAITS: Trait[] = [
  // Combat
  { name: 'Anatomist',         category: 'Combat',   description: '+1 to confirm critical hit rolls.' },
  { name: 'Armor Expert',      category: 'Combat',   description: 'Reduce armor check penalty by 1.' },
  { name: 'Dirty Fighter',     category: 'Combat',   description: '+1 damage when you have a flanking bonus.' },
  { name: 'Reactionary',       category: 'Combat',   description: '+2 to Initiative checks.' },
  { name: 'Resilient',         category: 'Combat',   description: '+1 to Fortitude saving throws.' },
  { name: 'Defender of Society', category: 'Combat', description: '+1 AC when wearing medium or heavy armor.' },
  // Faith
  { name: 'Birthmark',         category: 'Faith',    description: '+2 to saves vs. charm and compulsion effects.' },
  { name: 'Caretaker',         category: 'Faith',    description: '+1 to Heal; Heal is a class skill for you.' },
  { name: 'Indomitable Faith', category: 'Faith',    description: '+1 to Will saving throws.' },
  { name: 'Scholar of the Great Beyond', category: 'Faith', description: '+1 to Knowledge (History) and Knowledge (Planes).' },
  { name: 'Ease of Faith',     category: 'Faith',    description: '+1 to Diplomacy; Diplomacy is a class skill for you.' },
  // Magic
  { name: 'Classically Schooled', category: 'Magic', description: '+1 to Spellcraft; Spellcraft is a class skill for you.' },
  { name: 'Dangerously Curious',  category: 'Magic', description: '+1 to Use Magic Device; UMD is a class skill for you.' },
  { name: 'Focused Mind',         category: 'Magic', description: '+2 to concentration checks.' },
  { name: 'Gifted Adept',         category: 'Magic', description: '+1 to caster level for one spell of your choice.' },
  { name: 'Magical Knack',        category: 'Magic', description: '+2 to caster level (up to your character level).' },
  // Social
  { name: 'Fast Talker',       category: 'Social',   description: '+1 to Bluff; Bluff is a class skill for you.' },
  { name: 'Honest',            category: 'Social',   description: '+2 to Sense Motive checks.' },
  { name: 'Poverty-Stricken',  category: 'Social',   description: '+1 to Survival; Survival is a class skill for you.' },
  { name: 'Suspicious',        category: 'Social',   description: '+1 to Sense Motive; Sense Motive is a class skill.' },
  { name: 'Well-Informed',     category: 'Social',   description: '+1 to Diplomacy and Knowledge (Local) checks.' },
  // Regional
  { name: 'Frontier-Forged',   category: 'Regional', description: '+1 to Survival and +1 to Initiative.' },
  { name: 'River Rat',         category: 'Regional', description: '+1 to damage with daggers; +1 to Swim; Swim is a class skill.' },
  { name: 'Veteran of Battle', category: 'Regional', description: '+1 to Initiative; draw a weapon (or holy symbol) as a free action during a surprise round.' },
];

const CATEGORY_COLOURS: Record<Trait['category'], 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  Combat:   'error',
  Faith:    'warning',
  Magic:    'info',
  Social:   'success',
  Regional: 'default',
};

const CATEGORIES = ['Combat', 'Faith', 'Magic', 'Social', 'Regional'] as const;

const MAX_TRAITS = 2;

export function TraitsStep() {
  const { draft, setDraft } = useCharacterStore();

  const toggle = (name: string) => {
    if (draft.traits.includes(name)) {
      setDraft({ traits: draft.traits.filter((t) => t !== name) });
      return;
    }
    if (draft.traits.length >= MAX_TRAITS) return;

    // Enforce: no two traits from the same category
    const selected = TRAITS.find((t) => t.name === name)!;
    const alreadyHasCategory = draft.traits.some(
      (t) => TRAITS.find((x) => x.name === t)?.category === selected.category,
    );
    if (alreadyHasCategory) return;

    setDraft({ traits: [...draft.traits, name] });
  };

  const remaining = MAX_TRAITS - draft.traits.length;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Choose Your Traits
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Select <strong>2 traits</strong> from <strong>different categories</strong>.
        Traits represent your character's background and give minor but flavourful bonuses.
      </Typography>

      <Alert severity={remaining === 0 ? 'success' : 'info'} sx={{ mb: 3 }}>
        {remaining === 0
          ? `Both traits selected.`
          : `${remaining} trait${remaining !== 1 ? 's' : ''} remaining — pick from a different category than your first choice.`}
      </Alert>

      <Stack spacing={3}>
        {CATEGORIES.map((category) => {
          const catTraits = TRAITS.filter((t) => t.category === category);
          const categoryTaken = draft.traits.some(
            (t) => TRAITS.find((x) => x.name === t)?.category === category,
          );

          return (
            <Box key={category}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Chip
                  label={category}
                  size="small"
                  color={CATEGORY_COLOURS[category]}
                  variant="outlined"
                />
                {categoryTaken && (
                  <Typography variant="caption" color="text.secondary">
                    (already selected from this category)
                  </Typography>
                )}
              </Box>
              <Stack spacing={1}>
                {catTraits.map((trait) => {
                  const isSelected = draft.traits.includes(trait.name);
                  const isDisabled =
                    !isSelected && (draft.traits.length >= MAX_TRAITS || (categoryTaken && !isSelected));

                  return (
                    <Paper
                      key={trait.name}
                      variant="outlined"
                      onClick={() => !isDisabled && toggle(trait.name)}
                      sx={{
                        px: 2,
                        py: 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.45 : 1,
                        borderColor: isSelected ? 'primary.main' : undefined,
                        bgcolor: isSelected ? 'rgba(201,168,76,0.1)' : undefined,
                        transition: 'border-color 0.15s, background-color 0.15s',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {trait.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {trait.description}
                          </Typography>
                        </Box>
                        {isSelected && (
                          <Chip label="Selected" size="small" color="primary" sx={{ ml: 1, flexShrink: 0 }} />
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
              <Divider sx={{ mt: 2 }} />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
