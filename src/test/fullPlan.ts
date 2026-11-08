import { parsePlanText } from '@/lib/planText';

export const FULL_PLAN_TEXT = `Segunda: inferiores (quadríceps)
Aquecimento: 5-10 min de esteira ou bicicleta
Agachamento no Smith ou livre: 4 x 10, carga ___ kg
Leg press: 3 x 12, carga ___ kg
Cadeira extensora: 3 x 12, carga ___ kg
Panturrilha em pé: 3 x 15, carga ___ kg
Prancha: 3 x 30 s

Terça: superiores
Aquecimento: 5-10 min de esteira ou bicicleta
Supino (máquina ou halteres): 3 x 10, carga ___ kg
Remada sentada: 3 x 12, carga ___ kg
Desenvolvimento de ombro: 3 x 10, carga ___ kg
Puxada alta (lat pulldown): 3 x 12, carga ___ kg
Tríceps na polia: 3 x 12, carga ___ kg
Rosca direta: 3 x 12, carga ___ kg

Quarta: glúteo e posterior
Aquecimento: 5-10 min de esteira ou bicicleta
Stiff: 4 x 10, carga ___ kg
Elevação pélvica: 4 x 10, carga ___ kg
Mesa flexora: 3 x 12, carga ___ kg
Afundo: 3 x 10 cada perna, carga ___ kg
Cadeira abdutora: 3 x 15, carga ___ kg
Abdominal na máquina: 3 x 15, carga ___ kg

Quinta: superiores
Aquecimento: 5-10 min de esteira ou bicicleta
Puxada alta: 3 x 12, carga ___ kg
Supino inclinado: 3 x 10, carga ___ kg
Elevação lateral: 3 x 12, carga ___ kg
Remada baixa: 3 x 12, carga ___ kg
Tríceps testa ou corda: 3 x 12, carga ___ kg
Rosca alternada: 3 x 12, carga ___ kg
Abdominal infra (elevação de pernas): 3 x 12

Sexta: corpo todo leve + cardio
Aquecimento: 5-10 min de esteira ou bicicleta
Leg press: 3 x 12, carga ___ kg
Supino: 3 x 12, carga ___ kg
Remada: 3 x 12, carga ___ kg
Esteira inclinada (caminhada): 20-30 min

Hábitos:
Anotei as cargas em todos os treinos
Bati a proteína (~100 g) em pelo menos 5 dias
Bebi 2 L de água na maioria dos dias
Caminhei 8-10 mil passos na maioria dos dias
Dormi bem (7 h ou mais) na maioria das noites
Caminhada de 30-40 min no sábado ou domingo

Refeições:
Café da manhã: 2 ovos mexidos, 1 fatia de pão integral, 1 fruta, café com adoçante | Iogurte grego com aveia e banana, café
Lanche da manhã: 1 fruta + 1 punhado de castanhas | Queijo cottage com tomate
Almoço: 120 g de frango grelhado, 4 colheres de arroz, 1 concha de feijão, salada à vontade | 120 g de carne magra ou peixe, batata cozida, legumes refogados
Lanche da tarde (pré-treino): Iogurte + banana ou tapioca com ovo | Pão integral com queijo branco e peito de peru
Jantar: Omelete de 2-3 ovos com legumes e salada | Sopa de legumes com frango desfiado ou carne moída magra
Ceia (opcional): Iogurte natural ou 1 fruta | Chá + 1 fatia de queijo

Metas:
kcal: 1600-1750
proteína: 100-110
água: 2.5

Regras:
Proteína em toda refeição (palma da mão de carne, 2 ovos, iogurte grego, queijo cottage)
Metade do prato de legumes e verduras no almoço e no jantar
Carboidrato de verdade ao redor do treino, em porções medidas
Evitar refrigerante, suco de caixinha, fritura e doce todo dia
Café com adoçante liberado, sem açúcar nem muito leite
`;

export const fullPlan = () => parsePlanText(FULL_PLAN_TEXT, 'Plano completo').plan;
