export const parseNum = (s: string): number | null => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export const fmtNum = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : String(Math.round(n * 10) / 10).replace('.', ',');
