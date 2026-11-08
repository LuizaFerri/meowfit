import { parseNum } from './format';
import { WEEKDAY_LABELS, slug } from './planText';
import type { Exercise, Meal, Plan, Targets, WorkoutDay } from './types';

let seq = 0;
export const newKey = () => `k${++seq}`;

export type ExerciseDraft = { key: string; name: string; sets: string; reps: string; load: boolean };
export type DayDraft = { key: string; label: string; weekday: number | null; title: string; exercises: ExerciseDraft[] };
export type TextDraft = { key: string; text: string };
export type WorkoutDraft = { days: DayDraft[]; habits: TextDraft[] };

export type MealDraft = { key: string; name: string; time: string; options: TextDraft[] };
export type DietDraft = {
  meals: MealDraft[];
  rules: TextDraft[];
  water: string;
  kcalMin: string;
  kcalMax: string;
  proteinMin: string;
  proteinMax: string;
};

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEK_LETTERS: Record<number, string> = { 0: 'D', 1: 'S', 2: 'T', 3: 'Q', 4: 'Q', 5: 'S', 6: 'S' };

const num = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));
const texts = (items: string[]): TextDraft[] => items.map((text) => ({ key: newKey(), text }));
const cleanTexts = (items: TextDraft[]) => items.map((t) => t.text.trim()).filter(Boolean);

export const emptyExercise = (): ExerciseDraft => ({ key: newKey(), name: '', sets: '', reps: '', load: false });

export function toExerciseDraft(e: Exercise): ExerciseDraft {
  return {
    key: newKey(),
    name: e.name,
    sets: e.sets !== undefined ? String(e.sets) : '',
    reps: e.sets !== undefined ? (e.reps ?? '') : (e.note ?? e.reps ?? ''),
    load: !!e.load,
  };
}

export function toWorkoutDraft(plan: Plan): WorkoutDraft {
  return {
    days: sortDays(
      plan.days.map((d) => ({
        key: newKey(),
        label: d.label,
        weekday: d.weekday,
        title: d.title,
        exercises: d.exercises.map(toExerciseDraft),
      })),
    ),
    habits: texts(plan.habits),
  };
}

export function sortDays(days: DayDraft[]): DayDraft[] {
  const pos = (d: DayDraft) => (d.weekday === null ? 7 : WEEK_ORDER.indexOf(d.weekday));
  return days.map((d, i) => ({ d, i })).sort((a, b) => pos(a.d) - pos(b.d) || a.i - b.i).map(({ d }) => d);
}

export function weekdayDay(weekday: number): DayDraft {
  return { key: newKey(), label: WEEKDAY_LABELS[weekday], weekday, title: '', exercises: [emptyExercise()] };
}

export function rotatingDay(days: DayDraft[]): DayDraft {
  const used = new Set(days.map((d) => d.label));
  let i = 0;
  while (used.has(`Treino ${String.fromCharCode(65 + i)}`)) i++;
  return { key: newKey(), label: `Treino ${String.fromCharCode(65 + i)}`, weekday: null, title: '', exercises: [emptyExercise()] };
}

export function fromExerciseDraft(e: ExerciseDraft, id: string): Exercise | null {
  const name = e.name.trim();
  if (!name) return null;
  const sets = parseInt(e.sets, 10);
  const reps = e.reps.trim();
  if (Number.isFinite(sets) && sets > 0) {
    return { id, name, sets, reps, load: e.load };
  }
  return reps ? { id, name, note: reps } : { id, name };
}

export function fromWorkoutDraft(draft: WorkoutDraft): Pick<Plan, 'days' | 'habits'> {
  const days: WorkoutDay[] = sortDays(draft.days)
    .map((d, di) => ({
      label: d.label,
      weekday: d.weekday,
      title: d.title.trim(),
      exercises: d.exercises
        .map((e, ei) => fromExerciseDraft(e, `${slug(e.name)}-${di}-${ei}`))
        .filter((e): e is Exercise => e !== null),
    }))
    .filter((d) => d.exercises.length > 0);
  return { days, habits: cleanTexts(draft.habits) };
}

export const emptyMeal = (): MealDraft => ({ key: newKey(), name: '', time: '', options: texts(['']) });

export function toDietDraft(plan: Plan, defaultWater = ''): DietDraft {
  const t = plan.targets;
  return {
    meals: plan.meals.map((m) => ({
      key: newKey(),
      name: m.name,
      time: m.time ?? '',
      options: texts(m.options.length > 0 ? m.options : ['']),
    })),
    rules: texts(plan.rules),
    water: t.waterL !== undefined ? num(t.waterL) : defaultWater,
    kcalMin: num(t.kcalMin),
    kcalMax: t.kcalMax !== t.kcalMin ? num(t.kcalMax) : '',
    proteinMin: num(t.proteinMin),
    proteinMax: t.proteinMax !== t.proteinMin ? num(t.proteinMax) : '',
  };
}

function range(minS: string, maxS: string): [number | undefined, number | undefined] {
  const a = parseNum(minS) ?? undefined;
  const b = parseNum(maxS) ?? undefined;
  if (a === undefined && b === undefined) return [undefined, undefined];
  const lo = Math.min(a ?? b!, b ?? a!);
  const hi = Math.max(a ?? b!, b ?? a!);
  return [lo, hi];
}

export function fromDietDraft(draft: DietDraft): Pick<Plan, 'meals' | 'rules' | 'targets'> {
  const meals: Meal[] = draft.meals
    .map((m) => {
      const name = m.name.trim();
      const time = m.time.trim();
      return { name: name ? name[0].toUpperCase() + name.slice(1) : '', ...(time ? { time } : {}), options: cleanTexts(m.options) };
    })
    .filter((m) => m.name && m.options.length > 0);
  const [kcalMin, kcalMax] = range(draft.kcalMin, draft.kcalMax);
  const [proteinMin, proteinMax] = range(draft.proteinMin, draft.proteinMax);
  const water = parseNum(draft.water);
  const targets: Targets = {};
  if (kcalMin !== undefined) Object.assign(targets, { kcalMin, kcalMax });
  if (proteinMin !== undefined) Object.assign(targets, { proteinMin, proteinMax });
  if (water !== null && water > 0) targets.waterL = water;
  return { meals, rules: cleanTexts(draft.rules), targets };
}

export function workoutWarnings(draft: WorkoutDraft): string[] {
  const out: string[] = [];
  for (const d of draft.days) {
    if (!d.exercises.some((e) => e.name.trim())) out.push(`${d.label} está sem exercícios e não será salvo.`);
  }
  return out;
}

export function dietWarnings(draft: DietDraft): string[] {
  const out: string[] = [];
  draft.meals.forEach((m, i) => {
    const hasOption = m.options.some((o) => o.text.trim());
    if (!m.name.trim() && hasOption) out.push(`A ${i + 1}ª refeição está sem nome e não será salva.`);
    else if (m.name.trim() && !hasOption) out.push(`${m.name.trim()} está sem opções e não será salva.`);
  });
  return out;
}
