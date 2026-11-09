import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

export const SUPABASE_URL = 'https://hauxjtqiigjllxhlwkjs.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mlvRKT80SvNfJZsnZaI_zQ_lGgYEM6F';

const memory = new Map<string, string>();

const store = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const safeStorage = {
  getItem: (key: string) => {
    try {
      return store()?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem: (key: string, value: string) => {
    memory.set(key, value);
    try {
      store()?.setItem(key, value);
    } catch {}
  },
  removeItem: (key: string) => {
    memory.delete(key);
    try {
      store()?.removeItem(key);
    } catch {}
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: safeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
