/**
 * Custom A2UI catalog that replaces the default Tailwind/shadcn primitives
 * with MUI components styled to the dark-fantasy theme.
 */
import { memo, useCallback } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import {
  ComponentRenderer,
  standardCatalog,
  useDispatchAction,
  useDataBinding,
  type Catalog,
} from '@a2ui-sdk/react/0.8';
import type { ChildrenDefinition, Action, ValueSource } from '@a2ui-sdk/types/0.8';

// A2UIComponentProps is not re-exported from the main index; define it locally
type A2UIComponentProps<T = unknown> = T & { surfaceId: string; componentId: string; weight?: number };

// ---------------------------------------------------------------------------
// Card — themed paper panel per recommendation
// ---------------------------------------------------------------------------
const MuiCard = memo(function MuiCard({
  surfaceId,
  child,
}: A2UIComponentProps<{ child?: string }>) {
  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1,
        p: 1.5,
        borderColor: 'rgba(201,168,76,0.25)',
        bgcolor: 'rgba(201,168,76,0.04)',
        '&:last-child': { mb: 0 },
      }}
    >
      {child && <ComponentRenderer surfaceId={surfaceId} componentId={child} />}
    </Paper>
  );
});

// ---------------------------------------------------------------------------
// Column — vertical flex, no Tailwind
// ---------------------------------------------------------------------------
const MuiColumn = memo(function MuiColumn({
  surfaceId,
  children,
}: A2UIComponentProps<{ children?: ChildrenDefinition }>) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {children?.explicitList?.map((id) => (
        <ComponentRenderer key={id} surfaceId={surfaceId} componentId={id} />
      ))}
    </Box>
  );
});

// ---------------------------------------------------------------------------
// Row — horizontal flex, wraps on small widths
// ---------------------------------------------------------------------------
const MuiRow = memo(function MuiRow({
  surfaceId,
  children,
}: A2UIComponentProps<{ children?: ChildrenDefinition }>) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
      {children?.explicitList?.map((id) => (
        <ComponentRenderer key={id} surfaceId={surfaceId} componentId={id} />
      ))}
    </Box>
  );
});

// ---------------------------------------------------------------------------
// Text — MUI Typography with usageHint → variant mapping
// ---------------------------------------------------------------------------
const HINT_VARIANT = {
  h1: 'subtitle1', h2: 'subtitle1', h3: 'subtitle2',
  h4: 'subtitle2', h5: 'subtitle2',
  body: 'body2', body2: 'body2', caption: 'caption',
} as const;

const MuiText = memo(function MuiText({
  surfaceId,
  text,
  usageHint = 'body',
}: A2UIComponentProps<{ text?: ValueSource; usageHint?: string }>) {
  const content = useDataBinding(surfaceId, text, '');
  const variant = HINT_VARIANT[usageHint as keyof typeof HINT_VARIANT] ?? 'body2';
  const isCaption = usageHint === 'caption';
  const isHeading = usageHint === 'h3' || usageHint === 'h4';

  return (
    <Typography
      variant={variant}
      color={isCaption ? 'text.secondary' : isHeading ? 'primary.light' : 'text.primary'}
      sx={isHeading ? { fontWeight: 600, mb: 0.25 } : undefined}
    >
      {content as string}
    </Typography>
  );
});

// ---------------------------------------------------------------------------
// Button — MUI outlined button using the A2UI action dispatcher
// ---------------------------------------------------------------------------
const MuiButton = memo(function MuiButton({
  surfaceId,
  componentId,
  child,
  action,
  primary = false,
}: A2UIComponentProps<{ child?: string; action?: Action; primary?: boolean }>) {
  const dispatch = useDispatchAction();
  const handleClick = useCallback(() => {
    action && dispatch(surfaceId, componentId, action);
  }, [dispatch, surfaceId, componentId, action]);

  // Detect "✓ Already on sheet" label via child text — rendered as disabled
  const isOwned = !action;

  if (isOwned) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main', mt: 0.5 }}>
        <CheckIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" color="success.main">Already on sheet</Typography>
      </Box>
    );
  }

  return (
    <Button
      variant={primary ? 'contained' : 'outlined'}
      color="primary"
      size="small"
      startIcon={<AddIcon />}
      onClick={handleClick}
      sx={{
        mt: 0.5,
        textTransform: 'none',
        fontFamily: 'inherit',
        fontSize: '0.75rem',
        py: 0.25,
        px: 1,
      }}
    >
      {child
        ? <ComponentRenderer surfaceId={surfaceId} componentId={child} />
        : 'Add to sheet'}
    </Button>
  );
});

// ---------------------------------------------------------------------------
// Exported catalog — spread standard catalog and override visual components
// ---------------------------------------------------------------------------
export const themedCatalog: Catalog = {
  components: {
    ...standardCatalog.components,
    Card: MuiCard,
    Column: MuiColumn,
    Row: MuiRow,
    Text: MuiText,
    Button: MuiButton,
  },
};
