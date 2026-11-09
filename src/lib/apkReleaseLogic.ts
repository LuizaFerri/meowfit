export const RELEASES_API = 'https://api.github.com/repos/LuizaFerri/meowfit/releases/latest';

export type ApkRelease = { version: string; url: string };

const parts = (v: string) =>
  v
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((p) => parseInt(p, 10));

export function isNewer(latest: string, current: string) {
  const a = parts(latest);
  const b = parts(current);
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

type GithubRelease = {
  tag_name?: unknown;
  html_url?: unknown;
  draft?: unknown;
  prerelease?: unknown;
  assets?: { name?: unknown; browser_download_url?: unknown }[];
};

export function readRelease(json: unknown): ApkRelease | null {
  if (!json || typeof json !== 'object') return null;
  const r = json as GithubRelease;
  if (r.draft || r.prerelease || typeof r.tag_name !== 'string') return null;
  const version = r.tag_name.trim().replace(/^v/i, '');
  if (!/^\d+(\.\d+)*$/.test(version)) return null;
  const apk = (r.assets ?? []).find((a) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk'));
  const url =
    typeof apk?.browser_download_url === 'string' ? apk.browser_download_url : typeof r.html_url === 'string' ? r.html_url : null;
  return url ? { version, url } : null;
}

export function updateToShow(release: ApkRelease | null, current: string | null, dismissed: string | null): ApkRelease | null {
  if (!release || !current) return null;
  if (!isNewer(release.version, current)) return null;
  if (dismissed && !isNewer(release.version, dismissed)) return null;
  return release;
}
