import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { deleteProfile, getSetting, setSetting } from '@/db/queries';
import { makeBackup, parseJsonFile, restoreBackup, type BackupFile } from './backup';
import { backupHash, cloudConflict, isLinked, type CloudLink, type CloudSync } from './cloudLogic';
import { getSupabase } from './supabase';

const TABLE = 'cloud_backups';
const LINK_KEY = 'cloud_link';
const SYNC_KEY = 'cloud_sync';
const EMPTY_SYNC: CloudSync = { syncedAt: null, signature: null };

export type CloudStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

type CloudState = {
  ready: boolean;
  userId: string | null;
  email: string | null;
  link: CloudLink | null;
  status: CloudStatus;
  savedAt: string | null;
  conflictAt: string | null;
  error: string | null;
};

export const useCloud = create<CloudState>(() => ({
  ready: false,
  userId: null,
  email: null,
  link: null,
  status: 'idle',
  savedAt: null,
  conflictAt: null,
  error: null,
}));

let started = false;
let sync: CloudSync = EMPTY_SYNC;

async function saveSync(db: SQLiteDatabase, next: CloudSync) {
  sync = next;
  await setSetting(db, SYNC_KEY, next);
}

export async function startCloud(db: SQLiteDatabase) {
  if (started) return;
  started = true;
  const link = await getSetting<CloudLink | null>(db, LINK_KEY, null);
  sync = await getSetting<CloudSync>(db, SYNC_KEY, EMPTY_SYNC);
  useCloud.setState({ link: link && link.userId ? link : null, savedAt: sync.syncedAt, status: sync.syncedAt ? 'saved' : 'idle' });
  const { data } = await getSupabase().auth.getSession().catch(() => ({ data: { session: null } }));
  const user = data.session?.user ?? null;
  useCloud.setState({ ready: true, userId: user?.id ?? null, email: user?.email ?? null });
  getSupabase().auth.onAuthStateChange((_event, session) => {
    const u = session?.user ?? null;
    useCloud.setState({ userId: u?.id ?? null, email: u?.email ?? null });
  });
}

const fail = (e: unknown) => {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/network|fetch|Failed to fetch/i.test(msg)) return new Error('Sem conexão com a internet. Tente de novo quando estiver on-line.');
  if (/rate limit|security purposes|only request this after/i.test(msg)) return new Error('Muitos pedidos seguidos. Espere um minuto e tente de novo.');
  if (/expired|invalid/i.test(msg)) return new Error('Código inválido ou expirado. Confira ou peça um novo.');
  return new Error(msg);
};

export async function sendCode(email: string) {
  const { error } = await getSupabase().auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  if (error) throw fail(error);
}

export async function verifyCode(email: string, code: string) {
  const { data, error } = await getSupabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
  if (error) throw fail(error);
  const user = data.user ?? data.session?.user ?? null;
  if (!user) throw new Error('Não foi possível entrar. Tente de novo.');
  useCloud.setState({ userId: user.id, email: user.email ?? email });
  return user.id;
}

export async function setLink(db: SQLiteDatabase, link: CloudLink | null) {
  await setSetting(db, LINK_KEY, link ?? { userId: '', pid: 0 });
  await saveSync(db, EMPTY_SYNC);
  useCloud.setState({ link, status: 'idle', savedAt: null, conflictAt: null, error: null });
}

export async function signOut(db: SQLiteDatabase) {
  await getSupabase().auth.signOut().catch(() => {});
  await setLink(db, null);
  useCloud.setState({ userId: null, email: null });
}

export type CloudBackup = { backup: BackupFile; profileName: string; updatedAt: string };

export async function fetchCloudBackup(): Promise<CloudBackup | null> {
  const userId = useCloud.getState().userId;
  if (!userId) return null;
  const { data, error } = await getSupabase().from(TABLE).select('data, profile_name, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw fail(error);
  if (!data) return null;
  return { backup: data.data as BackupFile, profileName: data.profile_name ?? '', updatedAt: data.updated_at };
}

async function fetchCloudUpdatedAt(userId: string): Promise<string | null> {
  const { data, error } = await getSupabase().from(TABLE).select('updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw fail(error);
  return data?.updated_at ?? null;
}

export async function uploadBackup(db: SQLiteDatabase, pid: number, force = false, evenIfUnchanged = false) {
  const { userId, status } = useCloud.getState();
  if (!userId || (status === 'conflict' && !force)) return;
  const backup = await makeBackup(db, pid);
  const signature = backupHash(backup);
  if (!force && !evenIfUnchanged && signature === sync.signature) return;
  useCloud.setState({ status: 'saving', error: null });
  try {
    const row = { user_id: userId, profile_name: backup.profile.name, data: backup, updated_at: new Date().toISOString() };
    const client = getSupabase();
    let savedAt: string | null = null;
    if (force || !sync.syncedAt) {
      const { data, error } = await client.from(TABLE).upsert(row, { onConflict: 'user_id' }).select('updated_at').single();
      if (error) throw fail(error);
      savedAt = data.updated_at;
    } else {
      const { data, error } = await client.from(TABLE).update(row).eq('user_id', userId).eq('updated_at', sync.syncedAt).select('updated_at');
      if (error) throw fail(error);
      if (data.length > 0) savedAt = data[0].updated_at;
      else {
        const cloudAt = await fetchCloudUpdatedAt(userId);
        if (cloudAt) {
          useCloud.setState({ status: 'conflict', conflictAt: cloudAt });
          return;
        }
        const inserted = await client.from(TABLE).insert(row).select('updated_at').single();
        if (inserted.error) throw fail(inserted.error);
        savedAt = inserted.data.updated_at;
      }
    }
    await saveSync(db, { syncedAt: savedAt, signature });
    useCloud.setState({ status: 'saved', savedAt, conflictAt: null });
  } catch (e) {
    useCloud.setState({ status: 'error', error: (e as Error).message });
  }
}

export async function checkCloud(db: SQLiteDatabase, pid: number | null) {
  const { link, userId } = useCloud.getState();
  if (!isLinked(link, userId, pid) || !sync.syncedAt) return;
  try {
    const cloudAt = await fetchCloudUpdatedAt(userId!);
    if (cloudConflict(sync.syncedAt, cloudAt)) useCloud.setState({ status: 'conflict', conflictAt: cloudAt });
  } catch {}
}

export async function syncIfLinked(db: SQLiteDatabase, pid: number | null) {
  const { link, userId } = useCloud.getState();
  if (!isLinked(link, userId, pid)) return;
  await uploadBackup(db, pid!);
}

export async function linkAndUpload(db: SQLiteDatabase, pid: number) {
  const userId = useCloud.getState().userId;
  if (!userId) return;
  await setLink(db, { userId, pid });
  await uploadBackup(db, pid, true);
}

export async function relinkIfLinked(db: SQLiteDatabase, oldPid: number, newPid: number) {
  const { link, userId } = useCloud.getState();
  if (!isLinked(link, userId, oldPid)) return;
  await linkAndUpload(db, newPid);
}

export async function restoreFromCloud(db: SQLiteDatabase, cloud: CloudBackup, replacePid: number | null) {
  const userId = useCloud.getState().userId;
  if (!userId) throw new Error('Entre na sua conta primeiro.');
  const parsed = parseJsonFile(JSON.stringify(cloud.backup));
  if (parsed.kind !== 'backup') throw new Error('O backup da nuvem está incompleto.');
  const id = await restoreBackup(db, parsed.backup, parsed.plan);
  if (replacePid !== null) await deleteProfile(db, replacePid);
  await setLink(db, { userId, pid: id });
  await saveSync(db, { syncedAt: cloud.updatedAt, signature: backupHash(await makeBackup(db, id)) });
  useCloud.setState({ status: 'saved', savedAt: cloud.updatedAt, conflictAt: null });
  return id;
}

export async function deleteCloudBackup() {
  const userId = useCloud.getState().userId;
  if (!userId) return;
  const { error } = await getSupabase().from(TABLE).delete().eq('user_id', userId);
  if (error) throw fail(error);
}
