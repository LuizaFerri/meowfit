import { TEXT_EXAMPLES } from '@/lib/planHelp';
import { isMealName, parsePlanText, planToText } from '@/lib/planText';

test('the help example is read as shown', () => {
  const r = parsePlanText(TEXT_EXAMPLES.dieta, 'x', 'dieta');
  expect(r.warnings).toEqual([]);
  expect(r.plan.meals.map((m) => [m.time, m.name, m.options.length, m.options[0].split('\n').length])).toEqual([
    ['07:30', 'Café da manhã', 1, 3],
    ['12:30', 'Almoço', 1, 3],
    ['16:00', 'Lanche', 2, 1],
    [undefined, 'Jantar', 2, 1],
  ]);
  expect(r.plan.targets.kcalMin).toBe(1600);
  expect(r.plan.rules).toHaveLength(1);
});

const NUTRI = `08:30 Café da manhã

Omelete: 2 ovos (100 g) + 1 fatia de muçarela (20 g). Pode pôr tomate e cenoura ralada.
Mamão: 1 fatia média (170 g)
Aveia: 1 colher de sopa cheia (15 g)
Café coado suave: 1 xícara (200 ml)

11:00 Almoço

Arroz branco cozido: 2 colheres de sopa cheias (50 g)
Feijão carioca cozido: 1 colher de servir cheia (35 g)
Peito de frango grelhado: 1 filé médio (100 g)
Cenoura cozida: 2 colheres de sopa cheias (50 g)
Beterraba cozida: 4 colheres de sopa cheias (80 g)
Laranja: 1 unidade média (180 g)

15:00 Lanche

Banana: 1 unidade média (40 g, como no plano)
Aveia em flocos finos: 1 colher de sopa cheia (15 g)
Iogurte caseiro: 1 porção (234 ml)

19:00 Jantar

Peito de frango refogado: 1 filé médio (100 g)
Batata inglesa cozida: 3 colheres de servir rasas (120 g)
Brócolis: 10 colheres de sopa cheias (100 g)`;

test('a nutritionist menu groups foods under each meal, with quantities', () => {
  const r = parsePlanText(NUTRI, 'x', 'dieta');
  expect(r.warnings).toEqual([]);
  expect(r.plan.meals.map((m) => [m.time, m.name, m.options.length])).toEqual([
    ['08:30', 'Café da manhã', 1],
    ['11:00', 'Almoço', 1],
    ['15:00', 'Lanche', 1],
    ['19:00', 'Jantar', 1],
  ]);
  expect(r.plan.meals[0].options[0].split('\n')).toEqual([
    'Omelete: 2 ovos (100 g) + 1 fatia de muçarela (20 g). Pode pôr tomate e cenoura ralada',
    'Mamão: 1 fatia média (170 g)',
    'Aveia: 1 colher de sopa cheia (15 g)',
    'Café coado suave: 1 xícara (200 ml)',
  ]);
  expect(r.plan.meals[3].options[0]).toContain('Batata inglesa cozida: 3 colheres de servir rasas (120 g)');
});

test('the menu survives a round trip through the text editor', () => {
  const plan = parsePlanText(NUTRI, 'x', 'dieta').plan;
  const text = planToText(plan, 'dieta');
  expect(text).toContain('08:30 Café da manhã\nOmelete:');
  expect(parsePlanText(text, 'x', 'dieta').plan.meals).toEqual(plan.meals);
});

test('meal names, times at the end and pre/post workout are recognized', () => {
  const r = parsePlanText(
    `Pré-treino (17:30)
Banana: 1 unidade
Pasta de amendoim: 1 colher (15 g)

Pós-treino - 19h
Whey: 1 scoop (30 g)

Ceia
Chá de camomila: 1 xícara`,
    'x',
    'dieta',
  );
  expect(r.plan.meals.map((m) => [m.time, m.name, m.options[0].split('\n').length])).toEqual([
    ['17:30', 'Pré-treino', 2],
    ['19h', 'Pós-treino', 1],
    [undefined, 'Ceia', 1],
  ]);
  expect(isMealName('Lanche da tarde')).toBe(true);
  expect(isMealName('Café')).toBe(true);
  expect(isMealName('Arroz branco')).toBe(false);
});

test('options can still be listed under a meal, and mixed with a menu', () => {
  const r = parsePlanText(
    `Café da manhã
Opção 1: 2 ovos e pão integral
Opção 2: iogurte com aveia

Almoço: frango e arroz | peixe e batata

Jantar
Opção 1: Omelete: 2 ovos
Salada: à vontade
Opção 2: sopa de legumes`,
    'x',
    'dieta',
  );
  expect(r.plan.meals.map((m) => [m.name, m.options])).toEqual([
    ['Café da manhã', ['2 ovos e pão integral', 'iogurte com aveia']],
    ['Almoço', ['frango e arroz', 'peixe e batata']],
    ['Jantar', ['Omelete: 2 ovos\nSalada: à vontade', 'sopa de legumes']],
  ]);
  expect(parsePlanText(planToText(r.plan, 'dieta'), 'x', 'dieta').plan.meals).toEqual(r.plan.meals);
});
