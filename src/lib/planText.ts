import { Exercise, Meal, Plan, Targets, WorkoutDay, emptyPlan } from './types';

export type ParseResult = {
  plan: Plan;
  warnings: { line: number; text: string }[];
  found: { days: boolean; habits: boolean; meals: boolean; targets: boolean; rules: boolean };
};

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

export const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function slug(s: string): string {
  return normalize(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function stripBullet(line: string): string {
  return line
    .replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, '')
    .replace(/^\s*(?:\[[ xX]?\]|[☐☑✓✔])\s*/, '')
    .trim();
}

export type Section = 'days' | 'habits' | 'meals' | 'targets' | 'rules';
export type Part = 'treino' | 'dieta';

export const PART_SECTIONS: Record<Part, Section[]> = {
  treino: ['days', 'habits'],
  dieta: ['meals', 'targets', 'rules'],
};

export const ALL_SECTIONS: Section[] = [...PART_SECTIONS.treino, ...PART_SECTIONS.dieta];

const SECTION_HEADERS: [RegExp, Section][] = [
  [/^h[aá]bitos(\s+da\s+semana)?\s*:?$/i, 'habits'],
  [/^(refei[cç][oõ]es|dieta|card[aá]pio)\s*:?$/i, 'meals'],
  [/^metas\s*:?$/i, 'targets'],
  [/^(regras|regras simples|dicas)\s*:?$/i, 'rules'],
  [/^(treinos?|plano de treino)\s*:?$/i, 'days'],
];

function parseDayHeader(line: string): WorkoutDay | null {
  const n = normalize(line);
  const D = '(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?';
  const wd = n.match(new RegExp(`^${D}(?:\\s+(?:e|ou)\\s+${D})?\\s*(?:[:\\-–]\\s*(.*))?$`));
  if (wd) {
    const weekday = WEEKDAYS[wd[1]];
    const title = (line.match(/^[^:–]*?[:–]\s*(.*)$/)?.[1] ?? titleAfterDash(line)).trim();
    return { label: WEEKDAY_LABELS[weekday], weekday, title, exercises: [] };
  }
  const rot = line.match(/^(treino|dia)\s+([A-Za-z0-9]{1,2})\s*(?:[:\-–]\s*(.*))?$/i);
  if (rot) {
    const label = `${capitalize(rot[1].toLowerCase())} ${rot[2].toUpperCase()}`;
    return { label, weekday: null, title: (rot[3] ?? '').trim(), exercises: [] };
  }
  return null;
}

function titleAfterDash(line: string): string {
  const m = line.match(/\s-\s*(.*)$/);
  return m ? m[1] : '';
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SETS_RE = /^(\d+)\s*[xX×]\s*(.+)$/;

export function parseExercise(line: string, index: number): Exercise {
  let name = line;
  let rest: string | null = null;
  const colon = line.indexOf(':');
  if (colon > 0) {
    name = line.slice(0, colon).trim();
    rest = line.slice(colon + 1).trim();
  } else {
    const m = line.match(/^(.+?)\s+(\d+\s*[xX×]\s*.+)$/);
    if (m) {
      name = m[1].trim();
      rest = m[2].trim();
    }
  }
  const id = `${slug(name)}-${index}`;
  if (rest) {
    const sm = rest.match(SETS_RE);
    if (sm) {
      const sets = parseInt(sm[1], 10);
      const parts = sm[2].split(',').map((p) => p.trim());
      const reps = parts[0];
      const tail = normalize(parts.slice(1).join(','));
      const load = /carga|kg/.test(tail) || /kg/.test(normalize(reps));
      return { id, name, sets, reps: reps.replace(/\s*,?\s*carga.*$/i, ''), load };
    }
    return { id, name, note: rest };
  }
  return { id, name };
}

function parseRange(s: string): [number | undefined, number | undefined] {
  const nums = s.match(/\d+(?:[.,]\d+)?/g)?.map((x) => parseFloat(x.replace(',', '.'))) ?? [];
  if (nums.length === 0) return [undefined, undefined];
  return [nums[0], nums[1] ?? nums[0]];
}

const isTargetLine = (line: string) => /^(kcal|calorias|proteina|agua)\b.*:/.test(normalize(line));

function parseTarget(line: string, targets: Targets): boolean {
  const n = normalize(line);
  const value = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;
  if (n.startsWith('kcal') || n.startsWith('calorias')) {
    [targets.kcalMin, targets.kcalMax] = parseRange(value);
    return true;
  }
  if (n.startsWith('proteina')) {
    [targets.proteinMin, targets.proteinMax] = parseRange(value);
    return true;
  }
  if (n.startsWith('agua')) {
    const [v] = parseRange(value);
    targets.waterL = v;
    return v !== undefined;
  }
  return false;
}

const CLOCK = String.raw`\d{1,2}(?::\d{2}|h\d{0,2})`;
const TIME_RE = new RegExp(String.raw`^(${CLOCK}(?:\s*(?:a|às|as|até|ate|-|–)\s*${CLOCK})?)\s*[,\-–:]?\s+(.+)$`, 'i');
const OPTION_RE = /^op[cç][aã]o\s*\d*\s*[:\-–.)]\s*(.+)$/i;

const cleanOption = (s: string) => s.trim().replace(/\.$/, '');

function parseMeal(line: string): Meal | null {
  let rest = line;
  let time: string | undefined;
  const tm = line.match(TIME_RE);
  if (tm) {
    time = tm[1].replace(/\s+/g, ' ');
    rest = tm[2];
  }
  let name: string;
  let options: string[];
  if (rest.includes('|') && !rest.includes(':')) {
    [name, ...options] = rest.split('|');
  } else {
    const colon = rest.indexOf(':');
    name = colon > 0 ? rest.slice(0, colon) : rest;
    options = colon > 0 ? rest.slice(colon + 1).split('|') : [];
  }
  name = capitalize(name.trim().replace(/[:.]$/, ''));
  if (!name) return null;
  const meal: Meal = { name, options: options.map(cleanOption).filter(Boolean) };
  if (time) meal.time = time;
  return meal;
}

export function parsePlanText(text: string, planName = 'Plano importado', part?: Part): ParseResult {
  const plan = emptyPlan(planName);
  const warnings: ParseResult['warnings'] = [];
  const found = { days: false, habits: false, meals: false, targets: false, rules: false };
  let section: Section = part === 'dieta' ? 'meals' : 'days';
  let current: WorkoutDay | null = null;
  const mealLines = new Map<Meal, { line: number; text: string }>();

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = stripBullet(raw);
    if (!line) return;

    const header = SECTION_HEADERS.find(([re]) => re.test(line));
    if (header) {
      section = header[1];
      current = null;
      return;
    }

    const day = parseDayHeader(line);
    if (day) {
      section = 'days';
      current = day;
      plan.days.push(day);
      found.days = true;
      return;
    }

    switch (section) {
      case 'days':
        if (!current) {
          warnings.push({ line: i + 1, text: raw.trim() });
          return;
        }
        (current as WorkoutDay).exercises.push(parseExercise(line, (current as WorkoutDay).exercises.length));
        return;
      case 'habits':
        plan.habits.push(line);
        found.habits = true;
        return;
      case 'rules':
        plan.rules.push(line);
        found.rules = true;
        return;
      case 'meals': {
        if (isTargetLine(line) && parseTarget(line, plan.targets)) {
          found.targets = true;
          return;
        }
        const opt = line.match(OPTION_RE);
        if (opt) {
          const last = plan.meals[plan.meals.length - 1];
          if (last) last.options.push(cleanOption(opt[1]));
          else warnings.push({ line: i + 1, text: raw.trim() });
          return;
        }
        const meal = parseMeal(line);
        if (meal) {
          plan.meals.push(meal);
          mealLines.set(meal, { line: i + 1, text: raw.trim() });
        } else warnings.push({ line: i + 1, text: raw.trim() });
        return;
      }
      case 'targets':
        if (parseTarget(line, plan.targets)) found.targets = true;
        else warnings.push({ line: i + 1, text: raw.trim() });
        return;
    }
  });

  plan.days = plan.days.filter((d) => d.exercises.length > 0);
  found.days = plan.days.length > 0;
  plan.meals.forEach((m) => {
    if (m.options.length === 0) warnings.push(mealLines.get(m)!);
  });
  plan.meals = plan.meals.filter((m) => m.options.length > 0);
  found.meals = plan.meals.length > 0;
  warnings.sort((a, b) => a.line - b.line);
  return { plan: dedupe(plan), warnings, found };
}

export function dedupe(plan: Plan): Plan {
  const seen = new Map<string, number>();
  const meals = plan.meals.map((m) => {
    const key = normalize(m.name);
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? m : { ...m, name: `${m.name} (${n})` };
  });
  return { ...plan, meals, habits: [...new Set(plan.habits)], rules: [...new Set(plan.rules)] };
}

export function pickSections(base: Plan, incoming: Plan, sections: Section[]): Plan {
  const out: Plan = { ...base };
  for (const s of sections) (out as Record<Section, unknown>)[s] = incoming[s];
  return out;
}

export function foundIn(result: ParseResult, part?: Part): Section[] {
  return (part ? PART_SECTIONS[part] : ALL_SECTIONS).filter((s) => result.found[s]);
}

export function ignoredIn(result: ParseResult, part?: Part): Section[] {
  if (!part) return [];
  return ALL_SECTIONS.filter((s) => result.found[s] && !PART_SECTIONS[part].includes(s));
}

export function hasContent(plan: Plan, s: Section): boolean {
  return s === 'targets' ? Object.values(plan.targets).some((v) => v !== undefined) : plan[s].length > 0;
}

function formatExercise(e: Exercise): string {
  if (e.sets !== undefined) {
    return `${e.name}: ${e.sets} x ${e.reps ?? ''}${e.load ? ', carga ___ kg' : ''}`;
  }
  return e.note ? `${e.name}: ${e.note}` : e.name;
}

function range(a?: number, b?: number): string {
  if (a === undefined) return '';
  return b !== undefined && b !== a ? `${a}-${b}` : `${a}`;
}

export function planToText(plan: Plan, part?: Part): string {
  const out: string[] = [];
  const want = new Set(part ? PART_SECTIONS[part] : ALL_SECTIONS);
  if (want.has('days')) {
    for (const d of plan.days) {
      out.push(d.title ? `${d.label}: ${d.title}` : d.label);
      d.exercises.forEach((e) => out.push(formatExercise(e)));
      out.push('');
    }
  }
  if (want.has('habits') && plan.habits.length) {
    out.push('Hábitos:', ...plan.habits, '');
  }
  if (want.has('meals') && plan.meals.length) {
    out.push('Refeições:', ...plan.meals.map((m) => `${m.time ? `${m.time}, ` : ''}${m.name}: ${m.options.join(' | ')}`), '');
  }
  const t = plan.targets;
  const targetLines = [
    t.kcalMin !== undefined ? `kcal: ${range(t.kcalMin, t.kcalMax)}` : '',
    t.proteinMin !== undefined ? `proteína: ${range(t.proteinMin, t.proteinMax)}` : '',
    t.waterL !== undefined ? `água: ${t.waterL}` : '',
  ].filter(Boolean);
  if (want.has('targets') && targetLines.length) out.push('Metas:', ...targetLines, '');
  if (want.has('rules') && plan.rules.length) out.push('Regras:', ...plan.rules, '');
  return out.join('\n').trim() + '\n';
}
