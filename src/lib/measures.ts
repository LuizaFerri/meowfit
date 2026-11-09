import { parseNum } from './format';

export type MeasureInput = { weight: string; waist: string; touched: boolean };

export function measurementToSave({ weight, waist, touched }: MeasureInput): { weight: number | null; waist: number | null } | null {
  if (!touched) return null;
  const w = parseNum(weight);
  const c = parseNum(waist);
  const valid = (n: number | null) => (n !== null && n > 0 ? n : null);
  if (valid(w) === null && valid(c) === null) return null;
  return { weight: valid(w), waist: valid(c) };
}
