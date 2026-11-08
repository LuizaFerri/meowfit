export type Exercise = {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  load?: boolean;
  note?: string;
};

export type WorkoutDay = {
  label: string;
  weekday: number | null;
  title: string;
  exercises: Exercise[];
};

export type Meal = {
  name: string;
  time?: string;
  options: string[];
};

export type Targets = {
  kcalMin?: number;
  kcalMax?: number;
  proteinMin?: number;
  proteinMax?: number;
  waterL?: number;
};

export type Plan = {
  version: 1;
  name: string;
  days: WorkoutDay[];
  habits: string[];
  meals: Meal[];
  rules: string[];
  targets: Targets;
  treinoSince?: string;
  treinoSnooze?: string;
};

export type Profile = {
  id: number;
  name: string;
  height_cm: number | null;
  plan: Plan;
};

export const emptyPlan = (name = 'Meu plano'): Plan => ({
  version: 1,
  name,
  days: [],
  habits: [],
  meals: [],
  rules: [],
  targets: {},
});
