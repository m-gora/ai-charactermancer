import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useCharacterStore } from '../../../store/characterStore';
import { CharacterSheet } from '../../../components/character/CharacterSheet';

export function SummaryStep() {
  const { draft } = useCharacterStore();

  const handleExport = () => {
    const json = JSON.stringify(draft, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.race ?? 'character'}_${draft.class ?? 'unknown'}_lv${draft.level}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Character Summary
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your completed character. You can go back to any step to make changes.
        When you are satisfied, export the character sheet as JSON to use with your GM or import into a VTT.
      </Typography>

      <CharacterSheet draft={draft} />

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          Export as JSON
        </Button>
      </Box>
    </Box>
  );
}
