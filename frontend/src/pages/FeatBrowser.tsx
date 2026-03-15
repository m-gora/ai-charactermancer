import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ForceGraph2D from 'react-force-graph-2d';
import { fetchFeats } from '../api/client';
import type { FeatData } from '../api/client';

// ─── Colour palette per feat sub-type ───────────────────────────────────────

const SUB_TYPE_COLORS: Record<string, string> = {
  Combat: '#e57373',
  General: '#c9a84c',
  Teamwork: '#64b5f6',
  'Item Creation': '#81c784',
  Metamagic: '#ba68c8',
};
const DEFAULT_NODE_COLOR = '#9e8c78';

function nodeBaseColor(subType: string): string {
  return SUB_TYPE_COLORS[subType] ?? DEFAULT_NODE_COLOR;
}

// ─── Graph node/link types ───────────────────────────────────────────────────

/** Our custom data attached to each graph node. */
interface FeatNodeData {
  name: string;
  feat: FeatData;
}

/**
 * Shape of the node objects passed to react-force-graph callbacks.
 * d3-force adds x/y at runtime; we also carry our own fields.
 */
interface FeatNode extends FeatNodeData {
  id?: string | number;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

interface GraphData {
  nodes: FeatNode[];
  links: Array<{ source: string; target: string }>;
}

function buildGraph(feats: FeatData[]): GraphData {
  const nameToId = new Map(feats.map((f) => [f.name, f.id]));
  const nodes: FeatNode[] = feats.map((f) => ({ id: f.id, name: f.name, feat: f }));
  const links: Array<{ source: string; target: string }> = [];
  for (const feat of feats) {
    for (const prereqName of feat.prerequisite_names ?? []) {
      const prereqId = nameToId.get(prereqName);
      if (prereqId) links.push({ source: feat.id, target: prereqId });
    }
  }
  return { nodes, links };
}

// ─── Main component ──────────────────────────────────────────────────────────

export function FeatBrowser() {
  const [feats, setFeats] = useState<FeatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });
  // Autocomplete input text (drives the search box display)
  const [searchInput, setSearchInput] = useState('');
  // Debounced version of searchInput — drives node highlighting
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Active sub-type filter chips
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<FeatData | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  // ── Data loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchFeats()
      .then((data) => {
        setFeats(data);
        setGraph(buildGraph(data));
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Container resize observer ───────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setDimensions({ width: Math.max(rect.width, 100), height: Math.max(rect.height, 100) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Debounce search input → debouncedSearch (300 ms) ───────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.toLowerCase().trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Compute highlighted node IDs (null = all active) ────────────────────────
  const matchingIds = useMemo(() => {
    const hasFilter = activeFilters.size > 0;
    const hasSearch = !!debouncedSearch;
    if (!hasFilter && !hasSearch) return null;
    return new Set<string>(
      feats
        .filter((f) => {
          const matchesFilter = !hasFilter || activeFilters.has(f.sub_type);
          const matchesSearch = !hasSearch || f.name.toLowerCase().includes(debouncedSearch);
          return matchesFilter && matchesSearch;
        })
        .map((f) => f.id),
    );
  }, [feats, activeFilters, debouncedSearch]);

  // ── Pan helpers ─────────────────────────────────────────────────────────────
  const panToNode = useCallback(
    (featId: string) => {
      if (!graphRef.current) return;
      const node = graph.nodes.find((n) => n.id === featId);
      if (node?.x != null && node?.y != null) {
        graphRef.current.centerAt(node.x, node.y, 600);
        graphRef.current.zoom(6, 600);
      }
    },
    [graph.nodes],
  );

  // Pan to first text match when debounced search changes
  useEffect(() => {
    if (!debouncedSearch || !engineReady) return;
    const first = feats.find((f) => f.name.toLowerCase().includes(debouncedSearch));
    if (first) panToNode(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, engineReady]);

  // ── Sub-type filter toggle ──────────────────────────────────────────────────
  const toggleFilter = (subType: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(subType)) next.delete(subType);
      else next.add(subType);
      return next;
    });
  };

  // ── Autocomplete options (respects active filters) ──────────────────────────
  const autocompleteOptions = useMemo(
    () =>
      feats
        .filter((f) => activeFilters.size === 0 || activeFilters.has(f.sub_type))
        .map((f) => f.name),
    [feats, activeFilters],
  );

  // ── Node rendering callbacks ────────────────────────────────────────────────
  const nodeColor = useCallback(
    (node: FeatNode) => {
      if (!matchingIds) return nodeBaseColor(node.feat?.sub_type ?? '');
      return matchingIds.has(node.id as string) ? nodeBaseColor(node.feat?.sub_type ?? '') : '#16192a';
    },
    [matchingIds],
  );

  const nodeVal = useCallback(
    (node: FeatNode) => {
      if (!matchingIds) return 2;
      return matchingIds.has(node.id as string) ? 5 : 0.5;
    },
    [matchingIds],
  );

  const nodeCanvasObject = useCallback(
    (node: FeatNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (globalScale < 2.5) return;
      if (matchingIds && !matchingIds.has(node.id as string)) return;
      const label = node.name ?? '';
      const fontSize = 10 / globalScale;
      ctx.font = `${fontSize}px "Palatino Linotype", Georgia, serif`;
      ctx.fillStyle = '#e8d5b7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + 6 / globalScale);
    },
    [matchingIds],
  );

  const handleNodeClick = useCallback((node: FeatNode) => {
    setSelected(node.feat ?? null);
  }, []);

  // ── Detail panel helpers ────────────────────────────────────────────────────
  const leadsTo = selected
    ? feats.filter((f) => (f.prerequisite_names ?? []).includes(selected.name))
    : [];

  const statsLabel = matchingIds
    ? `${matchingIds.size} / ${feats.length} feats`
    : `${feats.length} feats · ${graph.links.length} links`;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* ── Graph canvas with floating controls ── */}
      <Box ref={containerRef} sx={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 2 }}>
            <CircularProgress color="primary" />
            <Typography color="text.secondary">Loading feats…</Typography>
          </Box>
        ) : (
          <>
            <ForceGraph2D<FeatNodeData>
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graph}
              nodeId="id"
              nodeLabel="name"
              nodeColor={nodeColor}
              nodeVal={nodeVal}
              nodeCanvasObjectMode={() => 'after'}
              nodeCanvasObject={nodeCanvasObject}
              linkColor={() => 'rgba(201,168,76,0.10)'}
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={1}
              onNodeClick={handleNodeClick}
              backgroundColor="#0f1117"
              onEngineStop={() => setEngineReady(true)}
              cooldownTicks={200}
            />

            {/* ── Floating control overlay ── */}
            <Paper
              elevation={6}
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                p: 2,
                width: 300,
                bgcolor: 'rgba(26, 31, 46, 0.88)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(201,168,76,0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                pointerEvents: 'auto',
              }}
            >
              <Typography variant="h6" sx={{ lineHeight: 1 }}>Feat Browser</Typography>

              <Autocomplete
                freeSolo
                size="small"
                options={autocompleteOptions}
                inputValue={searchInput}
                onInputChange={(_, value) => setSearchInput(value)}
                onChange={(_, value) => {
                  if (!value || typeof value !== 'string') return;
                  const feat = feats.find((f) => f.name === value);
                  if (!feat) return;
                  panToNode(feat.id);
                  setSelected(feat);
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search feats…" size="small" />
                )}
              />

              {/* Sub-type filter chips */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(SUB_TYPE_COLORS).map(([type, color]) => {
                  const active = activeFilters.has(type);
                  return (
                    <Chip
                      key={type}
                      label={type}
                      size="small"
                      onClick={() => toggleFilter(type)}
                      sx={{
                        bgcolor: active ? color + '44' : color + '11',
                        color: active ? '#fff' : color,
                        border: `1px solid ${active ? color : color + '55'}`,
                        fontSize: '0.72rem',
                        fontWeight: active ? 700 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    />
                  );
                })}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {statsLabel}
              </Typography>
            </Paper>
          </>
        )}
      </Box>

      {/* ── Detail side panel ── */}
      {selected && (
        <Paper
          elevation={4}
          sx={{
            width: 320,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid',
            borderColor: 'divider',
            borderRadius: 0,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Header */}
          <Box
            sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ lineHeight: 1.3 }}>{selected.name}</Typography>
              <Chip
                label={selected.sub_type || 'General'}
                size="small"
                sx={{
                  mt: 0.75,
                  bgcolor: nodeBaseColor(selected.sub_type) + '22',
                  color: nodeBaseColor(selected.sub_type),
                }}
              />
            </Box>
            <IconButton size="small" onClick={() => setSelected(null)} sx={{ flexShrink: 0, mt: -0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Divider />

          {/* Scrollable body */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {(selected.prerequisite_names ?? []).length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary" display="block">Prerequisites</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {selected.prerequisite_names.map((p) => (
                    <Chip
                      key={p}
                      label={p}
                      size="small"
                      variant="outlined"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        const f = feats.find((feat) => feat.name === p);
                        if (f) setSelected(f);
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {selected.prerequisite_text && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary" display="block">Prerequisite details</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {selected.prerequisite_text}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="overline" color="text.secondary" display="block">Description</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {selected.description || selected.summary || '—'}
              </Typography>
            </Box>

            {leadsTo.length > 0 && (
              <>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="overline" color="text.secondary" display="block">
                  Unlocks ({leadsTo.length})
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {leadsTo.map((f) => (
                    <Chip
                      key={f.id}
                      label={f.name}
                      size="small"
                      variant="outlined"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelected(f)}
                    />
                  ))}
                </Stack>
              </>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
