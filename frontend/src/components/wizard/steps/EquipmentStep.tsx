import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SearchIcon from '@mui/icons-material/Search';
import { useCharacterStore } from '../../../store/characterStore';
import { fetchItems, type ItemData } from '../../../api/client';

interface EquipmentPack {
  name: string;
  items: string[];
}

const PACKS: EquipmentPack[] = [
  { name: "Adventurer's Pack", items: ['Backpack, common', 'Bedroll', 'Flint and steel', 'Hempen rope (50 ft)', 'Trail rations (5)', 'Torch (5)', 'Waterskin'] },
  { name: "Dungeoneer's Pack", items: ['Backpack, common', 'Crowbar', 'Grappling hook', 'Hempen rope (50 ft)', 'Lantern, hooded', 'Oil (3)', 'Trail rations (5)', 'Waterskin'] },
  { name: "Scholar's Pack", items: ['Backpack, common', 'Blank journal', 'Ink (1 oz. vial)', 'Ink pen', 'Trail rations (5)', 'Spell component pouch', 'Waterskin'] },
  { name: "Fighter's Kit", items: ['Chain shirt', 'Longsword', 'Heavy wooden shield', 'Backpack, common', 'Trail rations (5)', 'Waterskin', 'Torch (5)'] },
  { name: "Rogue's Kit", items: ['Leather armor', 'Shortsword', 'Dagger', "Thieves' tools", 'Backpack, common', 'Trail rations (5)', 'Waterskin'] },
  { name: "Wizard's Kit", items: ['Spellbook (blank)', 'Spell component pouch', 'Quarterstaff', 'Backpack, common', 'Trail rations (5)', 'Waterskin'] },
  { name: "Cleric's Kit", items: ['Scale mail', 'Light wooden shield', 'Holy symbol, silver', 'Heavy mace', 'Backpack, common', 'Trail rations (5)', 'Waterskin'] },
];

/** Average starting gold by class. */
const CLASS_GOLD: Record<string, number> = {
  Barbarian: 105, Bard: 105, Cleric: 140, Druid: 52,
  Fighter: 175, Monk: 35, Paladin: 175, Ranger: 175,
  Rogue: 140, Sorcerer: 70, Wizard: 70,
};

const WEAPON_SUB_LABELS: Record<string, string> = {
  simple: 'Simple', martial: 'Martial', exotic: 'Exotic',
};
const ARMOR_SUB_LABELS: Record<string, string> = {
  lightArmor: 'Light Armor', mediumArmor: 'Medium Armor', heavyArmor: 'Heavy Armor',
};
const ITEM_TYPE_LABELS: Record<string, string> = {
  weapon: 'Weapons', armor: 'Armor', shield: 'Shields',
  gear: 'Adventuring Gear', tool: 'Tools', clothing: 'Clothing',
};

const CATEGORY_OPTIONS: { label: string; itemType?: string; subType?: string }[] = [
  { label: 'All' },
  { label: 'Simple Weapons', itemType: 'weapon', subType: 'simple' },
  { label: 'Martial Weapons', itemType: 'weapon', subType: 'martial' },
  { label: 'Exotic Weapons', itemType: 'weapon', subType: 'exotic' },
  { label: 'Light Armor', itemType: 'armor', subType: 'lightArmor' },
  { label: 'Medium Armor', itemType: 'armor', subType: 'mediumArmor' },
  { label: 'Heavy Armor', itemType: 'armor', subType: 'heavyArmor' },
  { label: 'Shields', itemType: 'shield', subType: 'shield' },
  { label: 'Adventuring Gear', itemType: 'gear' },
  { label: 'Tools', itemType: 'tool' },
  { label: 'Clothing', itemType: 'clothing' },
];

function itemCategoryLabel(item: ItemData): string {
  if (item.item_type === 'weapon') return `${WEAPON_SUB_LABELS[item.sub_type] ?? item.sub_type} Weapon`;
  if (item.item_type === 'armor') return ARMOR_SUB_LABELS[item.sub_type] ?? item.sub_type;
  return ITEM_TYPE_LABELS[item.item_type] ?? item.item_type;
}

export function EquipmentStep() {
  const { draft, setDraft } = useCharacterStore();
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(0);

  const startingGold = CLASS_GOLD[draft.class ?? ''] ?? 105;

  useEffect(() => {
    fetchItems()
      .then((data) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = CATEGORY_OPTIONS[categoryIndex] ?? { label: 'All', itemType: undefined, subType: undefined };
  const filterItemType = selected.itemType;
  const filterSubType = selected.subType;

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items
      .filter((item) => {
        if (filterItemType && item.item_type !== filterItemType) return false;
        if (filterSubType && item.sub_type !== filterSubType) return false;
        if (q && !item.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .slice(0, 80);
  }, [items, filterItemType, filterSubType, search]);

  const applyPack = (pack: EquipmentPack) => {
    const toAdd = pack.items.filter((i) => !draft.equipment.includes(i));
    setDraft({ equipment: [...draft.equipment, ...toAdd] });
  };

  const addItem = (name: string) => {
    if (!draft.equipment.includes(name)) setDraft({ equipment: [...draft.equipment, name] });
  };

  const removeItem = (name: string) => {
    setDraft({ equipment: draft.equipment.filter((i) => i !== name) });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Starting Equipment</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        As a level 1 {draft.class ?? 'character'} you start with approximately{' '}
        <strong>{startingGold} gp</strong> of equipment (average roll).
        Apply a starter kit, then add individual items.
      </Typography>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75 }}>Starter Kits</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {PACKS.map((pack) => (
          <Button key={pack.name} variant="outlined" size="small" onClick={() => applyPack(pack)}>
            {pack.name}
          </Button>
        ))}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField
          size="small" placeholder="Search items…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ flex: 1 }}
        />
        <TextField
          select size="small" label="Category" value={categoryIndex}
          onChange={(e) => setCategoryIndex(Number(e.target.value))}
          sx={{ minWidth: 180 }}
        >
          {CATEGORY_OPTIONS.map((opt, i) => (
            <MenuItem key={opt.label} value={i}>{opt.label}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Showing {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}
            {filteredItems.length === 80 ? ' (showing first 80 — narrow your search)' : ''}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3, maxHeight: 280, overflowY: 'auto' }}>
            {filteredItems.map((item) => {
              const inCart = draft.equipment.includes(item.name);
              return (
                <Chip
                  key={item.id}
                  label={item.price == null ? item.name : `${item.name} (${item.price} gp)`}
                  size="small" variant={inCart ? 'filled' : 'outlined'} color={inCart ? 'primary' : 'default'}
                  icon={<AddIcon sx={{ fontSize: '14px !important' }} />}
                  onClick={() => addItem(item.name)} disabled={inCart}
                  title={itemCategoryLabel(item)} sx={{ cursor: inCart ? 'default' : 'pointer' }}
                />
              );
            })}
            {filteredItems.length === 0 && (
              <Typography variant="caption" color="text.secondary">No items match your search.</Typography>
            )}
          </Box>
        </>
      )}

      <Divider sx={{ mb: 2 }} />

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Your Equipment{draft.equipment.length > 0 ? ` (${draft.equipment.length} items)` : ''}
      </Typography>
      {draft.equipment.length === 0 ? (
        <Alert severity="info" icon={false}>No equipment selected yet — apply a starter kit or add items above.</Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.5}>
            {draft.equipment.map((name) => (
              <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">{name}</Typography>
                <Chip label="Remove" size="small" variant="outlined" color="error"
                  icon={<RemoveIcon sx={{ fontSize: '14px !important' }} />}
                  onClick={() => removeItem(name)} sx={{ cursor: 'pointer' }} />
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
