import type { Part } from './planText';

export const TEXT_EXAMPLES: Record<Part, string> = {
  treino: `Segunda: inferiores
Aquecimento: 5-10 min de esteira
Leg press: 3 x 12, carga ___ kg
Prancha: 3 x 30 s

Treino B: superiores
Supino: 4 x 10, carga ___ kg

Hábitos:
Dormi 7 h ou mais
Caminhei 8 mil passos`,
  dieta: `07:30 Café da manhã
Ovos mexidos: 2 unidades (100 g)
Pão integral: 1 fatia (25 g)
Mamão: 1 fatia média (170 g)

12:30 Almoço
Arroz: 2 colheres de sopa (50 g)
Feijão: 1 concha (80 g)
Frango grelhado: 1 filé (100 g)

16:00 Lanche
Opção 1: iogurte com aveia
Opção 2: 1 banana com pasta de amendoim

Jantar: omelete com legumes | sopa com frango

kcal: 1600-1750
proteína: 100-110
água: 2.5

Regras:
Proteína em toda refeição`,
};

export const TEXT_HELP: Record<Part, string> = {
  treino:
    'Cada treino começa com o dia (“Segunda: pernas”) ou “Treino A”. Depois, um exercício por linha: “Nome: séries x repetições”. Escreva “carga ___ kg” para anotar peso. A seção “Hábitos:” é opcional e vira o checklist da semana.',
  dieta:
    'Separe por refeição: numa linha o horário e o nome (“08:30 Café da manhã”, “Almoço”, “Pré-treino”) e, embaixo, um alimento por linha com a quantidade (“Batata cozida: 3 colheres (120 g)”). Deixe uma linha em branco entre as refeições. Se houver alternativas, use “Opção 1: …”, “Opção 2: …” ou “Almoço: opção 1 | opção 2”. Metas: “kcal: 1600-1750”, “proteína: 100-110”, “água: 2.5”. Depois de “Regras:”, uma dica por linha.',
};
