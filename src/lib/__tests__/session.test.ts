import { isSetFinished, setSignature } from '@/lib/session';

const sig = (weight: string, reps: string) => setSignature({ weight, reps });

test('typing only the load and pressing OK does not finish the set', () => {
  expect(isSetFinished(sig('', ''), { weight: '40', reps: '' })).toBe(false);
  expect(isSetFinished(sig('40', ''), { weight: '42,5', reps: '' })).toBe(false);
});

test('changing the load of a set whose reps were already noted does not finish it again', () => {
  expect(isSetFinished(sig('40', '12'), { weight: '42,5', reps: '12' })).toBe(false);
});

test('noting the reps finishes the set', () => {
  expect(isSetFinished(sig('40', ''), { weight: '40', reps: '12' })).toBe(true);
  expect(isSetFinished(undefined, { weight: '', reps: '30' })).toBe(true);
  expect(isSetFinished(sig('40', '10'), { weight: '40', reps: '12' })).toBe(true);
});

test('clearing the reps does not finish the set', () => {
  expect(isSetFinished(sig('40', '12'), { weight: '40', reps: '' })).toBe(false);
});
