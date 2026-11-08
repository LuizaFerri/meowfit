import { parsePlanText } from '@/lib/planText';

export const EXAMPLE_TEXT = `Segunda: corpo todo A
Aquecimento: 5-10 min de caminhada
Agachamento: 3 x 12, carga ___ kg
Supino com halteres: 3 x 12, carga ___ kg
Remada baixa: 3 x 12, carga ___ kg
Prancha: 3 x 30 s

Quarta: corpo todo B
Aquecimento: 5-10 min de caminhada
Leg press: 3 x 12, carga ___ kg
Puxada alta: 3 x 12, carga ___ kg
Desenvolvimento de ombro: 3 x 12, carga ___ kg
Abdominal: 3 x 15

Sexta: corpo todo C
Aquecimento: 5-10 min de caminhada
Elevação pélvica: 3 x 12, carga ___ kg
Flexão de braço: 3 x 10
Rosca direta: 3 x 12, carga ___ kg
Caminhada: 20 min

Hábitos:
Treinei todos os dias planejados
Dormi 7 h ou mais na maioria das noites

Refeições:
Café da manhã: ovos e uma fruta | iogurte com aveia
Almoço: arroz, feijão, uma carne e salada
Lanche: uma fruta | iogurte
Jantar: uma carne com legumes | omelete com salada

Metas:
água: 2

Regras:
Beber água ao longo do dia
`;

export const examplePlan = () => parsePlanText(EXAMPLE_TEXT, 'Plano de exemplo').plan;
