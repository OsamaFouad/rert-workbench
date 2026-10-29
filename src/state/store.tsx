// App state: cases kept in browser localStorage only. No accounts, no server.

import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import type { ReviewCase } from '../engine';
import { buildDemoCases } from '../demo/cases';
import { duplicateCase } from '../domain/factory';

const STORAGE_KEY = 'rert-workbench:cases:v1';

type Action =
  | { type: 'upsert'; c: ReviewCase }
  | { type: 'delete'; id: string }
  | { type: 'import'; cases: ReviewCase[] }
  | { type: 'reset'; cases: ReviewCase[] };

function reducer(state: ReviewCase[], a: Action): ReviewCase[] {
  switch (a.type) {
    case 'upsert': {
      const i = state.findIndex((c) => c.id === a.c.id);
      if (i < 0) return [...state, a.c];
      const next = state.slice();
      next[i] = a.c;
      return next;
    }
    case 'delete':
      return state.filter((c) => c.id !== a.id);
    case 'import': {
      // Imported cases with an existing id replace it; others are appended.
      const ids = new Set(a.cases.map((c) => c.id));
      return [...state.filter((c) => !ids.has(c.id)), ...a.cases];
    }
    case 'reset':
      return a.cases;
  }
}

function load(): ReviewCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ReviewCase[];
    }
  } catch {
    /* storage blocked or corrupt: fall back to demo cases */
  }
  return buildDemoCases();
}

interface Store {
  cases: ReviewCase[];
  get: (id: string) => ReviewCase | undefined;
  save: (c: ReviewCase) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => ReviewCase | undefined;
  importCases: (cases: ReviewCase[]) => void;
  resetToDemo: () => void;
  persisted: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cases, dispatch] = useReducer(reducer, undefined, load);
  const [persisted, setPersisted] = useState(true);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
      setPersisted(true);
    } catch {
      setPersisted(false);
    }
  }, [cases]);

  const save = useCallback((c: ReviewCase) => dispatch({ type: 'upsert', c: { ...c, updatedAt: new Date().toISOString() } }), []);
  const store: Store = {
    cases,
    persisted,
    get: (id) => cases.find((c) => c.id === id),
    save,
    remove: (id) => dispatch({ type: 'delete', id }),
    duplicate: (id) => {
      const src = cases.find((c) => c.id === id);
      if (!src) return undefined;
      const copy = duplicateCase(src, new Date().toISOString());
      dispatch({ type: 'upsert', c: copy });
      return copy;
    },
    importCases: (cs) => dispatch({ type: 'import', cases: cs }),
    resetToDemo: () => dispatch({ type: 'reset', cases: buildDemoCases() }),
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
