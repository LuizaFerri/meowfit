# Documentação do MeowFit

MeowFit é um app Android, feito com React Native e Expo, para acompanhar treino, cargas, dieta e medidas. Ele não tem servidor: cada celular guarda os próprios dados num banco SQLite local. Cada pessoa usa o app no próprio celular, com um perfil só. O banco ainda aceita vários perfis (versões antigas permitiam criar mais de um); nesse caso, a aba Perfil mostra a troca entre eles, e só nesse caso.

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
16. [Nuvem (Supabase)](#16-nuvem-supabase)

---

## 1. Visão geral das telas

| Tela | Rota | O que faz |
|---|---|---|
| Hoje | `/` | Sequência de treinos (foguinho), treino do dia, bolinhas da semana (tocar num dia abre o treino dele: o treino feito naquele dia, o treino de hoje ou o do dia da semana no plano. Dias que já passaram abrem só para ver; dias futuros abrem para treinar hoje. Dias de descanso não são clicáveis e têm o número mais claro), água, refeições e aviso de medidas atrasadas |
| Treino | `/workout` | Lista os dias do plano, a evolução das cargas e os últimos treinos |
| Sessão de treino | `/workout/[day]` | Marca exercícios e anota carga e repetições de cada série. Grava sempre na data de hoje. Com `?data=yyyy-MM-dd` (uma data passada, usada ao tocar num dia anterior da semana no "Hoje"), abre aquele dia **só para ver**: campos travados, sem "Concluir treino", sem timer de descanso e sem sugestão de carga, com o aviso de cadeado. Como no Duolingo, não dá para marcar treino para trás. Datas futuras ou inválidas são ignoradas (abre hoje) |
| Evolução | `/exercise/[name]` | Gráfico da carga máxima por treino, com início, atual e recorde |
| Dieta | `/diet` | Metas, água, escolha da opção em cada refeição e adesão da semana. Uma opção com vários alimentos aparece como lista (nome em negrito e quantidade ao lado), e, se for a única opção, o botão vira "Segui o cardápio" |
| Histórico da dieta | `/diet-history` | Um cartão por dia com cada refeição: opção do plano, o que foi comido fora do plano ou "Não registrado", além da adesão e da água do dia. Mostra 30 dias por vez (`buildDietHistory` em `src/lib/diet.ts`) |
| Progresso | `/progress` | Checklist semanal de treinos e hábitos e o card do IMC (sem peso registrado, ele pede o peso e leva ao Perfil) |
| Perfil | `/profile` | "Dados" (`ProfileInfoCard`): nome, altura, peso e cintura. "Editar" abre os quatro campos; ao salvar, se a pessoa mexeu no peso ou na cintura (mesmo repetindo o valor anterior), vira o registro de hoje (se já existe um hoje, ele é atualizado; regra em `measurementToSave`, `src/lib/measures.ts`). Salvar só nome ou altura não cria medida. O teclado fecha. Abaixo, o histórico (`MeasuresSection`): gráficos de peso e cintura e a lista de registros, cada um com botões de editar (os campos abrem na própria linha) e apagar. Depois, meta de água (`WaterGoalCard`: 1,5 a 4 L ou outro valor), treino e dieta ("Editar", "Colar texto", "Enviar"), tema, lembrete de treino (`WorkoutReminderCard`, só no Android), backup, "Zerar treinos e sequência" (`resetWorkoutHistory`: apaga `workout_done`, `exercise_done` e `set_logs`, ou seja, sequência, recorde, treinos concluídos e cargas; plano, dieta, água, refeições, hábitos e medidas continuam) e "Apagar meus dados" (volta para as boas-vindas) |
| Nuvem | `/cloud-login` | Login sem senha (e-mail → código de 6 dígitos) e ligação do aparelho com a conta; veja a seção 16 |
| Boas-vindas | `/new-profile` | Aparece quando não há perfil. Se já existe um perfil, a rota redireciona para `/` (por exemplo, um ícone da Tela de Início criado durante o cadastro), e criar ou restaurar confere no banco antes (`listProfiles`), então nunca nasce um segundo perfil. Abre numa tela de apresentação (`Welcome`: logo `logo-lilas` ou `logo-dark` conforme o tema, num círculo `#7E1DBE` igual nos dois temas; o que ele faz, "Criar meu cadastro" e "Entrar com meu e-mail"; restaurar um arquivo de backup aparece depois do login, quando a conta ainda não tem dados na nuvem) e depois segue o cadastro em 3 etapas: você (nome, altura e peso), treino e dieta. Nas duas últimas, a pessoa escolhe entre "Item por item" (formulário) e "Colar texto", e pode pular. Também restaura um backup |
| Editar plano | `/edit-plan` | `?parte=treino` ou `?parte=dieta` edita a parte com o `PartEditor`: "Item por item" ou "Colar texto". O botão "Salvar treino"/"Salvar dieta" fica fixo no rodapé, sempre visível. `&modo=texto` abre direto no texto, e `&novo=1` (aviso de troca de treino) grava `treinoSince` ao salvar |
| Importar | `/import` | `?parte=treino` ou `?parte=dieta` importa só aquela parte, por texto ou arquivo. Somando `&modo=editar`, edita a parte como texto. Com `?modo=arquivo`, restaura um backup no lugar dos dados atuais. Abrir um arquivo de treino ou dieta recebido também passa por aqui |

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
| Notificações | expo-notifications (só locais: água, treino e fim do descanso) |
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
    new-profile.tsx       cadastro em etapas e boas-vindas
    edit-plan.tsx         edição de treino ou dieta por formulário
  components/             UI reutilizável (ui.tsx, theme.ts, ThemeProvider, LineChart, WaterCard, RestTimer, BmiCard, PartEditor, WorkoutEditor, DietEditor)
  data/examplePlan.ts     plano de exemplo genérico (3 dias, 4 refeições), escrito no formato de texto
  db/schema.ts            tabelas e migrações
  db/queries.ts           todas as consultas SQL
  lib/                    lógica pura: parser de texto, formulário do plano (planForm), backup, datas, tipos, treino do dia
  test/                   utilitários de teste: banco em memória e o plano completo usado nos testes (fullPlan)
  store/useApp.ts         estado global e hooks de dados
```

Só o que fica em `src/app` vira rota. Componentes, hooks e utilitários ficam fora dessa pasta. Os nomes de arquivo e de rota são em inglês; os textos que aparecem para a pessoa usuária são em português.

A pasta `design/` guarda as artes originais em alta resolução (`logo-dark.png`, `logo-lilas.png`, `header-light.png`, `header-dark.png`, `notification-bell.png`, `welcome-logo.png` e `splash-cats.gif`). As artes antigas foram removidas e continuam só no histórico do git. O app não usa essas imagens direto: as versões otimizadas ficam em `assets/`.

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
- `ThemeProvider` (`src/components/ThemeProvider.tsx`) escolhe a paleta pelo modo salvo em `settings` (chave `theme`): `lilas`, `escuro` ou `sistema`, que segue o celular. Quem nunca escolheu fica no `lilas` (`DEFAULT_THEME_MODE` em `theme.ts`), mesmo com o celular no modo escuro.
- Os componentes leem a paleta com `const { colors, s } = useTheme()`. `s` são os estilos base (`src/components/styles.ts`), gerados uma vez por paleta.
- Estilos que dependem de cor e ficam fora de um componente são funções que recebem a paleta, por exemplo `sessionStyles(colors)`.
- **Janelas de aviso e confirmação** (`src/components/DialogHost.tsx`): todo `Alert.alert` de `@/lib/alert` abre esta janela, com fundo escurecido, cartão na cor `card` e ícone no topo (pata para avisos, interrogação para perguntas, alerta para ações destrutivas). Botões: cancelar com contorno, ação principal em `primary`, ação destrutiva em `danger`. Com dois botões eles ficam lado a lado; com mais, um embaixo do outro. Tocar fora ou no voltar do Android equivale a cancelar.
- Todas as combinações de texto e fundo foram conferidas com contraste mínimo de 4,5:1 (WCAG AA) nos dois temas.
- O tema é escolhido no card **Aparência** do Perfil.
- **Barras do sistema:**
  - A barra de status e a barra de navegação do Android (os 3 botões) seguem o tema, pelo `ThemedStatusBar` em `src/app/_layout.tsx`.
  - O plugin `expo-navigation-bar` está com `enforceContrast: false`, o que tira a película clara que o Android põe atrás dos botões. Assim a barra fica transparente e mostra a cor da barra de abas.
  - Essa opção só vale no APK ou num development build. No Expo Go a película continua.

**Ícone.** O ícone do app vem de `design/logo-icon.png` (1254 px): os dois gatos correndo, o haltere, "Meowfit" e a patinha num fundo quadrado escuro liso (`#10021D`), sem o anel em volta. O logo antigo, com anel (`logo-dark`), ficava com o anel cortado na máscara redonda do celular.
- O Android não troca o ícone do app conforme o tema claro ou escuro (esse recurso só existe no iOS). Por isso o ícone tem uma versão só. Os logos redondos (`logo-lilas` e `logo-dark`) continuam nas boas-vindas.
- `assets/icon.png` (1024 px), `assets/favicon.png` (48 px) e os ícones da PWA em `public/` são a arte inteira.
- `assets/logo-dark.png` e `assets/logo-lilas.png` (768 px) são o círculo recortado, com os cantos transparentes. Usados na tela de boas-vindas.
- No ícone adaptativo do Android:
  - **Primeiro plano** (`android-icon-foreground.png`): a arte em 730 de 1024 px, centralizada sobre o fundo `#10021D`. O conteúdo da arte vai até 561 px do centro (de 1254), então nessa escala cabe inteiro no círculo da máscara (que mostra só os 66% do centro), do haltere à patinha.
  - **Fundo** (`android-icon-background.png` e `adaptiveIcon.backgroundColor`): `#10021D`, a mesma cor do fundo da arte, então não aparece emenda.

**Notificações** (plugin `expo-notifications` no `app.json`):
- **Ícone pequeno** (`assets/notification-icon.png`): uma patinha branca em fundo transparente (96 px). O Android pinta esse ícone como silhueta, então ele não pode ser colorido. A cor de destaque é `#7044B8`.
- **Sem ícone grande:** o Xiaomi/HyperOS já mostra o ícone do app à esquerda, e o ícone grande ficava repetido à direita, sempre alinhado ao topo (o Android não deixa centralizar sem layout próprio). Por isso o `largeIcon` saiu do plugin. A arte do sino (`design/notification-bell.png`) está guardada, mas ainda não é usada.
- **Alarme exato:** o `app.json` declara `USE_EXACT_ALARM` (concedida automaticamente no Android 13+, permitida porque o app não está na Play Store) e `SCHEDULE_EXACT_ALARM` (versões anteriores). Sem elas, o `expo-notifications` agenda com `setAndAllowWhileIdle` (inexato), que o Android e principalmente o MIUI adiam ou descartam com o app fechado. O modo `delivery: 'alarmClock'` não é usado: ele deixa um ícone de alarme fixo na barra de status.
- **Canais:** `water_alerts` (água), `workout_alerts` (lembrete de treino) e `rest` (fim do descanso) têm importância alta, para aparecer como balão no topo da tela.
  - O Android não deixa mudar a importância de um canal já criado. Para mudar, crie um canal com outro id e coloque o antigo em `LEGACY_CHANNELS` (`src/lib/notifications.ts`), que é apagado ao abrir o app. Foi o que aconteceu com o `water`, que era de importância padrão.
  - Em alguns celulares (Xiaomi/HyperOS, por exemplo), o balão também depende de ativar "Notificações flutuantes" para o app nas configurações do Android.

**Abertura do app** (duas partes):
- **Splash nativa** (plugin `expo-splash-screen`): só o fundo `#EFDFFC`, com uma imagem transparente (`assets/splash-blank.png`), inclusive no modo escuro do celular. No Android 12 ou mais novo, o sistema recorta a imagem da splash num círculo, então o logo aparecia cortado e depois "pulava" para a animação. Com o fundo liso, a passagem para a animação fica limpa. Ela só aparece no APK (o Expo Go mostra o ícone).
- **Splash animada** (`src/components/AnimatedSplash.tsx`): logo depois, uma camada por cima do app mostra os gatos se alongando, com "Alongando as patinhas…" embaixo. A animação veio de um GIF de lottie.host (guardado em `design/splash-cats.gif`: 6 quadros de 508 px, 0,33 s cada, com uma faixa ondulada de borda reta embaixo e o logo "Meowfit" no último quadro). Os quadros foram extraídos para `assets/splash/frame0.png` … `frame5.png`, com a faixa repintada na cor do fundo. O app empilha os 6 quadros (até 320 px, largura da tela menos 32 nos celulares menores) e cada um aparece por cima do anterior: 0,22 s parado + 0,15 s de transição por quadro. A sequência toca uma vez e para no logo por 0,6 s (cerca de 2,9 s no total). Por isso não há um texto "MeowFit" separado. O fundo é sempre `#EFDFFC`, a mesma cor dos quadros, em qualquer tema. A `_layout.tsx` chama `SplashScreen.preventAutoHideAsync()`, e a nativa só some quando o primeiro quadro carrega (ou depois de 0,6 s). Quando a sequência acaba e o perfil já carregou, a camada some com fade de 0,38 s. A camada usa `needsOffscreenAlphaCompositing` e `renderToHardwareTextureAndroid`: sem isso, no Android cada quadro empilhado fica transparente separadamente, e somados ficam mais opacos que o fundo, formando um quadrado visível durante o fade.

**Cabeçalho da tela Hoje** (`src/components/HeaderBanner.tsx`):
- **Arte:** uma por tema, as duas com 1500 × 500 (proporção 3:1).
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
08:30 Café da manhã
Omelete: 2 ovos (100 g) + 1 fatia de muçarela (20 g)
Mamão: 1 fatia média (170 g)

12:30 Almoço
Arroz branco cozido: 2 colheres de sopa cheias (50 g)
Batata inglesa cozida: 3 colheres de servir rasas (120 g)

16:00 Lanche
Opção 1: iogurte com aveia
Opção 2: 1 banana com pasta de amendoim

Jantar: frango e arroz | peixe e batata

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
- **Cardápio (formato do nutricionista):** numa linha o horário e o nome da refeição (`08:30 Café da manhã`) e, embaixo, um alimento por linha com a quantidade (`Batata inglesa cozida: 3 colheres de servir rasas (120 g)`). Os alimentos ficam juntos numa única opção, um por linha (separados por `\n` no texto da opção). Linhas em branco entre o cabeçalho e os alimentos são aceitas.
  - **Onde começa uma refeição** (`startsMeal` em `src/lib/planText.ts`): linha com horário no começo (`08:30 …`, `12:30, almoço`) ou no fim (`Pré-treino (17:30)`, `Pós-treino - 19h`); linha cujo nome é de refeição (`isMealName`: café da manhã/tarde/noite, "café" sozinho, desjejum, colação, almoço, lanche, merenda, jantar, janta, ceia, pré-treino, pós-treino, refeição, brunch); ou linha sem `:` logo depois de uma linha em branco. Qualquer outra linha debaixo de uma refeição aberta é um alimento. "Café coado: 1 xícara" é alimento, porque só "café" sozinho ou "café da …" contam como refeição.
  - **Alternativas:** `Opção N: …` abre uma opção nova; linhas de alimento depois dela entram nessa opção. Refeições numa linha só (`Almoço: frango | peixe`) continuam funcionando e não abrem lista.
  - **Volta para texto** (`planToText`): se alguma refeição tiver lista de alimentos, todas são escritas em blocos (cabeçalho sem `:` precedido de linha em branco, alimentos ou `Opção N:` embaixo), para não confundir uma refeição de uma linha com um alimento.
  - Uma refeição sem nenhuma opção ou alimento (por exemplo, `9:00 a 10:00, treino`) fica de fora e aparece nos avisos.
  - A ajuda "Como escrever?" e o exemplo (`src/lib/planHelp.ts`) explicam esse formato; um teste garante que o exemplo é lido como mostrado.
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
- Na tela de boas-vindas, o backup cria o perfil. Pelo Perfil, ele **substitui os dados atuais**: depois de uma confirmação, `restoreBackup` cria o perfil do backup numa transação, o perfil antigo é apagado e o novo vira o ativo. Só as colunas da lista `COLUMNS` são inseridas, o que impede que um JSON editado à mão grave colunas arbitrárias.

## 10. Regras de negócio

- **Formulário do plano** (`src/lib/planForm.ts`): o formulário trabalha com rascunhos (`WorkoutDraft`, `DietDraft`) e converte de/para o `Plan`.
  - Dias ficam na ordem da semana (segunda a domingo); treinos sem dia fixo (`Treino A`, `B`…) vêm depois.
  - Exercício com séries vira `sets`/`reps` (com `load` se "Anotar a carga" estiver marcado). Sem séries, o texto de repetições vira `note` (ex.: "20 min").
  - Exercícios sem nome, dias sem exercícios e refeições sem nome ou sem opções não são salvos, e a tela avisa antes.
  - Metas com um valor só (ex.: só calorias mínimas) gravam mínimo e máximo iguais; se os dois vierem trocados, o app desinverte. A água não aparece no formulário da dieta (fica no Perfil, em "Meta de água"), mas o rascunho guarda o valor atual para não perdê-lo ao salvar; uma linha "água:" colada no texto continua valendo.
- **Item por item ou texto** (`src/components/PartEditor.tsx`): os dois modos editam o mesmo rascunho. No texto, cada mudança é lida com `parsePlanText` e vira rascunho na hora, e um resumo acima da caixa mostra quantos dias, exercícios ou refeições foram reconhecidos. Se o texto também tiver a outra parte (ex.: plano inteiro colado no treino), a tela avisa; no cadastro (`fillOther`), essa outra parte já preenche a etapa seguinte, desde que ela esteja vazia. Ao trocar para o texto, o rascunho atual é escrito com `planToText`. Assim dá pra colar o texto e conferir ou ajustar item por item. A ajuda e os exemplos do formato ficam em `src/lib/planHelp.ts`. Ao salvar, o texto substitui a parte inteira, como no formulário.
- **Plano de exemplo** (`src/data/examplePlan.ts`): genérico e curto, só para mostrar como funciona. Aparece como "Começar com um exemplo" no cadastro e na edição, quando a parte está vazia.
- **Treino de hoje** (`pickToday`): primeiro procura o dia com o `weekday` de hoje. Se não houver, e o plano tiver treinos em rodízio, pega o treino seguinte ao último concluído. Se nenhum dos dois casos se aplicar, é dia de descanso.
- **Conclusão do treino:** concluir o treino grava `workout_done` para a data, e isso marca o treino no checklist semanal e soma na sequência. Um exercício é marcado como feito quando as repetições da última série são anotadas (veja o timer de descanso) ou ao tocar no número dele. Quando o último exercício pendente fica feito, o app pergunta "Treino completo! 🎉 Concluir e somar na sequência?" ("Agora não" / "Concluir"). `workout_done` tem um registro por dia: concluir um treino num dia em que havia caminhada troca a caminhada pelo treino.
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
- **Sequência de treinos (foguinho) e regra das duas faltas** (`computeStreak` em `src/lib/streak.ts`, card `StreakCard` no "Hoje" e nos widgets). É a única regra de falta do app (o antigo `missedStreak`, que ignorava o fim de semana, saiu):
  - **Cada dia soma no máximo 1**, como no Duolingo: a sequência conta dias com atividade, não atividades. Caminhada e treino no mesmo dia valem 1 (o treino substitui a caminhada no registro do dia).
  - **Plano com dias fixos:** conta os dias com treino concluído. Cada treino num dia escolhido soma 1, e um treino ou caminhada num dia de descanso também soma 1 (dia extra). Dias de descanso sem nada não contam nem quebram. Valem os dias escolhidos no plano, inclusive sábado e domingo.
  - **Plano sem dia fixo (rodízio):** conta semanas (segunda a domingo). A meta da semana é o número de treinos do plano (até 7). Cada semana em que bateu a meta soma 1.
  - **Uma falta perdoada:** um dia de treino (ou uma semana) sem treino não quebra a sequência, só a deixa em risco. Duas faltas seguidas zeram. Um treino concluído limpa a falta pendente. `misses` guarda as faltas seguidas.
  - Hoje (ou a semana atual) só conta como falta depois que acaba.
  - Não há registro retroativo: treinos só podem ser marcados no próprio dia, então a sequência não pode ser "consertada" depois.
  - Estados: `feito` (chama cheia), `descanso` (chama cheia se há sequência), `pendente` (chama vazada), `risco` (uma falta; chama cinza e "hoje não pode faltar!") e `zerada` (duas faltas seguidas; chama cinza e a dica do mínimo viável: "só os 3 primeiros exercícios, uns 30 minutos").
  - **Histórico dos dias de treino:** `settings` com a chave `schedule:<id>` guarda `[{ since, weekdays }]`. `recordSchedule` (`src/db/queries.ts`), chamado por `createProfile` e `savePlan`, acrescenta um item quando os dias fixos mudam (`nextSchedule`). O primeiro item usa `since: '0000-01-01'` com os dias de antes da troca, então perfis antigos também ficam certos na primeira troca. Para cada data, a sequência usa os dias válidos naquela época: trocar segunda/quarta/sexta por terça/quinta não transforma as terças e quintas antigas em faltas. O histórico entra no backup (campo opcional `schedule`), assim como os lembretes de água e de treino (campo opcional `settings`: `waterReminder` e `workoutReminder`, validados em `validSettings`). Ao restaurar, eles são regravados no perfil novo; backups antigos continuam válidos. Atenção: `getSetting` mescla objetos, então listas são lidas direto (`getSchedule`).
  - O recorde é a maior sequência do histórico, recalculada a cada vez a partir de todas as datas de `workout_done` (`getWorkoutDates`).
  - **Comemoração** (`src/lib/celebrate.ts`): ao concluir um treino ou registrar a caminhada, se a sequência cresceu, aparece "🔥 N treinos na sequência!", com "Novo recorde!" quando passa o recorde anterior.
- **Caminhada no dia de descanso:** no "Hoje", o dia de descanso tem o botão "Fiz uma caminhada". Ele grava `workout_done` com o rótulo `WALK_LABEL` ("Caminhada", em `src/lib/workout.ts`), que conta como dia extra na sequência. A caminhada não é treino: não entra no "x de y treinos", no checklist da aba Progresso, no rodízio (`getLastWorkout` a ignora) nem no "Treino concluído" da sessão. Pode ser desfeita no mesmo dia. Em plano de rodízio não há dia de descanso, então o botão não aparece.
- **Lembrete de treino** (`src/lib/workoutReminder.ts` e `syncWorkoutReminders` em `src/lib/notifications.ts`): ligado no Perfil, por perfil (`settings`, chave `workout_reminder:<id>`, padrão desligado às 18h).
  - Agenda os próximos 7 dias de treino (dias fixos) no horário escolhido, pulando hoje se o treino já foi feito. Em rodízio, avisa todo dia até a meta da semana ser batida.
  - O aviso de hoje muda com a sequência: `risco` → "Hoje não pode faltar! 🔥"; `zerada` → "Volte hoje! 🔥". Nos outros casos, "Hora do treino! 🐾" com o nome do treino.
  - Reagenda sozinho ao abrir o app e sempre que os dados mudam (`rev`, com 1,5 s de espera, em `_layout.tsx`).
- **Sugestão de subir carga** (`suggestIncrease` em `src/lib/progression.ts`):
  - Aparece quando, nos 2 últimos treinos do exercício, todas as séries tiveram a **mesma carga** e pelo menos as repetições pedidas. Repetição em branco conta como cumprida.
  - O aumento sugerido é +1 kg para cargas abaixo de 10 kg e +2,5 kg para as demais.
  - Some quando você digita uma carga no dia ou quando o exercício já está feito.
- **Troca de treino** (`shouldSuggestChange`): avisa no "Hoje" com 8 semanas desde `plan.treinoSince`.
  - `treinoSince` é gravado ao importar treino, ao criar um perfil com treino , ao salvar o primeiro treino de um perfil que não tinha nenhum ou ao salvar pelo botão "Montar treino novo" do aviso de troca. Editar um treino que já existe (por formulário ou texto) não muda a data.
  - Em perfis antigos, sem `treinoSince`, conta a partir do primeiro treino concluído.
  - "Lembrar em 2 semanas" grava `treinoSnooze`. "Já troquei" reinicia a contagem.
- **Lembretes de água** (`src/lib/water.ts` e `src/lib/notifications.ts`): configurados pelo sino do card de Água, por perfil (`settings`, chave `water_reminder:<id>`), com intervalo e janela de horário. O painel do sino mostra o próximo lembrete agendado (`nextScheduled`) e a dica de liberar a economia de bateria se os lembretes não chegarem com o app fechado.
  - O app agenda notificações locais para os próximos 7 dias e reagenda a cada copo registrado e sempre que é aberto.
  - No dia em que a meta é batida, os lembretes daquele dia são cancelados.
  - Se o app ficar mais de 7 dias sem ser aberto, os lembretes param até a próxima abertura.
- **Medidas:** o app avisa quando a última medida tem 14 dias ou mais.
- **IMC** (`src/lib/bmi.ts` e `src/components/BmiCard.tsx`): usa o peso mais recente e a altura do perfil. A altura é guardada em cm, mas pode ser digitada em cm ("160") ou em metros ("1,60"): valores abaixo de 3 são convertidos (`parseHeightCm`/`normalizeHeightCm` em `src/lib/format.ts`). Alturas antigas salvas em metros são corrigidas ao ler o perfil. Ela aparece como "1,60 m" (`fmtHeightM`). A classificação segue a OMS:

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
| `src/lib/__tests__/planForm.test.ts` | ida e volta plano → formulário → plano, ordem dos dias, campos vazios e metas da dieta |
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
- **Novo campo no plano:** atualize `types.ts`, `planForm.ts` e o editor da parte, `validatePlan` (`backup.ts`), `parsePlanText`, `planToText`, `Section` e `PART_SECTIONS` (`planText.ts`), e acrescente um caso ao teste de ida e volta.
- **Biblioteca com código nativo:** instale com `npx expo install`. Se ela não vier no Expo Go, vai ser preciso usar um development build (`eas build --profile development`) para testar.

## 14. Widgets Android

Três widgets de tela inicial, feitos com [react-native-android-widget](https://saleksovski.github.io/react-native-android-widget):

| Widget | Nome interno | Tamanho | Mostra | Toque |
|---|---|---|---|---|
| MeowFit · Hoje | `Today` | 4×2 | Foguinho com a sequência ao lado da data, treino do dia com barra de progresso (no descanso, "Caminhada feita ✓" se registrada), água e refeições no plano | Abre a sessão de treino do dia (ou o app, no descanso) |
| MeowFit · Semana | `Week` | 4×1 | S T Q Q S S D com os dias treinados, foguinho com a sequência à direita ("seguidos" ou "semanas") e, embaixo, o aviso da sequência ("Hoje não pode faltar!" no `risco`, "Volte hoje! Recomece a sequência" na `zerada`) ou "x/y treinos nesta semana". O foguinho é um SVG (`flameSvg` em `components.tsx`): cheio, vazado ou cinza, como no app. Sem treino no plano, volta ao contador "x/y treinos" | Abre a aba Progresso |
| MeowFit · Água | `Water` | 2×1 | Água do dia e botão **+250** | O botão registra a água sem abrir o app. O resto abre o app |

**Arquivos** (`src/widgets/`):
- `data.ts`: `loadWidgetData(db)` lê o banco e monta os números, com as mesmas regras do app (`pickToday`, `computeStreak` com o histórico de dias, refeições no plano). Não depende da biblioteca e é testado com SQLite real.
- `components.tsx`: o visual, com `FlexWidget` e `TextWidget`. As cores vêm das paletas `lilac` e `dark`.
- `render.tsx`: escolhe a paleta pelo tema do app. No modo `sistema`, entrega as duas versões e o Android escolhe. Também atualiza os widgets (`updateAllWidgets`).
- `handler.tsx`: chamado pelo Android quando um widget é adicionado, atualizado ou tocado. Trata o `ADD_WATER` e, a cada chamada, atualiza também os outros widgets.
- `index.ts`: ponto de entrada seguro (`registerWidgets` e `refreshWidgets`).

**Toque e navegação:** os toques abrem links `meowfit://` (`WIDGET_URI`). O `src/app/_layout.tsx` exporta `unstable_settings = { anchor: '(tabs)' }`, então uma tela aberta por link (ex.: `workout/[day]`) sempre tem as abas por baixo e o botão de voltar. A biblioteca entrega o toque por um broadcast que abre o app; ela descarta de propósito o toque que chega logo depois de o widget mudar de tamanho ou ser redesenhado, e no Xiaomi a permissão "Exibir janelas pop-up enquanto executa em segundo plano" pode bloquear a abertura.

**Como os dados ficam em dia:**
- Fora do app, o Android pede atualização a cada 30 min (`updatePeriodMillis`), o que cobre a virada do dia. Esse pedido chega para cada widget separadamente, e alguns celulares (Xiaomi/HyperOS) atrasam ou pulam alguns. Por isso, sempre que o handler roda para um widget, ele também atualiza os outros (`updateAllWidgets`).
- O handler roda sem o app aberto e abre o banco por conta própria (`widgetDb`).

**Expo Go:** a biblioteca carrega o módulo nativo assim que é importada, e esse módulo não existe no Expo Go. Por isso ela só é carregada com `require` dentro de funções protegidas por `widgetsAvailable` (Android e fora do Expo Go). No Expo Go os widgets simplesmente não existem e o app funciona normal.

**Testar:** widgets precisam de build nativo.
1. `npx eas-cli@latest build -p android --profile development`, uma vez, e instale o APK "MeowFit" gerado.
2. `npx expo start --dev-client` e abra o app pelo APK instalado. Mudanças no app aparecem na hora.
3. Segure na tela inicial → Widgets → MeowFit.
4. Mudanças no visual dos widgets ou no `app.json` pedem um build novo.

O tamanho e o nome de cada widget ficam no plugin `react-native-android-widget` do `app.json`. A entrada do app é `index.ts` (campo `main` do `package.json`), que carrega o `expo-router/entry` e registra os widgets.

## 15. Versão web (PWA para iPhone)

**Banco na web.** O expo-sqlite grava no armazenamento permanente do navegador (OPFS), por endereço: `meowfit.expo.app` e o link exclusivo de cada deploy são bancos diferentes, e no iPhone a aba do Safari e o ícone da Tela de Início também. O OPFS só deixa uma página abrir o arquivo por vez. Se a abertura falha (outra aba aberta, ou recarregar antes de a página anterior soltar o arquivo), o `RootLayout` recarrega a página sozinho até 3 vezes (contador em `sessionStorage`, zerado quando abre); depois mostra `DatabaseError` ("O MeowFit provavelmente está aberto em outra aba…", com "Tentar de novo"). No Android, ele remonta o `SQLiteProvider` até 3 vezes. A tela de erro esconde a splash nativa, para o app não ficar preso nela.

Como instalar um app no iPhone sem a conta paga da Apple não é possível, o app também roda como **PWA**: um site que o Safari instala na tela inicial ("Compartilhar → Adicionar à Tela de Início"), com ícone, nome e tela cheia.

**Configuração:**
- `app.json`:
  - `web.output` é `server`. Assim o servidor resolve rotas com parâmetro (`/workout/0`, `/exercise/…`) quando a página é aberta ou recarregada direto nelas.
  - O plugin `expo-router` envia os cabeçalhos `Cross-Origin-Embedder-Policy: credentialless` e `Cross-Origin-Opener-Policy: same-origin`, exigidos pelo banco (expo-sqlite) na web.
- `metro.config.js`: aceita arquivos `.wasm` (o SQLite da web) e envia os mesmos cabeçalhos no servidor de desenvolvimento.
- `src/app/+html.tsx`: página base usada só na web. Segue o template do SDK 58: precisa de `useServerDocumentContext()` com `{headNodes}` e `{bodyNodes}`, senão os scripts do app não são injetados e a página fica em branco. Também traz as meta tags do iPhone (tela cheia, título, `apple-touch-icon`), a cor da barra por tema, o bloqueio do zoom automático em campos e a cor de fundo inicial.
- `public/`: `manifest.json` e os ícones `icon-192.png`, `icon-512.png` e `apple-touch-icon.png`, gerados de `design/logo-icon.png`.

**Diferenças em relação ao app Android** (sempre com `Platform.OS === 'web'`; no celular nada muda):

| Recurso | Na web |
|---|---|
| Alertas e confirmações | Iguais ao Android: `src/lib/alert.ts` põe o aviso numa fila e o `DialogHost` desenha a janela do app (o `Alert` do React Native não aparece na web) |
| Salvar ao sair do campo | `onBlur` além de `onEndEditing` (séries e texto da refeição), só na web |
| Exportar backup ou plano | Compartilhamento do sistema (`navigator.share`) ou download do arquivo (`src/lib/files.ts`) |
| Importar arquivo | Lido direto do arquivo escolhido no navegador |
| Notificações (água, treino e descanso) | Desligadas (`notificationsAvailable`): o sino do card de Água e o card "Lembrete de treino" do Perfil ficam ocultos |
| Widgets e barra de navegação | Não existem |
| Banco | expo-sqlite com WebAssembly e o armazenamento do navegador. O app pede armazenamento persistente (`navigator.storage.persist`). Os dados ficam só naquele navegador ou PWA, separados do app Android |

Os campos de texto em linha precisam de `minWidth: 0`. No navegador, sem isso, eles não encolhem e empurram a tela para os lados.

**Publicar** (Expo Hosting, plano gratuito: 100 mil acessos por mês):

```bash
npx expo export -p web
npx eas-cli@latest deploy --prod
```

Testar localmente: `npx expo export -p web` e depois `npx expo serve`.

## 16. Nuvem (Supabase)

O app continua local (SQLite em cada aparelho). A nuvem guarda uma **cópia de segurança** por pessoa: o mesmo JSON do "Exportar backup completo". Não há sincronização em tempo real entre aparelhos; o último aparelho que salvou é o que está na nuvem.

**Projeto:** `https://hauxjtqiigjllxhlwkjs.supabase.co` (nome MeowFit, região escolhida na criação, RLS automático ligado). O app usa só a chave **publishable** (`src/lib/supabase.ts`), que pode ficar no código. A chave secreta e a senha do banco nunca entram no app.

**Banco** (`supabase/schema.sql`, rodar no SQL Editor):
- Tabela `cloud_backups`: `user_id` (chave, ligada a `auth.users`, apagada junto com a conta), `profile_name`, `data` (jsonb com o backup) e `updated_at`.
- RLS ligada, com regras de select/insert/update/delete só para `authenticated` e só quando `auth.uid() = user_id`. O papel `anon` não tem acesso nenhum.

**Login:** sem senha. `signInWithOtp` manda um código numérico (6 a 8 dígitos, conforme o projeto; este gera 8, e o app aceita de 6 a 10) (o modelo "Magic Link" do Supabase precisa usar `{{ .Token }}`; o texto está em `supabase/email-code.html`; ele é usado nos modelos **Confirm signup**, enviado no primeiro acesso, e **Magic Link**, nos seguintes. Assunto: `{{ .Token }} é seu código do MeowFit`. O código no assunto e numa primeira linha oculta de prévia faz o Android e o iPhone oferecerem "Copiar código" na notificação; o campo do app usa `autoComplete="one-time-code"`) e `verifyOtp({ type: 'email' })` confere. O código vale 1 hora, e só dá para pedir outro a cada 60 s. A sessão fica guardada no aparelho (Android: `expo-sqlite/localStorage`; web: `localStorage` do navegador) por um adaptador que não quebra na geração das páginas da web (`safeStorage`). O cliente é criado só quando usado (`getSupabase()`), porque o export da web roda o app no Node, onde acessar `localStorage` dá erro.

**Ligação aparelho ↔ conta** (`src/lib/cloud.ts`, `src/lib/cloudLogic.ts`, tela `src/app/cloud-login.tsx`): `settings` com a chave `cloud_link` guarda `{ userId, pid }`. Depois do código, `decideLink` escolhe:
- **Aparelho com dados e nuvem vazia** (`upload`): confirma "Os dados de NOME serão guardados na conta EMAIL" e envia.
- **Aparelho vazio e nuvem com dados** (`restore`, pelas boas-vindas): restaura direto.
- **Os dois com dados** (`choose`): mostra os dois lados (nome e data da nuvem) e pergunta: "Usar os da nuvem" (substitui o aparelho) ou "Enviar os deste aparelho" (pede uma segunda confirmação antes de substituir a nuvem). Nada é juntado.
- **Os dois vazios** (`signup`): a tela mostra "Conta pronta" com "Criar meu cadastro" (abre `/new-profile?inicio=cadastro`, direto no formulário) e "Restaurar de um arquivo de backup" (só aceita backup completo; plano solto pede para cadastrar e importar depois). Nos dois casos, o perfil já nasce ligado à conta e é enviado.

**Convite no cadastro:** ao concluir o cadastro sem estar conectado, aparece "Salvar na nuvem? ☁️" ("Agora não" / "Salvar com meu e-mail", que abre `/cloud-login`). Quem já entrou antes de se cadastrar não vê o convite, porque o perfil já nasce ligado à conta.

**Direção dos dados:** aparelho → nuvem é automático. Nuvem → aparelho só acontece no login (aparelho vazio, ou "Usar os da nuvem"). Não há atualização contínua nos dois sentidos: com dois aparelhos em uso, a nuvem fica com o último que salvou.

**Envio automático:** com o aparelho ligado à conta, o `_layout.tsx` envia 4 s depois de qualquer mudança (`rev`) e quando o app vai para segundo plano. Sem internet, o card mostra o erro e a próxima mudança tenta de novo.

**Estado da sincronização** (`settings`, chave `cloud_sync` = `{ syncedAt, signature }`): `syncedAt` é o `updated_at` da última versão que este aparelho enviou ou recebeu; `signature` é um hash curto do backup (`backupHash`, que ignora `exportedAt`). Como fica salvo, abrir o app não reenvia dados iguais. "Salvar agora" reenvia mesmo sem mudança.

**Conflito entre aparelhos:** o envio normal é condicional: `update … where user_id = uid and updated_at = syncedAt`. Se nenhuma linha muda, outro aparelho salvou depois: o estado vira `conflict`, nada é sobrescrito e o envio automático para. Ao abrir o app e ao voltar para ele, `checkCloud` compara o `updated_at` da nuvem com `syncedAt` (`cloudConflict`, com 1 s de folga). O card "Nuvem" mostra "Outro aparelho salvou dados mais novos…" com "Usar os da nuvem" (restaura e troca os dados do aparelho) ou "Enviar os deste aparelho" (pede confirmação e sobrescreve com `upsert`). Aparelhos ligados antes dessa regra (sem `syncedAt`) fazem um `upsert` no primeiro envio e passam a ser controlados.

**Troca de perfil:** restaurar um backup pelo Perfil (`import.tsx`) cria um perfil novo; `relinkIfLinked` religa a conta ao perfil novo e envia, para a nuvem não ficar parada.

**Apagar:** com a nuvem conectada, "Apagar meus dados" pergunta "Apagar só deste aparelho" (a cópia da nuvem continua e volta ao entrar de novo) ou "Apagar também da nuvem" (segunda confirmação; chama `deleteCloudBackup`). Nos dois casos o aparelho sai da conta.

**Reenviar código:** o botão mostra "Reenviar em N s" por 60 s, porque o Supabase só aceita um pedido por minuto.

**Perfil → card "Nuvem"** (`CloudCard`): sem conta, "Entrar com meu e-mail"; ligado, o e-mail, "Salvo hoje às HH:MM", "Salvar agora" e "Sair" (o aparelho para de enviar; os dados ficam no aparelho e na nuvem). "Apagar meus dados" também sai da conta; a cópia da nuvem continua e volta entrando de novo.

**Ler o arquivo escolhido** (`pickTextFile` em `src/lib/files.ts`): tenta a API nova do `expo-file-system`, depois a `expo-file-system/legacy` e por fim `fetch` no endereço. No Expo Go, a cópia do seletor de arquivos fica fora da área do projeto e a API nova recusa com "Missing 'READ' permission".

**Testar a segurança:** com a tabela criada, uma consulta só com a chave publishable (sem login) não pode devolver linhas; e duas contas diferentes não podem ler a linha uma da outra.

