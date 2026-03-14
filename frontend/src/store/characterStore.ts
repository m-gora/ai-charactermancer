import { create } from 'zustand';

export interface Attributes {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface CharacterDraft {
  id?: string;
  ownerId?: string;
  // basic info
  name?: string;
  age?: number;
  gender?: string;
  alignment?: string;
  deity?: string;
  homeland?: string;
  // build
  race?: string;
  humanBonusAttr?: keyof Attributes; // free +2 for Human / Half-Elf / Half-Orc
  class?: string;
  level: number;
  attributes: Attributes;
  feats: string[];
  traits: string[];
  skills: Record<string, number>;
  equipment: string[];
}

interface CharacterStore {
  draft: CharacterDraft;
  currentStep: number;
  dirty: boolean;
  setDraft: (updates: Partial<CharacterDraft>) => void;
  setStep: (step: number) => void;
  setDirty: (dirty: boolean) => void;
  reset: () => void;
}

const DEFAULT_ATTRS: Attributes = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

const defaultDraft: CharacterDraft = {
  level: 1,
  attributes: { ...DEFAULT_ATTRS },
  feats: [],
  traits: [],
  skills: {},
  equipment: [],
};

export const useCharacterStore = create<CharacterStore>((set) => ({
  draft: { ...defaultDraft, attributes: { ...DEFAULT_ATTRS } },
  currentStep: 0,
  dirty: false,

  setDraft: (updates) =>
    set((s) => ({
      draft: { ...s.draft, ...updates },
      dirty: true,
    })),

  setStep: (step) => set({ currentStep: step }),

  setDirty: (dirty) => set({ dirty }),

  reset: () =>
    set({
      draft: { ...defaultDraft, attributes: { ...DEFAULT_ATTRS } },
      currentStep: 0,
      dirty: false,
    }),
}));
