import { bmi, classifyBmi, healthyRange } from '@/lib/bmi';

test('bmi of the PDF example', () => {
  expect(Math.round(bmi(63, 160) * 10) / 10).toBe(24.6);
  expect(classifyBmi(bmi(63, 160)).label).toBe('Peso normal');
});

test('classification boundaries follow the WHO table', () => {
  expect(classifyBmi(18.4).level).toBe('under');
  expect(classifyBmi(18.5).level).toBe('normal');
  expect(classifyBmi(24.9).level).toBe('normal');
  expect(classifyBmi(25).level).toBe('over');
  expect(classifyBmi(30).level).toBe('obese1');
  expect(classifyBmi(35).level).toBe('obese2');
  expect(classifyBmi(40).level).toBe('obese3');
  expect(classifyBmi(55).level).toBe('obese3');
});

test('healthy weight range for a height', () => {
  expect(healthyRange(160)).toEqual([47.4, 63.7]);
});
