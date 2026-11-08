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
  dieta: `7:30, café da manhã
Opção 1: 2 ovos e pão integral
Opção 2: iogurte com aveia

12:30, almoço: frango, arroz e salada | peixe e batata
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
    'Uma refeição por linha (“Almoço: opção 1 | opção 2”) ou o nome numa linha e as opções embaixo (“Opção 1: …”). O horário no começo é opcional (“12:30, almoço”). Metas: “kcal: 1600-1750”, “proteína: 100-110”, “água: 2.5”. Depois de “Regras:”, uma dica por linha.',
};
