import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface Selection {
  projectId: string | null;
  siteId: string | null;
  profileId: string | null;
  climateSeriesId: string | null;
}

interface SelectionContextValue extends Selection {
  setProjectId: (id: string | null) => void;
  setSiteId: (id: string | null) => void;
  setProfileId: (id: string | null) => void;
  setClimateSeriesId: (id: string | null) => void;
}

const STORAGE_KEY = 'esoil-selection';
const SelectionContext = createContext<SelectionContextValue | null>(null);

function load(): Selection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Selection;
  } catch {
    /* ignore */
  }
  return { projectId: null, siteId: null, profileId: null, climateSeriesId: null };
}

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  }, [selection]);

  const value: SelectionContextValue = {
    ...selection,
    setProjectId: (id) => setSelection((s) => ({ ...s, projectId: id, siteId: null, profileId: null, climateSeriesId: null })),
    setSiteId: (id) => setSelection((s) => ({ ...s, siteId: id, profileId: null, climateSeriesId: null })),
    setProfileId: (id) => setSelection((s) => ({ ...s, profileId: id })),
    setClimateSeriesId: (id) => setSelection((s) => ({ ...s, climateSeriesId: id })),
  };

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection doit être utilisé à l\'intérieur de SelectionProvider');
  return ctx;
}
