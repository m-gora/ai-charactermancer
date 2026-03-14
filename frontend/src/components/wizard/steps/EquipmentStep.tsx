import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Alert,
  Divider,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCharacterStore } from '../../../store/characterStore';

interface EquipmentPack {
  name: string;
  items: string[];
  gold: number;
}

const PACKS: EquipmentPack[] = [
  {
    name: "Adventurer's Pack",
    gold: 0,
    items: ['Backpack', 'Bedroll', 'Flint and steel', 'Hemp rope (50 ft)', 'Rations ×5', 'Torches ×5', 'Waterskin'],
  },
  {
    name: "Dungeoneer's Pack",
    gold: 0,
    items: ['Backpack', 'Crowbar', 'Grappling hook', 'Hempen rope (50 ft)', 'Lamp with oil ×3', 'Rations ×5', 'Waterskin'],
  },
  {
    name: "Scholar's Pack",
    gold: 0,
    items: ['Backpack', 'Blank journal', 'Ink and quill', 'Rations ×5', 'Spell component pouch', 'Waterskin'],
  },
];

/** Starting gold by class (average). */
const CLASS_GOLD: Record<string, number> = {
  Barbarian: 105, Bard: 105, Cleric: 140, Druid: 52,
  Fighter: 175, Monk: 35, Paladin: 175, Ranger: 175,
  Rogue: 140, Sorcerer: 70, Wizard: 70,
};

const COMMON_ITEMS = [
  'Longsword', 'Shortsword', 'Handaxe', 'Dagger', 'Club',
  'Quarterstaff', 'Shortbow + 20 arrows', 'Crossbow + 20 bolts',
  'Chain shirt', 'Leather armor', 'Scale mail', 'Breastplate',
  'Light wooden shield', 'Heavy wooden shield',
  'Healer\'s kit', 'Thieves\' tools',
  'Holy symbol (silver)', 'Spellbook',
  'Travelling spellbook', 'Spell component pouch',
  'Trail rations ×5', 'Waterskin', 'Torches ×10',
  'Rope (50 ft)', 'Grappling hook',
  'Lantern (hooded)', 'Oil flask ×5',
];

export function EquipmentStep() {
  const { draft, setDraft } = useCharacterStore();
  const startingGold = CLASS_GOLD[draft.class ?? ''] ?? 105;

  const applyPack = (pack: EquipmentPack) => {
    const newItems = pack.items.filter((i) => !draft.equipment.includes(i));
    setDraft({ equipment: [...draft.equipment, ...newItems] });
  };

  const addItem = (item: string) => {
    if (!draft.equipment.includes(item)) {
      setDraft({ equipment: [...draft.equipment, item] });
    }
  };

  const removeItem = (item: string) => {
    setDraft({ equipment: draft.equipment.filter((i) => i !== item) });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Starting Equipment
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        As a level 1 {draft.class ?? 'character'} you start with approximately{' '}
        <strong>{startingGold} gp</strong> of equipment (average roll).
        Pick a starter pack, then customise individual items.
      </Typography>

      {/* Starter packs */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
        Starter Packs
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {PACKS.map((pack) => (
          <Button
            key={pack.name}
            variant="outlined"
            size="small"
            onClick={() => applyPack(pack)}
          >
            {pack.name}
          </Button>
        ))}
      </Stack>

      {/* Common items to add */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Add Individual Items
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {COMMON_ITEMS.map((item) => (
          <Chip
            key={item}
            label={item}
            size="small"
            variant="outlined"
            icon={<AddIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => addItem(item)}
            disabled={draft.equipment.includes(item)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Selected equipment */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Your Equipment {draft.equipment.length > 0 && `(${draft.equipment.length} items)`}
      </Typography>

      {draft.equipment.length === 0 ? (
        <Alert severity="info" icon={false}>
          No equipment selected yet — apply a pack or add individual items above.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.5}>
            {draft.equipment.map((item) => (
              <Box key={item} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">{item}</Typography>
                <Chip
                  label="Remove"
                  size="small"
                  variant="outlined"
                  color="error"
                  icon={<RemoveIcon sx={{ fontSize: '14px !important' }} />}
                  onClick={() => removeItem(item)}
                  sx={{ cursor: 'pointer' }}
                />
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
