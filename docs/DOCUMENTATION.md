# Documentação do MeowFit

MeowFit é um app Android, feito com React Native e Expo, para acompanhar treino, cargas, dieta e medidas. Ele não tem servidor: cada celular guarda os próprios dados num banco SQLite local, e um mesmo aparelho pode ter vários perfis.

## Sumário

1. [Visão geral das telas](#1-visão-geral-das-telas)
2. [Stack](#2-stack)
3. [Estrutura de pastas](#3-estrutura-de-pastas)
4. [Arquitetura](#4-arquitetura)
5. [Temas e ícone](#5-temas-e-ícone)
6. [Banco de dados](#6-banco-de-dados)
7. [Modelo do plano](#7-modelo-do-plano)
8. [Formato de texto para importação](#8-formato-de-texto-para-importação)
9. [Arquivos JSON: plano e backup](#9-arquivos-json-plano-e-backup)
10. [Regras de negócio](#10-regras-de-negócio)
11. [Desenvolvimento e testes](#11-desenvolvimento-e-testes)
12. [Gerar e instalar o APK](#12-gerar-e-instalar-o-apk)
13. [Como estender](#13-como-estender)
14. [Widgets Android](#14-widgets-android)
15. [Versão web (PWA para iPhone)](#15-versão-web-pwa-para-iphone)

---

## 1. Visão geral das telas

| Tela | Rota | O que faz |
|---|---|---|
| Hoje | `/` | Treino do dia, bolinhas da semana, água, refeições e aviso de medidas atrasadas |
| Treino | `/workout` | Lista os dias do plano, a evolução das cargas e os últimos treinos |
| Sessão de treino | `/workout/[day]` | Marca exercícios e anota carga e repetições de cada série |
| Evolução | `/exercise/[name]` | Gráfico da carga máxima por treino, com início, atual e recorde |
| Dieta | `/diet` | Metas, água, escolha da opção em cada refeição e adesão da semana |
| Histórico da dieta | `/diet-history` | Um cartão por dia com cada refeição: opção do plano, o que foi comido fora do plano ou "Não registrado", além da adesão e da água do dia. Mostra 30 dias por vez (`buildDietHistory` em `src/lib/diet.ts`) |
| Progresso | `/progress` | Checklist semanal de treinos e hábitos, além de peso e cintura com gráficos |
| Perfil | `/profile` | Troca e edição de perfil, plano, exportação, backup e exclusão |
| Novo perfil | `/new-profile` | Cria um perfil a partir do plano de exemplo, de um plano vazio ou de um backup |
| Importar | `/import` | `?parte=treino` ou `?parte=dieta` importa só aquela parte, por texto ou arquivo. Somando `&modo=editar`, edita a parte como texto. Com `?modo=arquivo`, restaura um backup |

## 2. Stack

| Camada | Biblioteca |
|---|---|
| Framework | Expo SDK 58, React Native 0.88, React 19, TypeScript |
| Navegação | expo-router (rotas por arquivo em `src/app`) |
| Banco | expo-sqlite |
| Estado global | zustand |
| Datas | date-fns (semana começando na segunda, locale pt-BR) |
| Gráficos | react-native-svg (componente próprio `LineChart`) |
| Arquivos | expo-document-picker, expo-file-system, expo-sharing, expo-clipboard |
| Notificações | expo-notifications (só locais: água e fim do descanso) |
| Ícones | @expo/vector-icons (Ionicons) |
| Tema | contexto próprio (`ThemeProvider`), expo-system-ui |
| Testes | jest + jest-expo |
| Build | EAS Build (na nuvem, perfil `preview` gera `.apk`) |

## 3. Estrutura de pastas

```
src/
  app/                    rotas (cada arquivo é uma tela)
    _layout.tsx           SQLiteProvider + carregamento do perfil ativo + Stack
    (tabs)/               abas: index (Hoje), workout (Treino), diet (Dieta), progress (Progresso), profile (Perfil)
    workout/[day].tsx     sessão de treino
    exercise/[name].tsx   evolução de um exercício
    import.tsx            importar / editar plano / restaurar backup
    new-profile.tsx       criação de perfil e boas-vindas
  components/             UI reutilizável (ui.tsx, theme.ts, ThemeProvider, LineChart, WaterCard, RestTimer, BmiCard)
  data/samplePlan.ts      plano de exemplo, escrito no formato de texto
  db/schema.ts            tabelas e migrações
  db/queries.ts           todas as consultas SQL
  lib/                    lógica pura: parser de texto, backup, datas, tipos, treino do dia
  store/useApp.ts         estado global e hooks de dados
```

Só o que fica em `src/app` vira rota. Componentes, hooks e utilitários ficam fora dessa pasta. Os nomes de arquivo e de rota são em inglês; os textos que aparecem para a pessoa usuária são em português.

A pasta `design/` guarda as artes originais em alta resolução (`header-light.png`, `header-dark.png`, `splash.png`). O app não usa essas imagens direto: as versões otimizadas ficam em `assets/`.

## 4. Arquitetura

```
SQLiteProvider (sculpt.db, roda migrate)
 └─ ThemeProvider (paleta Lilás ou Escuro)
 └─ Gate: carrega o perfil ativo no zustand
     └─ Stack
         ├─ (tabs): sem perfil, redireciona para /new-profile
         ├─ workout/[day], exercise/[name], import, new-profile
```

### Estado global (`src/store/useApp.ts`)

- `profile` guarda o perfil ativo, com o plano já convertido de JSON.
- `rev` é um contador que sobe a cada escrita no banco.
- `loadActive(db)` recarrega o perfil ativo. `switchTo(db, id)` troca de perfil.

### Hooks de dados

- `useProfile()` devolve o perfil ativo. Só funciona em telas que aparecem depois que existe um perfil.
- `useData(loader, deps)` executa `loader(db, profileId)`. Ele roda de novo quando a tela ganha foco, quando `rev` muda e quando algum valor de `deps` muda. Na prática, toda tela se atualiza sozinha depois de qualquer escrita.
- `useWrite()` executa uma escrita e incrementa `rev`.
- **Virada do dia:** água, refeições e séries ficam guardadas por data (`yyyy-MM-dd`), então cada dia começa do zero e o histórico continua. O `Gate` incrementa `rev` quando o app volta ao primeiro plano e à meia-noite, se estiver aberto. Assim as telas recalculam a data de hoje e também mostram o que foi registrado pelo widget com o app em segundo plano.
- A sessão de treino guarda a data em que foi aberta. Um treino que atravessa a meia-noite fica todo no mesmo dia.

```ts
const [water] = useData((db, pid) => getWater(db, pid, date), [date]);
const write = useWrite();
write((db) => addWater(db, pid, date, 250));
```

O `loader` passado para `useData` é capturado uma única vez. Se ele depender de algum valor que muda, esse valor precisa estar em `deps`.

### Sessão de treino

Os campos de carga e repetições ficam em estado local. Eles são preenchidos uma vez com as séries já salvas do dia, e cada campo é gravado quando a pessoa termina de editar (`onEndEditing`). Por isso o recarregamento disparado por `rev` não apaga o que está sendo digitado.

## 5. Temas e ícone

**Temas.** As paletas `lilac` (Lilás, claro e pastel) e `dark` (Escuro) ficam em `src/components/theme.ts`.
- As duas têm os mesmos nomes de cor. São nomes de **papel**, não de cor: `primary` e `onPrimary` (texto sobre `primary`), `accent`/`onAccent`, `warn`, `danger`, `info`, `inputBg` e assim por diante.
- Não use cor fixa (`'#fff'`) em telas, porque ela quebra o tema escuro.
- `ThemeProvider` (`src/components/ThemeProvider.tsx`) escolhe a paleta pelo modo salvo em `settings` (chave `theme`): `lilas`, `escuro` ou `sistema`, que segue o celular.
- Os componentes leem a paleta com `const { colors, s } = useTheme()`. `s` são os estilos base (`src/components/styles.ts`), gerados uma vez por paleta.
- Estilos que dependem de cor e ficam fora de um componente são funções que recebem a paleta, por exemplo `sessionStyles(colors)`.
- Todas as combinações de texto e fundo foram conferidas com contraste mínimo de 4,5:1 (WCAG AA) nos dois temas.
- O tema é escolhido no card **Aparência** do Perfil.
- **Barras do sistema:**
  - A barra de status e a barra de navegação do Android (os 3 botões) seguem o tema, pelo `ThemedStatusBar` em `src/app/_layout.tsx`.
  - O plugin `expo-navigation-bar` está com `enforceContrast: false`, o que tira a película clara que o Android põe atrás dos botões. Assim a barra fica transparente e mostra a cor da barra de abas.
  - Essa opção só vale no APK ou num development build. No Expo Go a película continua.

**Ícone.** O ícone do app vem de `design/icon-dark.png` (gatos e "Meowfit" no círculo roxo escuro).
- O Android não troca o ícone do app conforme o tema claro ou escuro (esse recurso só existe no iOS). Por isso o app usa só a versão escura. A versão clara fica guardada em `design/icon-light.png`.
- `assets/icon.png` (1024 px) e `assets/favicon.png` (48 px) são a arte inteira.
- No ícone adaptativo do Android:
  - **Primeiro plano** (`android-icon-foreground.png`): a arte em 80% do tamanho. Assim, em máscaras redondas a borda do círculo fica escondida e aparecem os gatos e o nome.
  - **Fundo** (`android-icon-background.png` e `adaptiveIcon.backgroundColor`): `#170A2B`, o mesmo tom escuro do fundo da arte.

**Notificações** (plugin `expo-notifications` no `app.json`):
- **Ícone pequeno** (`assets/notification-icon.png`): uma patinha branca em fundo transparente (96 px). O Android pinta esse ícone como silhueta, então ele não pode ser colorido. A cor de destaque é `#7044B8`.
- **Ícone grande** (`assets/notification-large.png`): a arte colorida de `design/notification-large.png`, recortada em quadrado com cantos arredondados para tirar o halo da borda (512 px). Aparece à direita do texto de todas as notificações, aplicado pela própria biblioteca.
- **Canais:** `water_alerts` (água) e `rest` (fim do descanso) têm importância alta, para aparecer como balão no topo da tela.
  - O Android não deixa mudar a importância de um canal já criado. Para mudar, crie um canal com outro id e coloque o antigo em `LEGACY_CHANNELS` (`src/lib/notifications.ts`), que é apagado ao abrir o app. Foi o que aconteceu com o `water`, que era de importância padrão.
  - Em alguns celulares (Xiaomi/HyperOS, por exemplo), o balão também depende de ativar "Notificações flutuantes" para o app nas configurações do Android.

- A splash (tela de abertura) usa `assets/splash-icon.png`, gerada de `design/splash.png`: o círculo recortado, com os cantos transparentes. O fundo é `#F6F1FB` no tema claro do celular e `#16121E` no escuro, as mesmas cores de fundo dos temas Lilás e Escuro.

**Cabeçalho da tela Hoje** (`src/components/HeaderBanner.tsx`):
- **Arte:** uma por tema, as duas com 1500 × 501.
  - `assets/header.jpg`, gerada de `design/header-light.png` (tema Lilás).
  - `assets/header-dark.jpg`, gerada de `design/header-dark.png` (tema Escuro).
  - As duas têm a mesma composição, então o texto fica no mesmo lugar.
- **Texto:** "Olá, {nome}!" e a data de hoje são escritos por cima, no espaço livre à direita dos gatos (36% a 96% da largura). A fonte diminui sozinha para nomes longos.
- **Barra de navegação:** a aba Hoje não tem barra. O cabeçalho vai até o topo da tela, com 24 pontos de espaço abaixo da barra de status, preenchidos com a cor do topo da arte (`#EFDFFC` no claro, `#1D1429` no escuro).
- **Tema:** as cores do texto ficam em `VARIANTS` (`HeaderBanner.tsx`): roxo escuro sobre a arte clara e lilás quase branco sobre a escura.
- Para trocar a arte, gere os arquivos de novo com o mesmo recorte (placa de x=106, y=94, 1034 px).

## 6. Banco de dados

O arquivo é `sculpt.db`. O nome vem da primeira versão do app e não foi trocado para não perder os dados de quem já usa. As migrações ficam no array `MIGRATIONS` em `src/db/schema.ts`, e a versão aplicada fica em `PRAGMA user_version`.

| Tabela | Chave | Conteúdo |
|---|---|---|
| `profiles` | `id` | nome, altura e `plan_json` (o plano inteiro) |
| `settings` | `key` | `active_profile` |
| `set_logs` | perfil, exercício, data, série | carga (`weight`) e repetições (`reps`) |
| `exercise_done` | perfil, data, exercício | exercício marcado como feito |
| `workout_done` | perfil, data | treino concluído no dia (`label`, `title`) |
| `habit_checks` | perfil, semana, hábito | hábito marcado na semana |
| `meal_logs` | perfil, data, refeição | opção escolhida (`-1` = "outra coisa") e `note`, o texto livre do que foi comido fora do plano (migração 2) |
| `water_logs` | perfil, data | ml de água |
| `measurements` | `id` | data, peso e cintura |

Decisões importantes:

- O histórico usa o **nome normalizado** do exercício como chave (`exKey`: minúsculas e sem acento), não um id. Assim as cargas continuam ligadas ao exercício quando o plano é trocado ou editado.
- Hábitos e refeições são guardados pelo **texto** e pelo **nome**, não pela posição. Reordenar o plano não mistura os registros.
- As datas ficam como texto local `yyyy-MM-dd`. A semana é identificada pela data da segunda-feira (`weekStartKey`).
- `PROFILE_TABLES` lista as tabelas que têm dados por perfil. O backup e a exclusão de perfil percorrem essa lista, então **uma tabela nova com dados de perfil precisa ser incluída nela**.

## 7. Modelo do plano

Definido em `src/lib/types.ts`.

```ts
Plan = {
  version: 1,
  name: string,
  days: WorkoutDay[],
  habits: string[],
  meals: { name, options: string[] }[],
  rules: string[],
  targets: { kcalMin?, kcalMax?, proteinMin?, proteinMax?, waterL? }
}

WorkoutDay = {
  label: "Segunda" | "Treino A" | ...,
  weekday: 0..6 | null,
  title: string,
  exercises: Exercise[]
}

Exercise = {
  id, name,
  sets?: number,
  reps?: string,
  load?: boolean,
  note?: string
}
```

- `weekday` segue o padrão do JavaScript: 0 é domingo e 6 é sábado. `null` indica treino em rodízio (Treino A, B, C).
- `reps` é texto livre, como `"12"`, `"30 s"` ou `"10 cada perna"`.
- `load: true` mostra o campo de carga em kg. Ele é ativado quando a linha do treino tem "carga ___ kg".
- Um item sem `sets` (aquecimento, esteira) só pode ser marcado como feito. O texto dele fica em `note`.

## 8. Formato de texto para importação

O plano tem duas partes, e cada uma é importada e editada separadamente:

| Parte | Seções do plano | Onde importar |
|---|---|---|
| **Treino** | `days`, `habits` | Perfil → Treino, aba Treino |
| **Dieta** | `meals`, `targets`, `rules` | Perfil → Dieta, aba Dieta |

Importar uma parte nunca altera a outra. A relação entre parte e seções fica em `PART_SECTIONS` (`src/lib/planText.ts`).

O parser é `parsePlanText(text, nome, parte)`. A função inversa, `planToText(plan, parte)`, gera o texto usado em "Editar".

**Treino:**

```
Segunda: inferiores (quadríceps)
Aquecimento: 5-10 min de esteira ou bicicleta
Leg press: 3 x 12, carga ___ kg
Afundo: 3 x 10 cada perna, carga ___ kg
Prancha: 3 x 30 s

Treino B: superiores
Supino 4x10

Hábitos:
Dormi 7 h ou mais
```

**Dieta** (na importação de dieta, o texto já começa na seção de refeições, então o cabeçalho `Refeições:` é opcional):

```
7:30, café da manhã
Opção 1: 2 ovos e pão integral
Opção 2: iogurte com aveia

Almoço: frango e arroz | peixe e batata

kcal: 1600-1750
proteína: 100-110
água: 2.5

Regras:
Proteína em toda refeição
```

Regras de leitura:

- **Cabeçalho de dia:** `Segunda`, `Segunda-feira`, `Terça: título`, `Sábado e domingo`, ou `Treino A` / `Dia 1` para rodízio. A acentuação e as maiúsculas não importam.
- **Exercício:** `Nome: S x R[, resto]`. O separador pode ser `x`, `X` ou `×`. Também funciona sem dois-pontos, como em `Leg press 3x12`. Se o resto tiver "carga" ou "kg", o exercício passa a ter campo de carga.
- **Item simples:** `Nome: texto` sem séries vira um item com `note`.
- **Marcadores ignorados:** `-`, `*`, `•`, `1.`, `[ ]`, `[x]`, `☐`, `☑` e `✓` no início da linha.
- **Seções:** `Hábitos`, `Refeições` (ou `Dieta`/`Cardápio`), `Metas`, `Regras` (ou `Dicas`) e `Treinos`. Um cabeçalho de dia sempre volta para a seção de treinos.
- **Refeição em várias linhas:** o nome fica numa linha e cada opção numa linha `Opção N: …` logo abaixo. Uma refeição sem nenhuma opção (por exemplo, `9:00 a 10:00, treino`) fica de fora e aparece nos avisos.
- **Horário da refeição:** um horário no começo da linha (`7:30, café da manhã`, `12:30 a 13:00, almoço`, `19h30 - 20h, jantar`) vai para `Meal.time` e aparece acima do nome na aba Dieta. O nome é salvo com a primeira letra maiúscula, e o ponto final das opções é removido.
- **Metas dentro das refeições:** linhas começando com `kcal:`, `calorias:`, `proteína:` ou `água:` viram metas mesmo sem o cabeçalho `Metas:`.
- Um exercício que aparece antes de qualquer dia é ignorado e listado em `warnings` com o número da linha.
- Dias sem exercícios são descartados.

**O que é substituído:**

- **Importar:** troca só as seções da parte escolhida que **apareceram** no texto (`foundIn` + `pickSections`). Se o texto de treino não tiver `Hábitos:`, os hábitos atuais continuam.
- **Editar:** troca todas as seções da parte. Apagar os hábitos no texto apaga os hábitos do perfil.
- **Seções da outra parte:** se o texto tiver seções da outra parte (por exemplo, refeições coladas na importação de treino), elas são ignoradas e a tela avisa (`ignoredIn`).

## 9. Arquivos JSON: plano e backup

O código fica em `src/lib/backup.ts`.

**Treino ou dieta** ("Compartilhar" no card de Treino ou de Dieta, no Perfil):

```json
{ "app": "meowfit", "type": "plan", "version": 1, "part": "dieta", "plan": { ... } }
```

O `plan` leva só as seções daquela parte; as outras vão vazias. Abrir um arquivo de dieta na importação de treino (ou o contrário) mostra um aviso, e o arquivo não é aplicado.

**Backup completo** ("Exportar backup completo"):

```json
{
  "app": "meowfit", "type": "backup", "version": 1,
  "exportedAt": "2026-11-07T19:00:00.000Z",
  "profile": { "name": "Luiza", "height_cm": 160 },
  "plan": { ... },
  "data": { "set_logs": [...], "measurements": [...], ... }
}
```

Na importação:

- Um objeto `Plan` "puro", com `days` na raiz, também é aceito. Arquivos sem `part` servem para as duas importações, e cada uma pega só as suas seções.
- `validatePlan` trata o arquivo como não confiável: descarta campos com tipo errado e exercícios sem nome, e dá erro se não existir `days`.
- Um backup sempre é restaurado como **novo perfil** (`restoreBackup`), dentro de uma transação. Só as colunas da lista `COLUMNS` são inseridas, o que impede que um JSON editado à mão grave colunas arbitrárias.

## 10. Regras de negócio

- **Treino de hoje** (`pickToday`): primeiro procura o dia com o `weekday` de hoje. Se não houver, e o plano tiver treinos em rodízio, pega o treino seguinte ao último concluído. Se nenhum dos dois casos se aplicar, é dia de descanso.
- **Conclusão do treino:** concluir o treino grava `workout_done` para a data, e isso marca o treino no checklist semanal. Um exercício com carga é marcado como feito automaticamente quando todas as séries têm peso.
- **Carga anterior:** é a última data **anterior a hoje** em que o exercício teve carga anotada (`getPreviousSets`). Ela aparece como placeholder e pode ser copiada pelo botão "Repetir".
- **Checklist semanal:** a semana vai de segunda a domingo. Nenhum registro é apagado; uma semana nova simplesmente começa vazia.
- **Adesão à dieta** (`src/lib/diet.ts`): refeições no plano (opção ≥ 0) divididas pelas refeições **esperadas** até agora. O card da aba Dieta mostra o dia (`dailyAdherence`) e, numa linha menor, a semana (`weeklyAdherence`).
  - Dias anteriores da semana contam todas as refeições, mas só a partir do primeiro registro de refeição do perfil.
  - No dia de hoje, conta cada refeição cujo horário de início já passou ou que já foi marcada.
  - Uma refeição sem horário só conta hoje depois de ser marcada.
  - A barra fica verde a partir de 80%.
- **Água:** o total do dia nunca fica negativo.
- **Timer de descanso** (`src/components/RestTimer.tsx`): começa sozinho quando as **repetições** de uma série são anotadas, porque é isso que indica que a série acabou. Anotar só a carga não dispara o timer, e se ele já estiver contando não reinicia. Usar "Repetir" ou a sugestão de carga também não dispara.
  - A duração (60 s, 90 s ou 2 min) fica salva em `settings` com a chave `rest`.
  - O timer guarda a hora de término, então continua certo se o app for para segundo plano. Ao terminar, o celular vibra e aparece um aviso no centro da tela (`RestFinished`), nas cores do tema e com o botão "Bora!". O aviso fecha sozinho em 5 s, ao tocar no botão ou ao tocar fora. Com o app fechado ou a tela bloqueada, chega uma notificação.
  - O exercício é marcado como feito quando as repetições da **última série** são anotadas. Também dá pra marcar tocando no número do exercício.
- **Regra das duas faltas** (`missedStreak` em `src/lib/workout.ts`):
  - Dias de treino são os dias da semana do plano. Em planos de rodízio, são de segunda a sexta. **Sábado e domingo nunca contam como falta.**
  - O app conta os dias de treino seguidos, até ontem, sem treino concluído. Qualquer treino concluído, inclusive no fim de semana, zera a contagem.
  - Só entram dias a partir do primeiro treino concluído do perfil.
  - O aviso aparece no "Hoje" quando hoje é dia de treino e o treino ainda não foi feito.
- **Sugestão de subir carga** (`suggestIncrease` em `src/lib/progression.ts`):
  - Aparece quando, nos 2 últimos treinos do exercício, todas as séries tiveram a **mesma carga** e pelo menos as repetições pedidas. Repetição em branco conta como cumprida.
  - O aumento sugerido é +1 kg para cargas abaixo de 10 kg e +2,5 kg para as demais.
  - Some quando você digita uma carga no dia ou quando o exercício já está feito.
- **Troca de treino** (`shouldSuggestChange`): avisa no "Hoje" com 8 semanas desde `plan.treinoSince`.
  - `treinoSince` é gravado ao importar treino, usar o treino de exemplo ou criar um perfil. Editar como texto não muda a data.
  - Em perfis antigos, sem `treinoSince`, conta a partir do primeiro treino concluído.
  - "Lembrar em 2 semanas" grava `treinoSnooze`. "Já troquei" reinicia a contagem.
- **Lembretes de água** (`src/lib/water.ts` e `src/lib/notifications.ts`): configurados pelo sino do card de Água, por perfil (`settings`, chave `water_reminder:<id>`), com intervalo e janela de horário.
  - O app agenda notificações locais para os próximos 7 dias e reagenda a cada copo registrado e sempre que é aberto.
  - No dia em que a meta é batida, os lembretes daquele dia são cancelados.
  - Se o app ficar mais de 7 dias sem ser aberto, os lembretes param até a próxima abertura.
- **Medidas:** o app avisa quando a última medida tem 14 dias ou mais.
- **IMC** (`src/lib/bmi.ts` e `src/components/BmiCard.tsx`): usa o peso mais recente e a altura do perfil. A classificação segue a OMS:

  | IMC | Classificação |
  |---|---|
  | até 18,4 | Abaixo do peso |
  | 18,5 a 24,9 | Peso normal |
  | 25 a 29,9 | Sobrepeso |
  | 30 a 34,9 | Obesidade grau I |
  | 35 a 39,9 | Obesidade grau II |
  | 40 ou mais | Obesidade grau III |

  O card também mostra a faixa de peso saudável para a altura (IMC 18,5 a 24,9) e quantos kg faltam para entrar nela.

## 11. Desenvolvimento e testes

```bash
npm install
npx expo start          # ler o QR code com o Expo Go no celular
npm test                # jest
npm run typecheck       # tsc --noEmit
npx expo-doctor         # verifica dependências e configuração
```

Para instalar dependências, use sempre `npx expo install <pacote>`. Esse comando escolhe a versão compatível com o SDK.

Testes:

| Arquivo | Cobre |
|---|---|
| `src/lib/__tests__/planText.test.ts` | parser com o plano do PDF, formatos flexíveis, importação separada de treino e dieta, arquivos por parte e ida e volta texto → plano → texto |
| `src/lib/__tests__/workout.test.ts` | escolha do treino do dia (semana e rodízio) |
| `src/db/__tests__/queries.test.ts` | migrações, consultas, backup/restauração e exclusão contra um SQLite real (`node:sqlite`, Node 22.13+) |

O teste do banco usa um adaptador que imita a API assíncrona do expo-sqlite em cima do `node:sqlite`. Com isso, o SQL de verdade é executado sem precisar de emulador.

## 12. Gerar e instalar o APK

A configuração fica em `eas.json`: o perfil `preview` gera um `.apk` com `distribution: internal`. O pacote Android se chama `com.luiza.meowfit` (`app.json`).

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

1. Na primeira vez, aceite criar o projeto no EAS e deixe ele gerar a keystore.
2. Quando o build terminar, abra o link ou leia o QR code no celular e baixe o `.apk`.
3. Permita "instalar apps desconhecidos" e instale.

Para atualizar o app, gere um novo build com a mesma conta. Ele instala por cima e mantém os dados. Antes de publicar uma nova versão, aumente `version` em `app.json`.

## 13. Como estender

- **Nova tela:** crie um arquivo em `src/app`. Se ela não for uma aba, registre o título no `Stack` de `src/app/_layout.tsx`.
- **Nova tabela:** adicione uma **nova string** ao fim de `MIGRATIONS`, sem editar as migrações antigas. Se a tabela tiver dados por perfil, inclua ela em `PROFILE_TABLES` e em `COLUMNS` (`backup.ts`).
- **Novo campo no plano:** atualize `types.ts`, `validatePlan` (`backup.ts`), `parsePlanText`, `planToText`, `Section` e `PART_SECTIONS` (`planText.ts`), e acrescente um caso ao teste de ida e volta.
- **Biblioteca com código nativo:** instale com `npx expo install`. Se ela não vier no Expo Go, vai ser preciso usar um development build (`eas build --profile development`) para testar.

## 14. Widgets Android

Três widgets de tela inicial, feitos com [react-native-android-widget](https://saleksovski.github.io/react-native-android-widget):

| Widget | Nome interno | Tamanho | Mostra | Toque |
|---|---|---|---|---|
| MeowFit · Hoje | `Today` | 4×2 | Data, treino do dia com barra de progresso, água e refeições no plano | Abre a sessão de treino do dia (ou o app, no descanso) |
| MeowFit · Semana | `Week` | 4×1 | S T Q Q S S D com os dias treinados, contador de treinos e aviso da regra das duas faltas | Abre a aba Progresso |
| MeowFit · Água | `Water` | 2×1 | Água do dia e botão **+250** | O botão registra a água sem abrir o app. O resto abre o app |

**Arquivos** (`src/widgets/`):
- `data.ts`: `loadWidgetData(db)` lê o banco e monta os números, com as mesmas regras do app (`pickToday`, `missedStreak`, refeições no plano). Não depende da biblioteca e é testado com SQLite real.
- `components.tsx`: o visual, com `FlexWidget` e `TextWidget`. As cores vêm das paletas `lilac` e `dark`.
- `render.tsx`: escolhe a paleta pelo tema do app. No modo `sistema`, entrega as duas versões e o Android escolhe. Também atualiza os widgets (`updateAllWidgets`).
- `handler.tsx`: chamado pelo Android quando um widget é adicionado, atualizado ou tocado. Trata o `ADD_WATER`.
- `index.ts`: ponto de entrada seguro (`registerWidgets` e `refreshWidgets`).

**Como os dados ficam em dia:**
- No app, o `Gate` (`src/app/_layout.tsx`) chama `refreshWidgets` 0,8 s depois de qualquer escrita no banco (`rev`), de trocar de perfil ou de mudar o tema.
- Fora do app, o Android pede atualização a cada 30 min (`updatePeriodMillis`), o que cobre a virada do dia.
- O handler roda sem o app aberto e abre o banco por conta própria (`widgetDb`).

**Expo Go:** a biblioteca carrega o módulo nativo assim que é importada, e esse módulo não existe no Expo Go. Por isso ela só é carregada com `require` dentro de funções protegidas por `widgetsAvailable` (Android e fora do Expo Go). No Expo Go os widgets simplesmente não existem e o app funciona normal.

**Testar:** widgets precisam de build nativo.
1. `npx eas-cli@latest build -p android --profile development`, uma vez, e instale o APK "MeowFit" gerado.
2. `npx expo start --dev-client` e abra o app pelo APK instalado. Mudanças no app aparecem na hora.
3. Segure na tela inicial → Widgets → MeowFit.
4. Mudanças no visual dos widgets ou no `app.json` pedem um build novo.

O tamanho e o nome de cada widget ficam no plugin `react-native-android-widget` do `app.json`. A entrada do app é `index.ts` (campo `main` do `package.json`), que carrega o `expo-router/entry` e registra os widgets.

## 15. Versão web (PWA para iPhone)

Como instalar um app no iPhone sem a conta paga da Apple não é possível, o app também roda como **PWA**: um site que o Safari instala na tela inicial ("Compartilhar → Adicionar à Tela de Início"), com ícone, nome e tela cheia.

**Configuração:**
- `app.json`:
  - `web.output` é `server`. Assim o servidor resolve rotas com parâmetro (`/workout/0`, `/exercise/…`) quando a página é aberta ou recarregada direto nelas.
  - O plugin `expo-router` envia os cabeçalhos `Cross-Origin-Embedder-Policy: credentialless` e `Cross-Origin-Opener-Policy: same-origin`, exigidos pelo banco (expo-sqlite) na web.
- `metro.config.js`: aceita arquivos `.wasm` (o SQLite da web) e envia os mesmos cabeçalhos no servidor de desenvolvimento.
- `src/app/+html.tsx`: página base usada só na web. Segue o template do SDK 58: precisa de `useServerDocumentContext()` com `{headNodes}` e `{bodyNodes}`, senão os scripts do app não são injetados e a página fica em branco. Também traz as meta tags do iPhone (tela cheia, título, `apple-touch-icon`), a cor da barra por tema, o bloqueio do zoom automático em campos e a cor de fundo inicial.
- `public/`: `manifest.json` e os ícones `icon-192.png`, `icon-512.png` e `apple-touch-icon.png`, gerados de `design/icon-dark.png`.

**Diferenças em relação ao app Android** (sempre com `Platform.OS === 'web'`; no celular nada muda):

| Recurso | Na web |
|---|---|
| Alertas e confirmações | `src/lib/alert.ts` usa `window.confirm`/`window.alert`, porque o `Alert` do React Native não aparece na web |
| Salvar ao sair do campo | `onBlur` além de `onEndEditing` (séries e texto da refeição), só na web |
| Exportar backup ou plano | Compartilhamento do sistema (`navigator.share`) ou download do arquivo (`src/lib/files.ts`) |
| Importar arquivo | Lido direto do arquivo escolhido no navegador |
| Notificações (água e descanso) | Desligadas (`notificationsAvailable`) e o sino do card de Água fica oculto |
| Widgets e barra de navegação | Não existem |
| Banco | expo-sqlite com WebAssembly e o armazenamento do navegador. O app pede armazenamento persistente (`navigator.storage.persist`). Os dados ficam só naquele navegador ou PWA, separados do app Android |

Os campos de texto em linha precisam de `minWidth: 0`. No navegador, sem isso, eles não encolhem e empurram a tela para os lados.

**Publicar** (Expo Hosting, plano gratuito: 100 mil acessos por mês):

```bash
npx expo export -p web
npx eas-cli@latest deploy --prod
```

Testar localmente: `npx expo export -p web` e depois `npx expo serve`.
