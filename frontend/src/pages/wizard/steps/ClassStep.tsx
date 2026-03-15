import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useCharacterStore } from '../../../store/characterStore';
import { fetchClasses, fetchClassAbilities, type ClassData, type ClassAbilityData } from '../../../api/client';

// ---------------------------------------------------------------------------
// Static archetype data (archetypes are not in the current ingestion pipeline)
// ---------------------------------------------------------------------------

interface Archetype {
  name: string;
  replaces: string[]; // class abilities this archetype replaces
  incompatibleWith: string[]; // other archetypes that conflict
}

const ARCHETYPES: Record<string, Archetype[]> = {
  Fighter: [
    { name: 'Archer', replaces: ['Bravery', 'Weapon Training (Melee)'], incompatibleWith: ['Two-Weapon Warrior'] },
    { name: 'Brawler', replaces: ['Weapon Training (Ranged)', 'Armor Training 1'], incompatibleWith: [] },
    { name: 'Two-Weapon Warrior', replaces: ['Weapon Training (Ranged)'], incompatibleWith: ['Archer'] },
    { name: 'Lore Warden', replaces: ['Bravery', 'Armor Training 1'], incompatibleWith: [] },
  ],
  Rogue: [
    { name: 'Thug', replaces: ['Finesse Training', 'Trapfinding'], incompatibleWith: ['Unchained Rogue'] },
    { name: 'Scout', replaces: ['Trapfinding', 'Trap Sense'], incompatibleWith: [] },
    { name: 'Knife Master', replaces: ['Sneak Attack (d6)', 'Trapfinding'], incompatibleWith: [] },
  ],
  Wizard: [
    { name: 'Arcane Bomber', replaces: ['Arcane School', 'Bonus Feats'], incompatibleWith: [] },
    { name: 'Spell Sage', replaces: ['Arcane Bond', 'Arcane School'], incompatibleWith: [] },
  ],
  Cleric: [
    { name: 'Evangelist', replaces: ['Spontaneous Casting', 'Channel Energy'], incompatibleWith: [] },
    { name: 'Theologian', replaces: ['Second Domain', 'Channel Energy'], incompatibleWith: [] },
  ],
  Ranger: [
    { name: 'Trapper', replaces: ["Hunter's Bond"], incompatibleWith: [] },
    { name: 'Skirmisher', replaces: ["Ranger's Spells"], incompatibleWith: [] },
  ],
  Paladin: [
    { name: 'Divine Defender', replaces: ['Divine Grace', 'Lay on Hands'], incompatibleWith: [] },
    { name: 'Warrior of the Holy Light', replaces: ['Spells', 'Divine Bond'], incompatibleWith: [] },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core', base: 'Base', unchained: 'Unchained',
  hybrid: 'Hybrid', occult: 'Occult',
};

const CATEGORY_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info'> = {
  core: 'primary', base: 'default', unchained: 'secondary',
  hybrid: 'warning', occult: 'info',
};

function habLabel(bab: string): string {
  const map: Record<string, string> = { high: 'High BAB', med: 'Med BAB', low: 'Low BAB' };
  return map[bab] ?? bab;
}

function matchesClassSearch(c: ClassData, q: string): boolean {
  const lq = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(lq) ||
    c.summary.toLowerCase().includes(lq) ||
    c.class_skills?.some((s) => s.toLowerCase().includes(lq))
  );
}

function archetypesCompatible(selected: string[]): string | null {
  const archetypeData = selected.map((n) =>
    Object.values(ARCHETYPES).flat().find((a) => a.name === n),
  ).filter(Boolean) as Archetype[];

  for (const a of archetypeData) {
    const conflict = selected.find((n) => n !== a.name && a.incompatibleWith.includes(n));
    if (conflict) return `"${a.name}" and "${conflict}" are incompatible archetypes.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sub-component: class abilities list
// ---------------------------------------------------------------------------

function ClassAbilitiesList({ abilities }: { abilities: ClassAbilityData[] }) {
  if (!abilities.length) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        No class ability data available.
      </Typography>
    );
  }
  return (
    <Stack spacing={0.75} sx={{ mt: 1 }}>
      {abilities.map((a) => (
        <Box key={a.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" fontWeight={700} color="primary.main">{a.name}</Typography>
            {a.ability_type && (
              <Chip label={a.ability_type} size="small" variant="outlined"
                sx={{ height: 14, fontSize: 9 }} />
            )}
          </Box>
          {a.summary && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 0 }}>
              {a.summary}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: archetype picker
// ---------------------------------------------------------------------------

function ArchetypePicker({
  className, selected, onChange,
}: {
  className: string;
  selected: string[];
  onChange: (archetypes: string[]) => void;
}) {
  const available = ARCHETYPES[className] ?? [];
  if (!available.length) return null;

  const compatError = archetypesCompatible(selected);

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((n) => n !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const allReplaced = new Set(
    selected.flatMap((n) => ARCHETYPES[className]?.find((a) => a.name === n)?.replaces ?? []),
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary"
        sx={{ display: 'block', mb: 1 }}>
        ARCHETYPES (optional)
      </Typography>
      {compatError && <Alert severity="error" sx={{ mb: 1 }}>{compatError}</Alert>}
      <Stack spacing={0.75}>
        {available.map((arch) => {
          const isSelected = selected.includes(arch.name);
          return (
            <Paper
              key={arch.name}
              variant="outlined"
              onClick={() => toggle(arch.name)}
              sx={{
                px: 1.5, py: 1, cursor: 'pointer',
                borderColor: isSelected ? 'primary.main' : undefined,
                bgcolor: isSelected ? 'rgba(201,168,76,0.08)' : undefined,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" fontWeight={600}>{arch.name}</Typography>
                {isSelected && <Chip label="Selected" size="small" color="primary" />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Replaces:{' '}
                {arch.replaces.map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    size="small"
                    color={allReplaced.has(r) ? 'warning' : 'default'}
                    variant="outlined"
                    sx={{ height: 16, fontSize: 9, mr: 0.25 }}
                  />
                ))}
              </Typography>
            </Paper>
          );
        })}
      </Stack>
      {selected.length > 0 && allReplaced.size > 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          The selected archetype{selected.length > 1 ? 's' : ''} replace{selected.length === 1 ? 's' : ''}:{' '}
          {[...allReplaced].join(', ')}.
        </Alert>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ClassStep() {
  const { draft, setDraft } = useCharacterStore();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [abilities, setAbilities] = useState<ClassAbilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [archetypes, setArchetypes] = useState<string[]>([]);

  useEffect(() => {
    fetchClasses()
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  // Load class abilities whenever the selected class changes
  useEffect(() => {
    if (!draft.class) { setAbilities([]); return; }
    fetchClassAbilities(draft.class)
      .then(setAbilities)
      .catch(() => setAbilities([]));
  }, [draft.class]);

  // Reset archetypes when the class changes
  useEffect(() => {
    setArchetypes([]);
  }, [draft.class]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    classes.forEach((c) => seen.add(c.source_category ?? 'core'));
    return ['all', ...Array.from(seen).sort()];
  }, [classes]);

  const filtered = useMemo(() => classes.filter((c) => {
    if (categoryFilter !== 'all' && (c.source_category ?? 'core') !== categoryFilter) return false;
    if (search.trim() && !matchesClassSearch(c, search.trim())) return false;
    return true;
  }), [classes, categoryFilter, search]);

  // Group filtered classes by category for visual separation
  const grouped = useMemo(() => {
    const map = new Map<string, ClassData[]>();
    filtered.forEach((c) => {
      const cat = c.source_category ?? 'core';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    });
    return map;
  }, [filtered]);

  const toggleExpanded = (name: string) => setExpanded((prev) => (prev === name ? null : name));

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Choose Your Class</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your class defines your combat style, spellcasting, and features. Expand a card to
        see class abilities and choose optional archetypes.
      </Typography>

      {/* Search + category filter */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small" placeholder="Search classes, skills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
          sx={{ flex: 1 }}
        />
        <TextField
          select size="small" label="Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat === 'all' ? 'All categories' : (CATEGORY_LABELS[cat] ?? cat)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {filtered.length === 0 && <Alert severity="info">No classes match your search.</Alert>}

      <Stack spacing={3}>
        {[...grouped.entries()].map(([cat, catClasses]) => (
          <Box key={cat}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={CATEGORY_LABELS[cat] ?? cat}
                color={CATEGORY_COLORS[cat] ?? 'default'}
                size="small"
              />
            </Box>
            <RadioGroup
              value={draft.class ?? ''}
              onChange={(e) => setDraft({ class: e.target.value })}
            >
              <Stack spacing={1}>
                {catClasses.map((cls) => {
                  const isSelected = draft.class === cls.name;
                  const isExpanded = expanded === cls.name;

                  return (
                    <Paper
                      key={cls.id}
                      variant="outlined"
                      sx={{
                        px: 2, py: 1.5,
                        borderColor: isSelected ? 'primary.main' : undefined,
                        bgcolor: isSelected ? 'rgba(201,168,76,0.08)' : undefined,
                        transition: 'border-color 0.15s, background-color 0.15s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <FormControlLabel
                          value={cls.name}
                          control={<Radio size="small" />}
                          onClick={() => setDraft({ class: cls.name })}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle1" fontWeight={600} sx={{ minWidth: 90 }}>
                                {cls.name}
                              </Typography>
                              <Chip label={`HD: d${cls.hd}`} size="small" color="secondary" variant="outlined" />
                              <Chip label={habLabel(cls.bab)} size="small" color="primary" variant="outlined" />
                            </Box>
                          }
                          sx={{ flex: 1, mx: 0 }}
                        />
                        <Tooltip title={isExpanded ? 'Collapse features' : 'Show features & archetypes'}>
                          <IconButton size="small" onClick={() => toggleExpanded(cls.name)} sx={{ mt: 0.25 }}>
                            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Collapse in={isExpanded}>
                        <Divider sx={{ my: 1 }} />

                        {/* Class skills */}
                        {cls.class_skills?.length > 0 && (
                          <Box sx={{ mb: 1.5 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary"
                              sx={{ display: 'block', mb: 0.5 }}>
                              CLASS SKILLS
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {cls.class_skills.map((s) => (
                                <Chip key={s} label={s} size="small" variant="outlined"
                                  sx={{ height: 18, fontSize: 10 }} />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {/* Class abilities (only shown for selected class to avoid over-fetching) */}
                        {isSelected && (
                          <>
                            <Typography variant="caption" fontWeight={700} color="text.secondary"
                              sx={{ display: 'block', mb: 0.5 }}>
                              CLASS ABILITIES
                            </Typography>
                            <ClassAbilitiesList abilities={abilities} />
                            <ArchetypePicker
                              className={cls.name}
                              selected={archetypes}
                              onChange={setArchetypes}
                            />
                          </>
                        )}
                        {!isSelected && (
                          <Typography variant="caption" color="text.secondary">
                            Select this class to see its class abilities and archetype options.
                          </Typography>
                        )}
                      </Collapse>
                    </Paper>
                  );
                })}
              </Stack>
            </RadioGroup>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

