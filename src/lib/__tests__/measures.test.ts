import { measurementToSave } from '../measures';

test('saving only name or height never creates a measurement', () => {
  expect(measurementToSave({ weight: '63', waist: '78', touched: false })).toBeNull();
});

test('the same weight can be recorded again when the field was touched', () => {
  expect(measurementToSave({ weight: '63', waist: '', touched: true })).toEqual({ weight: 63, waist: null });
  expect(measurementToSave({ weight: '63,5', waist: '78', touched: true })).toEqual({ weight: 63.5, waist: 78 });
});

test('empty or zero values are not recorded', () => {
  expect(measurementToSave({ weight: '', waist: '', touched: true })).toBeNull();
  expect(measurementToSave({ weight: '0', waist: 'abc', touched: true })).toBeNull();
});
