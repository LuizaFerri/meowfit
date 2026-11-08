export const parseNum = (s: string): number | null => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export const fmtNum = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : String(Math.round(n * 10) / 10).replace('.', ',');

export const normalizeHeightCm = (n: number | null | undefined): number | null =>
  n === null || n === undefined || !Number.isFinite(n) || n <= 0 ? null : n < 3 ? Math.round(n * 100) : n;

export const parseHeightCm = (s: string): number | null => normalizeHeightCm(parseNum(s));

export const fmtHeightM = (cm: number) => `${(cm / 100).toFixed(2).replace('.', ',')} m`;
