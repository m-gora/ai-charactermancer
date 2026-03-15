const API_BASE = '';

/**
 * Typed fetch helper. Attaches an Auth0 Bearer token when provided.
 * Throws on non-2xx responses with the status code in the message.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers: extraHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }

  // 204 No Content — return undefined cast to T
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

/**
 * Opens an SSE stream to `path` (POST with JSON body + Bearer token).
 * Calls `onChunk` for each text `data:` line, `onEvent` for typed events
 * (e.g. `event: actions`), `onDone` when the stream closes, and `onError`
 * on any non-abort error.
 *
 * Returns an abort function that cancels the stream.
 */
export interface ActionItem {
  type: string;        // "add_feat" | "add_trait" | "add_equipment" | "set_race" | "set_class" | "add_racial_trait"
  label: string;       // display text
  field: string;       // CharacterDraft key to update
  value: string;       // value to set (scalar) or append (array field)
  description: string; // one-sentence tooltip
}

export function apiStream(
  path: string,
  body: unknown,
  token: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  onEvent?: (eventType: string, data: string) => void,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        onError(new Error(`Stream error ${res.status}`));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });

        // Parse SSE lines.  Track the current event type; reset after blank line.
        let currentEvent = 'message';
        for (const line of text.split('\n')) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const payload = line.slice(6);
            if (payload.trimEnd() === '[DONE]') {
              onDone();
              return;
            }
            if (currentEvent !== 'message') {
              onEvent?.(currentEvent, payload);
            } else {
              try {
                onChunk(JSON.parse(payload));
              } catch {
                onChunk(payload);
              }
            }
          } else if (line.trim() === '') {
            currentEvent = 'message'; // SSE event boundary — reset type
          }
        }
      }
      onDone();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError(err as Error);
      }
    }
  })();

  return () => controller.abort();
}

// ---------------------------------------------------------------------------
// Game content (public reference data — no auth token needed)
// ---------------------------------------------------------------------------

export interface RaceData {
  id: string;
  name: string;
  summary: string;
  source_category: string;
  stat_modifiers: Record<string, number>;
  creature_types: string[];
  creature_subtypes: string[];
  racial_abilities: { name: string; summary: string; type: string }[];
}

export interface ClassData {
  id: string;
  name: string;
  summary: string;
  source_category: string;
  bab: string;
  hd: number;
  class_skills: string[];
}

export interface ClassAbilityData {
  id: string;
  name: string;
  summary: string;
  ability_type: string;
  associated_classes: string[];
}

export interface FeatData {
  id: string;
  name: string;
  summary: string;
  description: string;
  prerequisite_text: string;
  tags: string[];
  sub_type: string;
  prerequisite_names: string[];
}

export function fetchRaces(category?: string): Promise<RaceData[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<RaceData[]>(`/api/races${qs}`);
}

export function fetchClasses(category?: string): Promise<ClassData[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<ClassData[]>(`/api/classes${qs}`);
}

export function fetchFeats(subType?: string): Promise<FeatData[]> {
  const qs = subType ? `?sub_type=${encodeURIComponent(subType)}` : '';
  return apiFetch<FeatData[]>(`/api/feats${qs}`);
}

export function fetchClassAbilities(className?: string): Promise<ClassAbilityData[]> {
  const qs = className ? `?class_name=${encodeURIComponent(className)}` : '';
  return apiFetch<ClassAbilityData[]>(`/api/class-abilities${qs}`);
}

export interface TraitData {
  id: string;
  name: string;
  summary: string;
  description: string;
  trait_type: string;
  tags: string[];
}

export interface ItemData {
  id: string;
  name: string;
  description: string;
  item_type: string;
  sub_type: string;
  weapon_subtype?: string;
  price: number | null;
  weight: number | null;
}

export function fetchTraits(traitType?: string): Promise<TraitData[]> {
  const qs = traitType ? `?trait_type=${encodeURIComponent(traitType)}` : '';
  return apiFetch<TraitData[]>(`/api/traits${qs}`);
}

export interface RacialTraitData {
  id: string;
  name: string;
  summary: string;
  description: string;
  races: string[];
  trait_category: string;
  /** Names of the standard racial traits this alternative replaces (empty = standard trait). */
  replaces: string[];
  race_points: number;
}

export function fetchRacialTraits(race?: string, altOnly?: boolean): Promise<RacialTraitData[]> {
  const params = new URLSearchParams();
  if (race) params.set('race', race);
  if (altOnly) params.set('alt_only', 'true');
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch<RacialTraitData[]>(`/api/racial-traits${qs}`);
}

export function fetchItems(itemType?: string, subType?: string): Promise<ItemData[]> {
  const params = new URLSearchParams();
  if (itemType) params.set('item_type', itemType);
  if (subType) params.set('sub_type', subType);
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch<ItemData[]>(`/api/items${qs}`);
}

