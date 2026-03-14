import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useCharacterStore } from '../../../store/characterStore';
import { fetchTraits, type TraitData } from '../../../api/client';

const TRAIT_TYPE_LABEL: Record<string, string> = {
  combat: 'Combat',
  faith: 'Faith',
  magic: 'Magic',
  social: 'Social',
  regional: 'Regional',
  race: 'Race',
  religion: 'Religion',
  campaign: 'Campaign',
  faction: 'Faction',
  equipment: 'Equipment',
  cosmic: 'Cosmic',
  mount: 'Mount',
  family: 'Family',
};

const TRAIT_TYPE_COLOR: Record<
  string,
  'error' | 'warning' | 'info' | 'success' | 'default'
> = {
  combat: 'error',
  faith: 'warning',
  magic: 'info',
  social: 'success',
  regional: 'default',
  race: 'warning',
  religion: 'info',
  campaign: 'default',
  faction: 'default',
  equipment: 'default',
  cosmic: 'info',
  mount: 'default',
  family: 'success',
};

const BROWSEABLE_TYPES = [
  'combat', 'faith', 'magic', 'social', 'regional',
  'race', 'religion', 'campaign', 'faction', 'equipment',
];

export function TraitsStep() {
  const { draft, setDraft } = useCharacterStore();
  const [allTraits, setAllTraits] = useState<TraitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [useDrawback, setUseDrawback] = useState(!!draft.drawback);
  const [drawbackSearch, setDrawbackSearch] = useState('');

  useEffect(() => {
    fetchTraits()
      .then((data) => setAllTraits(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const normalTraits = useMemo(
    () => allTraits.filter((t) => t.trait_type !== 'drawback'),
    [allTraits],
  );
  const drawbackTraits = useMemo(
    () => allTraits.filter((t) => t.trait_type === 'drawback'),
    [allTraits],
  );

  const presentTypes = useMemo(() => {
    const types = new Set(normalTraits.map((t) => t.trait_type));
    return BROWSEABLE_TYPES.filter((t) => types.has(t));
  }, [normalTraits]);

  const activeType = activeTab === 0 ? null : (presentTypes[activeTab - 1] ?? null);

  const MAX_TRAITS = useDrawback && draft.drawback ? 3 : 2;

  const filteredTraits = useMemo(() => {
    const q = search.toLowerCase().trim();
    return normalTraits
      .filter((t) => {
        if (activeType && t.trait_type !== activeType) return false;
        if (q) {
          const label = TRAIT_TYPE_LABEL[t.trait_type]?.toLowerCase() ?? '';
          return (
            t.name.toLowerCase().includes(q) ||
            t.summary.toLowerCase().includes(q) ||
            label.includes(q)
          );
        }
        return true;
      })
      .slice(0, 60);
  }, [normalTraits, activeType, search]);

  const filteredDrawbacks = useMemo(() => {
    const q = drawbackSearch.toLowerCase().trim();
    return drawbackTraits
      .filter(
        (d) =>
          !q || d.name.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [drawbackTraits, drawbackSearch]);

  const handleDrawbackToggle = (checked: boolean) => {
    setUseDrawback(checked);
    if (!checked) setDraft({ drawback: undefined });
  };

  const toggle = (name: string) => {
    if (draft.traits.includes(name)) {
      setDraft({ traits: draft.traits.filter((t) => t !== name) });
      return;
    }
    if (draft.traits.length >= MAX_TRAITS) return;
    const selected = normalTraits.find((t) => t.name === name);
    if (!selected) return;
    const alreadyHasCategory = draft.traits.some(
      (t) => normalTraits.find((x) => x.name === t)?.trait_type === selected.trait_type,
    );
    if (alreadyHasCategory) return;
    setDraft({ traits: [...draft.traits, name] });
  };

  const remaining = MAX_TRAITS - draft.traits.length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Choose Your Traits
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select <strong>2 traits</strong> from <strong>different categories</strong>.
        Optionally take a <strong>drawback</strong> for a third trait slot.
      </Typography>

      {/* Drawback toggle */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={useDrawback}
              onChange={(e) => handleDrawbackToggle(e.target.checked)}
              color="warning"
            />
          }
          label={
            <Box>
              <Typography variant="subtitle2">Take a Drawback (+1 trait slot)</Typography>
              <Typography variant="caption" color="text.secondary">
                A drawback gives your character a meaningful flaw, but earns an extra trait.
              </Typography>
            </Box>
          }
        />

        {useDrawback && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
              sx={{ display: 'block', mb: 1 }}
            >
              CHOOSE A DRAWBACK ({drawbackTraits.length} available)
            </Typography>
            <TextField
              size="small"
              placeholder="Search drawbacks…"
              fullWidth
              value={drawbackSearch}
              onChange={(e) => setDrawbackSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
            <Stack spacing={0.75} sx={{ maxHeight: 260, overflowY: 'auto' }}>
              {filteredDrawbacks.map((db) => {
                const isSelected = draft.drawback === db.name;
                return (
                  <Paper
                    key={db.id}
                    variant="outlined"
                    onClick={() => setDraft({ drawback: isSelected ? undefined : db.name })}
                    sx={{
                      px: 1.5,
                      py: 1,
                      cursor: 'pointer',
                      borderColor: isSelected ? 'warning.main' : undefined,
                      bgcolor: isSelected ? 'rgba(255,152,0,0.08)' : undefined,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" fontWeight={700}>
                          {db.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {db.summary || db.description.slice(0, 120)}
                        </Typography>
                      </Box>
                      {isSelected && (
                        <Chip label="Selected" size="small" color="warning" sx={{ ml: 1 }} />
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
            {!draft.drawback && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                You must choose a drawback to unlock the extra trait slot.
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Status bar */}
      <Alert severity={remaining === 0 ? 'success' : 'info'} sx={{ mb: 2 }}>
        {(() => {
          const suffix = remaining === 1 ? '' : 's';
          return remaining === 0
            ? `All ${MAX_TRAITS} traits selected.`
            : `${remaining} trait${suffix} remaining — pick from a different category than your current choices.`;
        })()}
      </Alert>

      {draft.traits.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {draft.traits.map((name) => {
            const t = normalTraits.find((x) => x.name === name);
            return (
              <Chip
                key={name}
                label={name}
                size="small"
                color={TRAIT_TYPE_COLOR[t?.trait_type ?? ''] ?? 'default'}
                onDelete={() => toggle(name)}
              />
            );
          })}
        </Stack>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Category tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 1.5 }}
      >
        <Tab label="All" />
        {presentTypes.map((type) => (
          <Tab
            key={type}
            label={`${TRAIT_TYPE_LABEL[type] ?? type} (${normalTraits.filter((t) => t.trait_type === type).length})`}
          />
        ))}
      </Tabs>

      {/* Search */}
      <TextField
        size="small"
        placeholder="Search traits by name or description…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        fullWidth
        sx={{ mb: 1 }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Showing {filteredTraits.length} of{' '}
        {activeType
          ? normalTraits.filter((t) => t.trait_type === activeType).length
          : normalTraits.length}{' '}
        traits
        {filteredTraits.length === 60 ? ' (showing first 60 — narrow your search to see more)' : ''}
      </Typography>

      {/* Trait list */}
      <Stack spacing={0.75} sx={{ maxHeight: 480, overflowY: 'auto' }}>
        {filteredTraits.map((trait) => {
          const isSelected = draft.traits.includes(trait.name);
          const categoryTaken =
            !isSelected &&
            draft.traits.some(
              (t) =>
                normalTraits.find((x) => x.name === t)?.trait_type === trait.trait_type,
            );
          const isDisabled = !isSelected && (draft.traits.length >= MAX_TRAITS || categoryTaken);

          return (
            <Paper
              key={trait.id}
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
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {trait.name}
                    </Typography>
                    <Chip
                      label={TRAIT_TYPE_LABEL[trait.trait_type] ?? trait.trait_type}
                      size="small"
                      color={TRAIT_TYPE_COLOR[trait.trait_type] ?? 'default'}
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                    {categoryTaken && (
                      <Typography variant="caption" color="text.secondary">
                        (category taken)
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {trait.summary || trait.description.slice(0, 160)}
                  </Typography>
                </Box>
                {isSelected && (
                  <Chip
                    label="Selected"
                    size="small"
                    color="primary"
                    sx={{ ml: 1, flexShrink: 0 }}
                  />
                )}
              </Box>
            </Paper>
          );
        })}
        {filteredTraits.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: 2, textAlign: 'center' }}
          >
            No traits match your search.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
