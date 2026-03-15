import type { CharacterDraft } from '../../store/characterStore';

/** Metadata describing one wizard step. */
export interface StepMeta {
  /** Display label shown in the MUI Stepper. */
  label: string;
  /** URL-safe path segment — also used as the `step` context key sent to the AI sidekick. */
  path: string;
  /** Rule‐graph subgraph identifier injected into the sidekick chat context. */
  graphSubgraph: string;
  /** Optional client-side validation run before advancing. Returns an error string or null. */
  validate?: (draft: CharacterDraft) => string | null;
}

/**
 * Ordered list of wizard steps.
 * Add, remove, or reorder entries here to change the wizard flow.
 */
export const STEPS: StepMeta[] = [
  { label: 'Basic Info',  path: 'basic-info',  graphSubgraph: '',
    validate: (d) => (d.name?.trim() ? null : 'Please enter a character name before continuing.'),
  },
  { label: 'Race',        path: 'race',        graphSubgraph: 'race',
    validate: (d) => {
      if (!d.race) return 'Please select a race before continuing.';
      const flexRaces = new Set(['Human', 'Half-Elf', 'Half-Orc']);
      if (flexRaces.has(d.race) && !d.humanBonusAttr)
        return `${d.race}s receive a free +2 to one ability score — please choose which one.`;
      return null;
    },
  },
  { label: 'Class',       path: 'class',       graphSubgraph: 'class'      },
  { label: 'Attributes',  path: 'attributes',  graphSubgraph: 'attributes' },
  { label: 'Skills',      path: 'skills',      graphSubgraph: 'skills'     },
  { label: 'Feats',       path: 'feats',       graphSubgraph: 'feats'      },
  { label: 'Traits',      path: 'traits',      graphSubgraph: 'traits'     },
  { label: 'Equipment',   path: 'equipment',   graphSubgraph: 'equipment'  },
  { label: 'Summary',     path: 'summary',     graphSubgraph: ''           },
];
