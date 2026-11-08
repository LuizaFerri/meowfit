import { dark, lilac } from '@/components/theme';
import { TodayWidget, WaterWidget, WeekWidget } from '../components';
import type { WidgetData } from '../data';
import { renderWidget } from '../render';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

const { buildWidgetTree } = require('react-native-android-widget/lib/commonjs/api/build-widget-tree');

const base: WidgetData = {
  ready: true,
  mode: 'sistema',
  name: 'Luiza',
  dateLabel: 'Ter, 10 nov',
  day: { idx: 1, label: 'Terça', title: 'superiores', done: 2, total: 7 },
  finished: false,
  week: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((letter, i) => ({ letter, done: i === 0, today: i === 1 })),
  weekDone: 1,
  planned: 5,
  missed: 1,
  waterMl: 1250,
  waterGoalMl: 2500,
  mealsOnPlan: 1,
  mealsTotal: 6,
};

const variants: [string, WidgetData][] = [
  ['in progress', base],
  ['finished', { ...base, finished: true, missed: 0 }],
  ['rest day', { ...base, day: null, missed: 0 }],
  ['goal reached', { ...base, waterMl: 2500, mealsTotal: 0 }],
  ['no profile', { ...base, ready: false }],
];

const texts = (tree: any): string[] => [
  ...(tree.props?.text ? [tree.props.text] : []),
  ...(tree.children ?? []).flatMap(texts),
];

describe.each(variants)('%s', (_, d) => {
  it.each([
    ['Today', TodayWidget],
    ['Week', WeekWidget],
    ['Water', WaterWidget],
  ])('%s builds in both palettes', (_, Widget) => {
    for (const c of [lilac, dark]) expect(() => buildWidgetTree(<Widget d={d} c={c} />)).not.toThrow();
  });
});

test('content reflects the data', () => {
  expect(texts(buildWidgetTree(<TodayWidget d={base} c={lilac} />))).toEqual([
    '🐾 MeowFit',
    'Ter, 10 nov',
    'Terça · superiores',
    '2 de 7 exercícios',
    '💧 1,3 / 2,5 L',
    '🍽 1 de 6',
  ]);
  expect(texts(buildWidgetTree(<WeekWidget d={base} c={lilac} />))).toEqual([
    '✓', 'T', 'Q', 'Q', 'S', 'S', 'D', '1/5', 'treinos', 'Hoje não pode faltar!',
  ]);
  expect(texts(buildWidgetTree(<WaterWidget d={{ ...base, waterMl: 2600 }} c={dark} />))).toEqual(['💧 2,6 L', 'Meta batida!', '+250']);
});

test('the app theme picks the widget palette', () => {
  expect('light' in (renderWidget('Today', base) as object)).toBe(true);
  expect('light' in (renderWidget('Today', { ...base, mode: 'escuro' }) as object)).toBe(false);
});
