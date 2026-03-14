import { Box, Typography, Paper, IconButton, Tooltip, LinearProgress, Stack, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCharacterStore, type Attributes } from '../../../store/characterStore';

// PF1e 20-point buy cost table (score → point cost)
const POINT_COST: Record<number, number> = {
  7: -4, 8: -2, 9: -1, 10: 0, 11: 1, 12: 2, 13: 3, 14: 5, 15: 7, 16: 10, 17: 13, 18: 17,
};

const POINT_BUDGET = 20;
const MIN_SCORE = 7;
const MAX_SCORE = 18;

type AttrKey = keyof Attributes;

const ATTR_META: { key: AttrKey; label: string; abbr: string; description: string }[] = [
  { key: 'str', abbr: 'STR', label: 'Strength',     description: 'Melee attacks, carrying capacity, and physical tasks.' },
  { key: 'dex', abbr: 'DEX', label: 'Dexterity',    description: 'Ranged attacks, Armor Class, Reflex saves, and stealth.' },
  { key: 'con', abbr: 'CON', label: 'Constitution',  description: 'Hit points, Fortitude saves, and concentration.' },
  { key: 'int', abbr: 'INT', label: 'Intelligence',  description: 'Skill ranks per level, knowledge checks, and arcane spellcasting.' },
  { key: 'wis', abbr: 'WIS', label: 'Wisdom',        description: 'Will saves, Perception, and divine spellcasting.' },
  { key: 'cha', abbr: 'CHA', label: 'Charisma',      description: 'Social skills, Bard/Sorcerer spellcasting, and channelling energy.' },
];

function modifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function calcPointsSpent(attrs: Attributes): number {
  return (Object.values(attrs) as number[]).reduce(
    (sum, score) => sum + (POINT_COST[score] ?? 0),
    0,
  );
}

function getBudgetColour(rem: number): string {
  if (rem < 0) return 'error.main';
  if (rem === 0) return 'success.main';
  return 'primary.main';
}

export function AttributesStep() {
  // raceMods is set by RaceStep whenever the race or flex bonus changes
  const { draft, setDraft, raceMods } = useCharacterStore();
  const attrs = draft.attributes;
  const spent = calcPointsSpent(attrs);
  const remaining = POINT_BUDGET - spent;

  const racialMod: Partial<Record<AttrKey, number>> = raceMods;

  const adjustScore = (key: AttrKey, delta: number) => {
    const current = attrs[key];
    const next = current + delta;
    if (next < MIN_SCORE || next > MAX_SCORE) return;
    const newCost = (POINT_COST[next] ?? 0) - (POINT_COST[current] ?? 0);
    if (delta > 0 && remaining < newCost) return;
    setDraft({ attributes: { ...attrs, [key]: next } });
  };

  const budgetColour = getBudgetColour(remaining);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Set Your Ability Scores
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Use the <strong>20-point buy</strong> method. Raising scores costs more points as they get higher.
        You can also lower scores below 10 to recover points.
      </Typography>

      {/* Points remaining indicator */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Points spent</Typography>
            <Typography variant="caption" sx={{ color: budgetColour, fontWeight: 700 }}>
              {spent} / {POINT_BUDGET} &nbsp;({Math.max(remaining, 0)} remaining)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min((spent / POINT_BUDGET) * 100, 100)}
            color={remaining < 0 ? 'error' : 'primary'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      </Paper>

      <Stack spacing={2}>
        {ATTR_META.map(({ key, abbr, label, description }) => {
          const score = attrs[key];
          const racial = racialMod[key] ?? 0;
          const finalScore = score + racial;
          const mod = modifier(score);
          const finalMod = modifier(finalScore);
          const canInc = score < MAX_SCORE && remaining >= ((POINT_COST[score + 1] ?? 0) - (POINT_COST[score] ?? 0));
          const canDec = score > MIN_SCORE;

          return (
            <Paper key={key} variant="outlined" sx={{ px: 2, py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Score block */}
                <Box
                  sx={{
                    minWidth: 72, textAlign: 'center',
                    bgcolor: 'background.default', borderRadius: 1, p: 1,
                    border: '1px solid', borderColor: racial !== 0 ? 'primary.main' : 'divider',
                  }}
                >
                  {racial !== 0 ? (
                    <>
                      <Typography variant="caption" color="text.secondary" lineHeight={1} display="block">
                        {score} {racial > 0 ? `+${racial}` : racial}
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="primary.main" lineHeight={1.1}>
                        {finalScore}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {finalMod}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="h5" fontWeight={700} color="primary.main" lineHeight={1}>
                        {score}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {mod}
                      </Typography>
                    </>
                  )}
                </Box>

                {/* Label */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {abbr} — {label}
                    </Typography>
                    {racial !== 0 && (
                      <Chip
                        label={`${racial > 0 ? '+' : ''}${racial} racial`}
                        size="small"
                        color={racial > 0 ? 'primary' : 'error'}
                        variant="outlined"
                        sx={{ height: 20, fontSize: 10 }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {description}
                  </Typography>
                </Box>

                {/* Controls */}
                <Box>
                  <Tooltip title="Decrease">
                    <span>
                      <IconButton size="small" onClick={() => adjustScore(key, -1)} disabled={!canDec}>
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Increase">
                    <span>
                      <IconButton size="small" onClick={() => adjustScore(key, 1)} disabled={!canInc}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
