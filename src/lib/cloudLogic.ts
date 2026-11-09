import type { BackupFile } from './backup';

export type CloudLink = { userId: string; pid: number };

export function backupSignature(b: BackupFile): string {
  const { exportedAt: _ignored, ...rest } = b;
  return JSON.stringify(rest);
}

export function hashString(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

export const backupHash = (b: BackupFile) => hashString(backupSignature(b));

export type CloudSync = { syncedAt: string | null; signature: string | null };

export function cloudConflict(syncedAt: string | null, cloudUpdatedAt: string | null): boolean {
  if (!syncedAt || !cloudUpdatedAt) return false;
  const local = Date.parse(syncedAt);
  const cloud = Date.parse(cloudUpdatedAt);
  if (Number.isNaN(local) || Number.isNaN(cloud)) return false;
  return cloud - local > 1000;
}

export type LinkDecision = 'upload' | 'restore' | 'choose' | 'signup';

export function decideLink({ hasLocal, hasCloud }: { hasLocal: boolean; hasCloud: boolean }): LinkDecision {
  if (hasLocal && hasCloud) return 'choose';
  if (hasLocal) return 'upload';
  if (hasCloud) return 'restore';
  return 'signup';
}

export const isLinked = (link: CloudLink | null, userId: string | null, pid: number | null) =>
  !!link && !!userId && pid !== null && link.userId === userId && link.pid === pid;

export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export const CODE_MAX = 10;

export const validCode = (s: string) => /^\d{6,10}$/.test(s.trim());
