import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Stack,
  Chip,
  Tooltip,
  IconButton,
  TextField,
  FormControlLabel,
  Checkbox,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';
import { useCharacterStore, type Attributes } from '../../../store/characterStore';

interface SkillDef {
  name: string;
  ability: keyof Attributes;
  trainedOnly: boolean;
}

const SKILLS: SkillDef[] = [
  { name: 'Acrobatics',          ability: 'dex', trainedOnly: false },
  { name: 'Appraise',            ability: 'int', trainedOnly: false },
  { name: 'Bluff',               ability: 'cha', trainedOnly: false },
  { name: 'Climb',               ability: 'str', trainedOnly: false },
  { name: 'Diplomacy',           ability: 'cha', trainedOnly: false },
  { name: 'Disable Device',      ability: 'dex', trainedOnly: true  },
  { name: 'Disguise',            ability: 'cha', trainedOnly: false },
  { name: 'Escape Artist',       ability: 'dex', trainedOnly: false },
  { name: 'Fly',                 ability: 'dex', trainedOnly: false },
  { name: 'Handle Animal',       ability: 'cha', trainedOnly: true  },
  { name: 'Heal',                ability: 'wis', trainedOnly: false },
  { name: 'Intimidate',          ability: 'cha', trainedOnly: false },
  { name: 'Kn. Arcana',          ability: 'int', trainedOnly: true  },
  { name: 'Kn. Dungeoneering',   ability: 'int', trainedOnly: true  },
  { name: 'Kn. Engineering',     ability: 'int', trainedOnly: true  },
  { name: 'Kn. Geography',       ability: 'int', trainedOnly: true  },
  { name: 'Kn. History',         ability: 'int', trainedOnly: true  },
  { name: 'Kn. Local',           ability: 'int', trainedOnly: true  },
  { name: 'Kn. Nature',          ability: 'int', trainedOnly: true  },
  { name: 'Kn. Nobility',        ability: 'int', trainedOnly: true  },
  { name: 'Kn. Planes',          ability: 'int', trainedOnly: true  },
  { name: 'Kn. Religion',        ability: 'int', trainedOnly: true  },
  { name: 'Linguistics',         ability: 'int', trainedOnly: true  },
  { name: 'Perception',          ability: 'wis', trainedOnly: false },
  { name: 'Perform',             ability: 'cha', trainedOnly: false },
  { name: 'Ride',                ability: 'dex', trainedOnly: false },
  { name: 'Sense Motive',        ability: 'wis', trainedOnly: false },
  { name: 'Sleight of Hand',     ability: 'dex', trainedOnly: true  },
  { name: 'Spellcraft',          ability: 'int', trainedOnly: true  },
  { name: 'Stealth',             ability: 'dex', trainedOnly: false },
  { name: 'Survival',            ability: 'wis', trainedOnly: false },
  { name: 'Swim',                ability: 'str', trainedOnly: false },
  { name: 'Use Magic Device',    ability: 'cha', trainedOnly: true  },
];

const CLASS_RANKS: Record<string, number> = {
  Barbarian: 4, Bard: 6, Cleric: 2, Druid: 4,
  Fighter: 2, Monk: 4, Paladin: 2, Ranger: 6,
  Rogue: 8, Sorcerer: 2, Wizard: 2,
};

/** Class skills per class — which skills get the +3 trained bonus */
const CLASS_SKILLS: Record<string, string[]> = {
  Barbarian: ['Acrobatics','Climb','Craft','Handle Animal','Intimidate','Kn. Nature','Perception','Ride','Survival','Swim'],
  Bard:      ['Acrobatics','Appraise','Bluff','Climb','Craft','Diplomacy','Disguise','Escape Artist','Intimidate','Kn. Arcana','Kn. Dungeoneering','Kn. Engineering','Kn. Geography','Kn. History','Kn. Local','Kn. Nature','Kn. Nobility','Kn. Planes','Kn. Religion','Linguistics','Perception','Perform','Sense Motive','Sleight of Hand','Spellcraft','Stealth','Use Magic Device'],
  Cleric:    ['Craft','Diplomacy','Heal','Kn. Arcana','Kn. History','Kn. Nobility','Kn. Planes','Kn. Religion','Linguistics','Profession','Sense Motive','Spellcraft'],
  Druid:     ['Climb','Craft','Fly','Handle Animal','Heal','Kn. Geography','Kn. Nature','Perception','Profession','Ride','Spellcraft','Survival','Swim'],
  Fighter:   ['Climb','Craft','Handle Animal','Intimidate','Kn. Dungeoneering','Kn. Engineering','Profession','Ride','Survival','Swim'],
  Monk:      ['Acrobatics','Climb','Craft','Escape Artist','Intimidate','Kn. History','Kn. Religion','Linguistics','Perception','Perform','Profession','Ride','Sense Motive','Stealth','Swim'],
  Paladin:   ['Craft','Diplomacy','Handle Animal','Heal','Kn. Nobility','Kn. Religion','Profession','Ride','Sense Motive','Spellcraft'],
  Ranger:    ['Climb','Craft','Handle Animal','Heal','Intimidate','Kn. Dungeoneering','Kn. Geography','Kn. Nature','Perception','Profession','Ride','Spellcraft','Stealth','Survival','Swim'],
  Rogue:     ['Acrobatics','Appraise','Bluff','Climb','Craft','Diplomacy','Disable Device','Disguise','Escape Artist','Intimidate','Kn. Dungeoneering','Kn. Local','Linguistics','Perception','Perform','Profession','Sense Motive','Sleight of Hand','Stealth','Swim','Use Magic Device'],
  Sorcerer:  ['Appraise','Bluff','Craft','Fly','Intimidate','Kn. Arcana','Profession','Spellcraft','Use Magic Device'],
  Wizard:    ['Appraise','Craft','Fly','Kn. Arcana','Kn. Dungeoneering','Kn. Engineering','Kn. Geography','Kn. History','Kn. Local','Kn. Nature','Kn. Nobility','Kn. Planes','Kn. Religion','Linguistics','Profession','Spellcraft'],
};

function mod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** PF1e success probability: P(d20 + bonus ≥ dc) clamped to [0, 100] */
function successPct(bonus: number, dc: number): number {
  return Math.min(100, Math.max(0, Math.round(((21 + bonus - dc) / 20) * 100)));
}

const DC_TIERS = [
  { label: 'Easy',   dc: 10 },
  { label: 'Avg',    dc: 15 },
  { label: 'Hard',   dc: 20 },
  { label: 'V.Hard', dc: 25 },
] as const;

function dcColour(pct: number): string {
  if (pct >= 75) return '#4caf50';
  if (pct >= 50) return '#c9a84c';
  if (pct >= 25) return '#ff7043';
  return '#616161';
}

function totalRanks(cls?: string, intScore?: number): number {
  const base = CLASS_RANKS[cls ?? ''] ?? 2;
  const intMod = mod(intScore ?? 10);
  return Math.max(1, base + intMod);
}

export function SkillsStep() {
  const { draft, setDraft } = useCharacterStore();
  const [search, setSearch] = useState('');
  const [classOnly, setClassOnly] = useState(false);

  const available = totalRanks(draft.class, draft.attributes.int);
  const spent = Object.values(draft.skills).reduce((a, b) => a + b, 0);
  const remaining = available - spent;
  const classSkills = CLASS_SKILLS[draft.class ?? ''] ?? [];

  const visibleSkills = SKILLS.filter((s) => {
    if (classOnly && !classSkills.includes(s.name)) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const setRank = (skill: string, delta: number) => {
    const current = draft.skills[skill] ?? 0;
    const next = current + delta;
    if (next < 0 || next > draft.level) return;
    if (delta > 0 && remaining <= 0) return;
    const updated = { ...draft.skills, [skill]: next };
    if (next === 0) delete updated[skill];
    setDraft({ skills: updated });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Allocate Skill Ranks</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        At level 1 you have <strong>{available} skill rank{available !== 1 ? 's' : ''}</strong> to spend
        ({CLASS_RANKS[draft.class ?? ''] ?? 2} base + INT modifier).
        Maximum 1 rank per skill at level 1. Class skills gain a <strong>+3 bonus</strong> once trained.
      </Typography>

      {/* Budget bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Ranks spent</Typography>
          <Typography variant="caption" fontWeight={700} color={remaining === 0 ? 'success.main' : 'primary.main'}>
            {spent} / {available} ({remaining} remaining)
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={(spent / available) * 100}
          color={remaining === 0 ? 'success' : 'primary'} sx={{ height: 6, borderRadius: 3 }} />
      </Paper>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search skills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 160 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={classOnly}
              onChange={(e) => setClassOnly(e.target.checked)}
              color="primary"
            />
          }
          label={<Typography variant="body2">Class skills only</Typography>}
        />
      </Box>

      <Stack spacing={1}>
        {visibleSkills.map((skill) => {
          const rank = draft.skills[skill.name] ?? 0;
          const isClassSkill = classSkills.includes(skill.name);
          const abilityMod = mod(draft.attributes[skill.ability]);
          const totalBonus = abilityMod + rank + (isClassSkill && rank > 0 ? 3 : 0);
          const canInc = rank < draft.level && remaining > 0;
          const canDec = rank > 0;

          return (
            <Paper key={skill.name} variant="outlined" sx={{ px: 2, py: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Bonus badge */}
                <Box sx={{
                  minWidth: 36, textAlign: 'center',
                  bgcolor: 'background.default', borderRadius: 1,
                  py: 0.5, border: '1px solid', borderColor: 'divider',
                  flexShrink: 0,
                }}>
                  <Typography variant="caption" fontWeight={700}
                    color={rank > 0 ? 'primary.main' : 'text.secondary'}>
                    {totalBonus >= 0 ? `+${totalBonus}` : totalBonus}
                  </Typography>
                </Box>

                {/* Name + tags + DC chances */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight={rank > 0 ? 700 : 400}>
                      {skill.name}
                    </Typography>
                    <Chip label={skill.ability.toUpperCase()} size="small" variant="outlined"
                      sx={{ fontSize: 10, height: 18 }} />
                    {isClassSkill && (
                      <Chip label="CS" size="small" color="primary" variant="outlined"
                        sx={{ fontSize: 10, height: 18 }} />
                    )}
                    {skill.trainedOnly && (
                      <Chip label="trained" size="small" variant="outlined"
                        sx={{ fontSize: 10, height: 18 }} />
                    )}
                  </Box>

                  {/* DC success chances */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    {DC_TIERS.map(({ label: dcLabel, dc }) => {
                      const pct = successPct(totalBonus, dc);
                      return (
                        <Tooltip key={dc} title={`DC ${dc} (${dcLabel}): ${pct}% chance of success`}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography variant="caption" color="text.secondary"
                              sx={{ fontSize: 9, lineHeight: 1 }}>
                              DC{dc}
                            </Typography>
                            <Typography variant="caption"
                              sx={{ fontSize: 10, fontWeight: 700, color: dcColour(pct), lineHeight: 1 }}>
                              {pct}%
                            </Typography>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>

                {/* Rank counter */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title="Remove rank">
                    <span>
                      <IconButton size="small" onClick={() => setRank(skill.name, -1)} disabled={!canDec}>
                        <RemoveIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Typography variant="body2" sx={{ minWidth: 16, textAlign: 'center' }}>
                    {rank}
                  </Typography>
                  <Tooltip title="Add rank">
                    <span>
                      <IconButton size="small" onClick={() => setRank(skill.name, 1)} disabled={!canInc}>
                        <AddIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          );
        })}

        {visibleSkills.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No skills match your filter.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
