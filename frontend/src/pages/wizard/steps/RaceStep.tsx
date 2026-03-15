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
  Checkbox,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useCharacterStore, type Attributes } from '../../../store/characterStore';
import { fetchRaces, fetchRacialTraits, type RaceData, type RacialTraitData } from '../../../api/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ATTR_OPTIONS: { key: keyof Attributes; label: string }[] = [
  { key: 'str', label: 'Strength (STR)' },
  { key: 'dex', label: 'Dexterity (DEX)' },
  { key: 'con', label: 'Constitution (CON)' },
  { key: 'int', label: 'Intelligence (INT)' },
  { key: 'wis', label: 'Wisdom (WIS)' },
  { key: 'cha', label: 'Charisma (CHA)' },
];

const CORE_CATEGORY = 'Core Rulebook';

function categoryColor(cat: string): 'primary' | 'default' {
  return cat === CORE_CATEGORY ? 'primary' : 'default';
}

function formatModifiers(modifiers: Record<string, number>): string {
  if (!modifiers || Object.keys(modifiers).length === 0) return '+2 to one ability score of choice';
  return Object.entries(modifiers)
    .map(([attr, val]) => `${val > 0 ? '+' : ''}${val} ${attr.toUpperCase()}`)
    .join(', ');
}

function isFlexBonus(r: RaceData): boolean {
  return !r.stat_modifiers || Object.keys(r.stat_modifiers).length === 0;
}

function matchesSearch(r: RaceData, q: string): boolean {
  const lq = q.toLowerCase();
  if (r.name.toLowerCase().includes(lq)) return true;
  if (r.summary.toLowerCase().includes(lq)) return true;
  const statMatch = lq.match(/^[+-]?(\w+)$/);
  if (statMatch) {
    const attr = statMatch[1];
    const val = r.stat_modifiers?.[attr];
    if (val !== undefined) {
      if (lq.startsWith('+') && val > 0) return true;
      if (lq.startsWith('-') && val < 0) return true;
      if (!lq.startsWith('+') && !lq.startsWith('-')) return true;
    }
  }
  if (r.racial_abilities?.some(
    (a) => a.name.toLowerCase().includes(lq) || a.summary.toLowerCase().includes(lq),
  )) return true;
  if (r.creature_types?.some((t) => t.toLowerCase().includes(lq))) return true;
  if (r.creature_subtypes?.some((t) => t.toLowerCase().includes(lq))) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Sub-component: standard racial abilities list
// ---------------------------------------------------------------------------

function RaceAbilities({ race }: { race: RaceData }) {
  if (!race.racial_abilities?.length) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        No racial ability data available.
      </Typography>
    );
  }
  return (
    <Stack spacing={0.75} sx={{ mt: 1 }}>
      {race.racial_abilities.map((a) => (
        <Box key={a.name}>
          <Typography variant="caption" fontWeight={700} color="primary.main">{a.name}</Typography>
          {a.summary && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              — {a.summary}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: alternative racial traits panel
// ---------------------------------------------------------------------------

const TRAIT_CATEGORY_LABELS: Record<string, string> = {
  featSkills: 'Skills & Feats',
  defense: 'Defense',
  magical: 'Magical',
  offense: 'Offense',
  senses: 'Senses',
  movement: 'Movement',
  other: 'Other',
  weakness: 'Weakness',
};

interface AltTraitsPanelProps {
  altTraits: RacialTraitData[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function AltTraitsPanel({ altTraits, selected, onChange }: Readonly<AltTraitsPanelProps>) {
  if (!altTraits.length) return null;

  // Group by what they replace (first replaced trait name as key, or "Other")
  const groups = new Map<string, RacialTraitData[]>();
  for (const t of altTraits) {
    const key = t.replaces[0] ?? 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const toggle = (name: string, replacesNames: string[]) => {
    const isOn = selected.includes(name);
    if (isOn) {
      // deselect
      onChange(selected.filter((n) => n !== name));
    } else {
      // select this one, deselect any others that replace the same standard traits
      const conflicting = new Set(
        altTraits
          .filter((t) => t.replaces.some((r) => replacesNames.includes(r)) && t.name !== name)
          .map((t) => t.name),
      );
      onChange([...selected.filter((n) => !conflicting.has(n)), name]);
    }
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
        <SwapHorizIcon fontSize="small" color="action" />
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Alternative Racial Traits
        </Typography>
        <Chip label={altTraits.length} size="small" sx={{ height: 16, fontSize: 10 }} />
      </Box>
      <Stack spacing={0.5}>
        {Array.from(groups.entries()).map(([replaces, traits]) => (
          <Box key={replaces}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
              Replaces <em>{replaces}</em>:
            </Typography>
            {traits.map((t) => {
              const isOn = selected.includes(t.name);
              const cat = TRAIT_CATEGORY_LABELS[t.trait_category] ?? t.trait_category;
              return (
                <Paper
                  key={t.id}
                  variant="outlined"
                  sx={{
                    px: 1.5, py: 0.75, mb: 0.5,
                    borderColor: isOn ? 'secondary.main' : undefined,
                    bgcolor: isOn ? 'rgba(255,255,255,0.04)' : undefined,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={isOn}
                        onChange={() => toggle(t.name, t.replaces)}
                        color="secondary"
                        sx={{ py: 0 }}
                      />
                    }
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="caption" fontWeight={700} color="secondary.main">
                            {t.name}
                          </Typography>
                          {cat && (
                            <Chip label={cat} size="small" variant="outlined"
                              sx={{ height: 16, fontSize: 9 }} />
                          )}
                        </Box>
                        <Tooltip title={t.description.length > 200 ? t.description : ''} placement="right" arrow>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {t.description.length > 200
                              ? `${t.description.slice(0, 200)}…`
                              : t.description}
                          </Typography>
                        </Tooltip>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', mx: 0 }}
                  />
                </Paper>
              );
            })}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RaceStep() {
  const { draft, setDraft, setRaceMods } = useCharacterStore();
  const [races, setRaces] = useState<RaceData[]>([]);
  const [altTraitsMap, setAltTraitsMap] = useState<Map<string, RacialTraitData[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchRaces()
      .then(setRaces)
      .catch(() => setRaces([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    races.forEach((r) => seen.add(r.source_category ?? 'core'));
    return ['all', ...Array.from(seen).sort()];
  }, [races]);

  const filtered = useMemo(() => races.filter((r) => {
    if (categoryFilter !== 'all' && (r.source_category ?? 'core') !== categoryFilter) return false;
    if (search.trim() && !matchesSearch(r, search.trim())) return false;
    return true;
  }), [races, categoryFilter, search]);

  const selectedRace = races.find((r) => r.name === draft.race);
  const needsBonusChoice = selectedRace ? isFlexBonus(selectedRace) : false;

  // Keep raceMods in sync with the selected race + optional flex bonus
  useEffect(() => {
    if (!selectedRace) { setRaceMods({}); return; }
    const mods: Partial<Record<keyof Attributes, number>> = {
      ...(selectedRace.stat_modifiers as Partial<Record<keyof Attributes, number>>),
    };
    if (isFlexBonus(selectedRace) && draft.humanBonusAttr) {
      mods[draft.humanBonusAttr] = 2;
    }
    setRaceMods(mods);
  }, [draft.race, draft.humanBonusAttr, selectedRace, setRaceMods]);

  // Lazy-load all racial traits per race when a card is expanded
  const loadAltTraits = (raceName: string) => {
    fetchRacialTraits(raceName)
      .then((traits) => setAltTraitsMap((m) => new Map(m).set(raceName, traits)))
      .catch(() => setAltTraitsMap((m) => new Map(m).set(raceName, [])));
  };

  const toggleExpanded = (raceName: string) => {
    setExpanded((prev) => {
      const opening = prev !== raceName;
      if (opening && !altTraitsMap.has(raceName)) {
        loadAltTraits(raceName);
      }
      return opening ? raceName : null;
    });
  };

  // Clear overrides when race changes
  const handleRaceChange = (raceName: string) => {
    setDraft({ race: raceName, humanBonusAttr: undefined, racialTraitOverrides: [] });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Choose Your Race</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your race grants ability score adjustments and racial traits. Expand any card to see racial
        features and available alternative traits. Search by name, modifier (e.g.{' '}
        <code>+cha</code>), or ability (e.g. <code>darkvision</code>).
      </Typography>

      {/* Search + category filter */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search races…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        <TextField
          select size="small" label="Source"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat === 'all' ? 'All sources' : cat}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {filtered.length === 0 && <Alert severity="info">No races match your search.</Alert>}

      <RadioGroup
        value={draft.race ?? ''}
        onChange={(e) => handleRaceChange(e.target.value)}
      >
        <Stack spacing={1}>
          {filtered.map((race) => {
            const isSelected = draft.race === race.name;
            const isExpanded = expanded === race.name;
            const cat = race.source_category ?? 'Other';
            const altTraits = altTraitsMap.get(race.name) ?? [];
            // Traits with races.length > 1 are subrace-specific (e.g. ["Aasimar","Angelkin"])
            // — exclude them until subrace selection is implemented
            const baseTraits = altTraits.filter((t) => t.races.length <= 1);
            const standardTraits = baseTraits.filter((t) => t.replaces.length === 0);
            const alternativeTraits = baseTraits.filter((t) => t.replaces.length > 0);

            return (
              <Paper
                key={race.id}
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
                    value={race.name}
                    control={<Radio size="small" />}
                    onClick={() => handleRaceChange(race.name)}
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.25 }}>
                          <Typography variant="subtitle1" fontWeight={600}>{race.name}</Typography>
                          <Chip
                            label={cat} size="small"
                            color={categoryColor(cat)} variant="outlined"
                            sx={{ height: 18, fontSize: 10 }}
                          />
                          {Object.entries(race.stat_modifiers ?? {}).map(([attr, val]) => (
                            <Chip
                              key={attr}
                              label={`${val > 0 ? '+' : ''}${val} ${attr.toUpperCase()}`}
                              size="small" color={val > 0 ? 'primary' : 'error'} variant="outlined"
                              sx={{ height: 18, fontSize: 10 }}
                            />
                          ))}
                          {isFlexBonus(race) && (
                            <Chip label="+2 (choice)" size="small" color="secondary" variant="outlined"
                              sx={{ height: 18, fontSize: 10 }} />
                          )}
                          {isSelected && (draft.racialTraitOverrides?.length ?? 0) > 0 && (
                            <Chip
                              label={`${draft.racialTraitOverrides?.length ?? 0} alt trait${(draft.racialTraitOverrides?.length ?? 0) === 1 ? '' : 's'}`}
                              size="small" color="secondary"
                              icon={<SwapHorizIcon style={{ fontSize: 11 }} />}
                              sx={{ height: 18, fontSize: 10 }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">{race.summary}</Typography>
                      </Box>
                    }
                    sx={{ flex: 1, mx: 0, alignItems: 'flex-start' }}
                  />
                  <Tooltip title={isExpanded ? 'Collapse racial features' : 'Show racial features'}>
                    <IconButton size="small" onClick={() => toggleExpanded(race.name)} sx={{ mt: 0.25 }}>
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>

                <Collapse in={isExpanded}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}>
                    RACIAL FEATURES
                  </Typography>
                  {standardTraits.length > 0 ? (
                    <Stack spacing={0.75} sx={{ mt: 1 }}>
                      {standardTraits.map((t) => (
                        <Box key={t.id}>
                          <Typography variant="caption" fontWeight={700} color="primary.main">{t.name}</Typography>
                          {t.description && (
                            <Tooltip title={t.description.length > 180 ? t.description : ''} placement="right" arrow>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                — {t.description.length > 180 ? `${t.description.slice(0, 180)}…` : t.description}
                              </Typography>
                            </Tooltip>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <RaceAbilities race={race} />
                  )}
                  {isSelected && (
                    <AltTraitsPanel
                      altTraits={alternativeTraits}
                      selected={draft.racialTraitOverrides ?? []}
                      onChange={(v) => setDraft({ racialTraitOverrides: v })}
                    />
                  )}
                  {!isSelected && alternativeTraits.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      <SwapHorizIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.3 }} />
                      {alternativeTraits.length} alternative trait{alternativeTraits.length > 1 ? 's' : ''} available — select this race to customize.
                    </Typography>
                  )}
                </Collapse>
              </Paper>
            );
          })}
        </Stack>
      </RadioGroup>

      {/* Flex bonus selector */}
      {selectedRace && needsBonusChoice && (
        <Paper sx={{ mt: 3, p: 2, bgcolor: 'rgba(201,168,76,0.05)', borderColor: 'primary.main' }} variant="outlined">
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {selectedRace.name} — free ability score bonus
          </Typography>
          {!draft.humanBonusAttr && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Choose which ability score receives the free <strong>+2</strong> racial bonus.
            </Alert>
          )}
          <TextField
            select fullWidth size="small"
            label="Choose your +2 ability score bonus"
            value={draft.humanBonusAttr ?? ''}
            onChange={(e) => setDraft({ humanBonusAttr: e.target.value as keyof Attributes })}
            error={!draft.humanBonusAttr}
          >
            <MenuItem value=""><em>Select an ability score…</em></MenuItem>
            {ATTR_OPTIONS.map(({ key, label }) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </TextField>
        </Paper>
      )}
    </Box>
  );
}
