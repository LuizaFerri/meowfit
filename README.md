# MeowFit

App Android para acompanhar treino, cargas, dieta e medidas. Funciona offline: os dados ficam só no celular (SQLite) e não há backend. Cada pessoa usa no próprio celular; para trocar de aparelho, exporte um backup e restaure no novo.

## Testar no celular (sem gerar APK)

1. Instale o **Expo Go** pela Play Store.
2. No PC: `npm install` e depois `npx expo start`.
3. Leia o QR code com o Expo Go (celular e PC na mesma rede Wi-Fi).

## Testar com development build (widgets)

Os widgets da tela inicial não funcionam no Expo Go. Para testar, gere um development build uma vez:

```bash
npx eas-cli@latest build -p android --profile development
```

Instale o APK gerado e, no dia a dia, rode `npx expo start --dev-client`. O app instalado conecta no PC e atualiza na hora, como no Expo Go.

## Gerar o APK

O APK é compilado na nuvem pelo EAS (não precisa de Android Studio):

```bash
npx eas-cli@latest login                                  # conta grátis em expo.dev
npx eas-cli@latest build -p android --profile preview     # na 1ª vez, aceite criar o projeto e a keystore
```

No fim, o comando mostra um link e um QR code. Baixe o `.apk` no celular e instale-o (o Android vai pedir para permitir "instalar apps desconhecidos").

> Guarde a mesma conta Expo: as próximas versões usam a mesma keystore, então instalam por cima sem perder os dados.

## Versão para iPhone (PWA)

No iPhone, o MeowFit roda como app web: abra o endereço publicado no **Safari**, toque em **Compartilhar → Adicionar à Tela de Início**, e ele vira um ícone que abre em tela cheia. Funciona tudo, menos notificações e widgets. Os dados ficam salvos no próprio iPhone.

Para publicar uma nova versão:

```bash
npx expo export -p web
npx eas-cli@latest deploy --prod
```

## Montar treino e dieta

No primeiro acesso, um cadastro em 3 etapas pede nome, altura e peso, depois o treino e a dieta, por formulário (dá pra pular as duas últimas). Depois, tudo se altera em **Perfil → Editar treino / Editar dieta**.

Em cada etapa e na edição dá pra escolher entre **Item por item** e **Colar texto**; o texto segue o formato abaixo.

Treino e dieta são importados separadamente, e importar um não mexe no outro.

**Treino:**

```
Segunda: inferiores
Aquecimento: 5-10 min de esteira
Leg press: 3 x 12, carga ___ kg
Prancha: 3 x 30 s

Treino B: superiores          ← treinos em rodízio também funcionam
Supino: 4 x 10, carga ___ kg

Hábitos:
Dormi 7 h ou mais
```

**Dieta:**

```
Café da manhã: 2 ovos e pão integral | iogurte com aveia
Almoço: frango e arroz | peixe e batata

kcal: 1600-1750
proteína: 100-110
água: 2.5

Regras:
Proteína em toda refeição
```

Cada parte também pode ser enviada para outra pessoa pelo botão **Enviar**. O backup completo (perfil, plano e histórico) fica no card **Backup** do Perfil.

## Documentação

A documentação completa está em [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md): arquitetura, banco de dados, formato de importação, backup, regras de negócio, testes e como estender o app.

## Desenvolvimento

```bash
npm test            # parser, consultas SQL (SQLite real via node:sqlite) e backup
npm run typecheck
npx expo-doctor
```

Código em `src/`: as rotas ficam em `src/app` (expo-router), o banco em `src/db`, e o parser, o backup e as datas em `src/lib`.
