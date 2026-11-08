export type BmiLevel = 'under' | 'normal' | 'over' | 'obese1' | 'obese2' | 'obese3';

export const BMI_LEVELS: { level: BmiLevel; label: string; min: number; max: number }[] = [
  { level: 'under', label: 'Abaixo do peso', min: 0, max: 18.5 },
  { level: 'normal', label: 'Peso normal', min: 18.5, max: 25 },
  { level: 'over', label: 'Sobrepeso', min: 25, max: 30 },
  { level: 'obese1', label: 'Obesidade grau I', min: 30, max: 35 },
  { level: 'obese2', label: 'Obesidade grau II', min: 35, max: 40 },
  { level: 'obese3', label: 'Obesidade grau III', min: 40, max: Infinity },
];

export const bmi = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2;

export function classifyBmi(value: number) {
  return BMI_LEVELS.find((l) => value < l.max) ?? BMI_LEVELS[BMI_LEVELS.length - 1];
}

export function healthyRange(heightCm: number): [number, number] {
  const h2 = (heightCm / 100) ** 2;
  return [Math.ceil(18.5 * h2 * 10) / 10, Math.floor(24.9 * h2 * 10) / 10];
}
