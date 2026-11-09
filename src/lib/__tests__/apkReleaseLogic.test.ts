import { isNewer, readRelease, updateToShow } from '../apkReleaseLogic';

test('compares versions number by number', () => {
  expect(isNewer('1.4.0', '1.3.1')).toBe(true);
  expect(isNewer('v1.10.0', '1.9.9')).toBe(true);
  expect(isNewer('1.4', '1.4.0')).toBe(false);
  expect(isNewer('1.3.1', '1.4.0')).toBe(false);
  expect(isNewer('1.4.0', '1.4.0')).toBe(false);
  expect(isNewer('beta', '1.0.0')).toBe(false);
});

test('reads the apk link from the latest GitHub release', () => {
  const release = {
    tag_name: 'v1.4.0',
    html_url: 'https://github.com/LuizaFerri/meowfit/releases/tag/v1.4.0',
    assets: [
      { name: 'notes.txt', browser_download_url: 'https://x/notes.txt' },
      { name: 'meowfit.apk', browser_download_url: 'https://x/meowfit.apk' },
    ],
  };
  expect(readRelease(release)).toEqual({ version: '1.4.0', url: 'https://x/meowfit.apk' });
  expect(readRelease({ ...release, assets: [] })).toEqual({
    version: '1.4.0',
    url: 'https://github.com/LuizaFerri/meowfit/releases/tag/v1.4.0',
  });
});

test('ignores drafts, prereleases and odd tags', () => {
  const base = { tag_name: 'v1.4.0', html_url: 'https://x' };
  expect(readRelease({ ...base, draft: true })).toBeNull();
  expect(readRelease({ ...base, prerelease: true })).toBeNull();
  expect(readRelease({ ...base, tag_name: 'nightly' })).toBeNull();
  expect(readRelease({ message: 'Not Found' })).toBeNull();
  expect(readRelease(null)).toBeNull();
});

test('shows the notice only for a newer apk that was not dismissed', () => {
  const r = { version: '1.4.0', url: 'https://x/meowfit.apk' };
  expect(updateToShow(r, '1.3.1', null)).toEqual(r);
  expect(updateToShow(r, '1.4.0', null)).toBeNull();
  expect(updateToShow(r, '1.3.1', '1.4.0')).toBeNull();
  expect(updateToShow({ ...r, version: '1.5.0' }, '1.3.1', '1.4.0')).toEqual({ ...r, version: '1.5.0' });
  expect(updateToShow(r, null, null)).toBeNull();
  expect(updateToShow(null, '1.3.1', null)).toBeNull();
});
