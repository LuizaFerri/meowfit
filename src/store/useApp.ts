import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { getActiveProfileId, getProfile, setActiveProfileId } from '@/db/queries';
import type { Profile } from '@/lib/types';
import type { SQLiteDatabase } from 'expo-sqlite';

type AppState = {
  loaded: boolean;
  profile: Profile | null;
  rev: number;
  bump: () => void;
  loadActive: (db: SQLiteDatabase) => Promise<void>;
  switchTo: (db: SQLiteDatabase, id: number | null) => Promise<void>;
};

export const useApp = create<AppState>((set, get) => ({
  loaded: false,
  profile: null,
  rev: 0,
  bump: () => set({ rev: get().rev + 1 }),
  loadActive: async (db) => {
    const id = await getActiveProfileId(db);
    const profile = id !== null ? await getProfile(db, id) : null;
    set({ profile, loaded: true, rev: get().rev + 1 });
  },
  switchTo: async (db, id) => {
    await setActiveProfileId(db, id);
    await get().loadActive(db);
  },
}));

export function useProfile(): Profile {
  const p = useApp((s) => s.profile);
  if (!p) throw new Error('Nenhum perfil ativo');
  return p;
}

export function useData<T>(loader: (db: SQLiteDatabase, pid: number) => Promise<T>, deps: (string | number | null | undefined)[] = []) {
  const db = useSQLiteContext();
  const pid = useApp((s) => s.profile?.id);
  const rev = useApp((s) => s.rev);
  const [state, setState] = useState<{ key: string; data: T } | null>(null);
  const latest = useRef(loader);
  const key = `${pid}|${rev}|${JSON.stringify(deps)}`;

  useEffect(() => {
    latest.current = loader;
  });

  const load = useCallback(() => {
    if (pid === undefined) return;
    let alive = true;
    latest.current(db, pid).then((data) => alive && setState({ key, data }));
    return () => {
      alive = false;
    };
  }, [db, pid, key]);

  useFocusEffect(load);
  return [state?.data ?? null, load] as const;
}

export function useWrite() {
  const db = useSQLiteContext();
  const bump = useApp((s) => s.bump);
  return useCallback(
    async (fn: (db: SQLiteDatabase) => Promise<unknown>) => {
      await fn(db);
      bump();
    },
    [db, bump],
  );
}
