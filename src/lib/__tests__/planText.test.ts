import { SAMPLE_TEXT } from '@/data/samplePlan';
import { makePlanFile, parseJsonFile } from '@/lib/backup';
import { foundIn, ignoredIn, parseExercise, parsePlanText, pickSections, planToText } from '@/lib/planText';
import { emptyPlan } from '@/lib/types';

describe('parsePlanText', () => {
  const { plan, warnings, found } = parsePlanText(SAMPLE_TEXT);

  it('reads the five training days from the PDF plan', () => {
    expect(warnings).toEqual([]);
    expect(plan.days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5]);
    expect(plan.days.map((d) => d.exercises.length)).toEqual([6, 7, 7, 8, 5]);
    expect(plan.days[0].title).toBe('inferiores (quadríceps)');
    expect(plan.days[1].label).toBe('Terça');
  });

  it('parses sets, reps and load', () => {
    const [warmup, squat, , , , plank] = plan.days[0].exercises;
    expect(warmup).toMatchObject({ name: 'Aquecimento', note: '5-10 min de esteira ou bicicleta' });
    expect(warmup.sets).toBeUndefined();
    expect(squat).toMatchObject({ name: 'Agachamento no Smith ou livre', sets: 4, reps: '10', load: true });
    expect(plank).toMatchObject({ name: 'Prancha', sets: 3, reps: '30 s', load: false });
    const lunge = plan.days[2].exercises.find((e) => e.name === 'Afundo');
    expect(lunge).toMatchObject({ sets: 3, reps: '10 cada perna', load: true });
  });

  it('reads habits, meals, targets and rules', () => {
    expect(found).toEqual({ days: true, habits: true, meals: true, targets: true, rules: true });
    expect(plan.habits).toHaveLength(6);
    expect(plan.meals).toHaveLength(6);
    expect(plan.meals[0].options).toHaveLength(2);
    expect(plan.targets).toEqual({ kcalMin: 1600, kcalMax: 1750, proteinMin: 100, proteinMax: 110, waterL: 2.5 });
    expect(plan.rules.length).toBeGreaterThan(3);
  });

  it('round-trips through planToText', () => {
    const again = parsePlanText(planToText(plan)).plan;
    expect(again.days).toEqual(plan.days);
    expect(again.habits).toEqual(plan.habits);
    expect(again.meals).toEqual(plan.meals);
    expect(again.targets).toEqual(plan.targets);
    expect(again.rules).toEqual(plan.rules);
  });
});

describe('flexible input', () => {
  it('accepts bullets, checkboxes, -feira, rotating workouts and compact sets', () => {
    const { plan, warnings } = parsePlanText(
      [
        'Segunda-feira',
        '- [x] Leg press 3x12',
        '• Supino: 4 X 8, carga 20 kg',
        'Treino B: costas',
        '1. Remada: 3 × 10',
        'Sábado e domingo',
      ].join('\n'),
    );
    expect(warnings).toEqual([]);
    expect(plan.days).toHaveLength(2);
    expect(plan.days[0]).toMatchObject({ label: 'Segunda', weekday: 1, title: '' });
    expect(plan.days[0].exercises[0]).toMatchObject({ name: 'Leg press', sets: 3, reps: '12' });
    expect(plan.days[0].exercises[1]).toMatchObject({ name: 'Supino', sets: 4, reps: '8', load: true });
    expect(plan.days[1]).toMatchObject({ label: 'Treino B', weekday: null, title: 'costas' });
  });

  it('reports exercise lines that come before any day', () => {
    const { warnings } = parsePlanText('Leg press: 3 x 12\nSegunda\nSupino: 3 x 10');
    expect(warnings).toEqual([{ line: 1, text: 'Leg press: 3 x 12' }]);
  });

  it('merges a workout-only import into an existing plan', () => {
    const base = { ...emptyPlan(), habits: ['Dormir 7 h'], targets: { waterL: 2 } };
    const result = parsePlanText('Treino A\nAgachamento: 4 x 10', 'x', 'treino');
    const merged = pickSections(base, result.plan, foundIn(result, 'treino'));
    expect(merged.days).toHaveLength(1);
    expect(merged.habits).toEqual(['Dormir 7 h']);
    expect(merged.targets).toEqual({ waterL: 2 });
  });

  it('parseExercise keeps simple items without sets', () => {
    expect(parseExercise('Esteira inclinada (caminhada): 20-30 min', 0)).toMatchObject({
      name: 'Esteira inclinada (caminhada)',
      note: '20-30 min',
    });
  });
});

describe('separate workout and diet imports', () => {
  const sample = parsePlanText(SAMPLE_TEXT).plan;

  it('parses a diet without section headers', () => {
    const r = parsePlanText(
      'Almoço: frango e arroz | peixe e batata\nJantar: omelete\nkcal: 1600-1750\nproteína: 100\nágua: 2,5\n\nRegras:\nSem refrigerante',
      'x',
      'dieta',
    );
    expect(r.warnings).toEqual([]);
    expect(r.plan.meals).toEqual([
      { name: 'Almoço', options: ['frango e arroz', 'peixe e batata'] },
      { name: 'Jantar', options: ['omelete'] },
    ]);
    expect(r.plan.targets).toEqual({ kcalMin: 1600, kcalMax: 1750, proteinMin: 100, proteinMax: 100, waterL: 2.5 });
    expect(r.plan.rules).toEqual(['Sem refrigerante']);
    expect(foundIn(r, 'dieta')).toEqual(['meals', 'targets', 'rules']);
  });

  it('a diet import keeps the workout, and reports workout sections it ignored', () => {
    const r = parsePlanText('Segunda\nSupino: 3 x 10\nRefeições:\nAlmoço: salada', 'x', 'dieta');
    expect(foundIn(r, 'dieta')).toEqual(['meals']);
    expect(ignoredIn(r, 'dieta')).toEqual(['days']);
    const merged = pickSections(sample, r.plan, foundIn(r, 'dieta'));
    expect(merged.days).toEqual(sample.days);
    expect(merged.meals).toEqual([{ name: 'Almoço', options: ['salada'] }]);
    expect(merged.targets).toEqual(sample.targets);
  });

  it('planToText exports only the requested part', () => {
    const treino = planToText(sample, 'treino');
    const dieta = planToText(sample, 'dieta');
    expect(treino).toContain('Leg press');
    expect(treino).not.toContain('Refeições:');
    expect(dieta).not.toContain('Leg press');
    const back = parsePlanText(dieta, 'x', 'dieta').plan;
    expect(back.meals).toEqual(sample.meals);
    expect(back.targets).toEqual(sample.targets);
    expect(back.rules).toEqual(sample.rules);
  });

  it('shared files carry only their part', () => {
    const file = parseJsonFile(JSON.stringify(makePlanFile(sample, 'dieta')));
    expect(file.kind).toBe('plan');
    if (file.kind !== 'plan') return;
    expect(file.part).toBe('dieta');
    expect(file.plan.days).toEqual([]);
    expect(file.plan.meals).toEqual(sample.meals);
  });
});

test('repeated meal names become unique and repeated habits are dropped', () => {
  const r = parsePlanText('Lanche: fruta\nAlmoço: arroz\nlanche: iogurte\nLanche: castanhas', 'x', 'dieta');
  expect(r.plan.meals.map((m) => m.name)).toEqual(['Lanche', 'Almoço', 'Lanche (2)', 'Lanche (3)']);
  const h = parsePlanText('Treino A\nSupino: 3 x 10\nHábitos:\nDormir 7 h\nDormir 7 h', 'x', 'treino');
  expect(h.plan.habits).toEqual(['Dormir 7 h']);
  const file = parseJsonFile(JSON.stringify({ days: [], meals: [{ name: 'Ceia', options: [] }, { name: 'Ceia', options: [] }] }));
  expect(file.plan.meals.map((m) => m.name)).toEqual(['Ceia', 'Ceia (2)']);
});

test('meals with time prefix and options on separate lines', () => {
  const text = [
    '7:30, café da manhã (pré-treino)',
    'Opção 1: 2 ovos mexidos, 1 fatia de pão integral, 1 fruta, café com adoçante.',
    'Opção 2: iogurte grego com aveia e banana.',
    '',
    '9:00 a 10:00, treino',
    '',
    '10:15 a 10:30, pós-treino',
    'Opção 1: tapioca com ovo e queijo branco.',
    'Opção 2: iogurte grego com fruta e aveia.',
    '',
    '16:00, lanche da tarde',
    'Opção 1: iogurte com fruta e castanhas.',
    '19h30 - 20h, Jantar: omelete | sopa',
  ].join('\n');
  const r = parsePlanText(text, 'x', 'dieta');
  expect(r.plan.meals).toEqual([
    {
      name: 'Café da manhã (pré-treino)',
      time: '7:30',
      options: ['2 ovos mexidos, 1 fatia de pão integral, 1 fruta, café com adoçante', 'iogurte grego com aveia e banana'],
    },
    { name: 'Pós-treino', time: '10:15 a 10:30', options: ['tapioca com ovo e queijo branco', 'iogurte grego com fruta e aveia'] },
    { name: 'Lanche da tarde', time: '16:00', options: ['iogurte com fruta e castanhas'] },
    { name: 'Jantar', time: '19h30 - 20h', options: ['omelete', 'sopa'] },
  ]);
  expect(r.warnings).toEqual([{ line: 5, text: '9:00 a 10:00, treino' }]);
  const back = parsePlanText(planToText(r.plan, 'dieta'), 'x', 'dieta').plan;
  expect(back.meals).toEqual(r.plan.meals);
});
