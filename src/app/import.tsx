import * as Clipboard from 'expo-clipboard';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { radius } from '@/components/theme';
import { Body, Button, Card, Chip, Field, Row, Screen, Subtitle } from '@/components/ui';
import { createProfile, savePlan } from '@/db/queries';
import { parseJsonFile, restoreBackup, type BackupFile } from '@/lib/backup';
import { pickTextFile } from '@/lib/files';
import {
  ALL_SECTIONS,
  PART_SECTIONS,
  foundIn,
  hasContent,
  ignoredIn,
  parsePlanText,
  pickSections,
  planToText,
  type Part,
  type Section,
} from '@/lib/planText';
import { emptyPlan, type Plan } from '@/lib/types';
import { dayName, stampTreino, target } from '@/lib/workout';
import { todayKey } from '@/lib/dates';
import { useApp, useProfile } from '@/store/useApp';
import { useTheme } from '@/components/ThemeProvider';

const EXAMPLES: Record<Part, string> = {
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

const HELP: Record<Part, string> = {
  treino:
    'Cada treino começa com o dia (“Segunda: pernas”) ou “Treino A”. Depois, um exercício por linha: “Nome: séries x repetições”. Escreva “carga ___ kg” para anotar peso. A seção “Hábitos:” é opcional e vira o checklist da semana.',
  dieta:
    'Uma refeição por linha (“Almoço: opção 1 | opção 2”) ou o nome numa linha e as opções embaixo (“Opção 1: …”). O horário no começo é opcional (“12:30, almoço”). Metas: “kcal: 1600-1750”, “proteína: 100-110”, “água: 2.5”. Depois de “Regras:”, uma dica por linha.',
};

const SECTION_LABEL: Record<Section, string> = {
  days: 'treinos',
  habits: 'hábitos',
  meals: 'refeições',
  targets: 'metas',
  rules: 'regras',
};

type Preview = {
  incoming: Plan;
  sections: Section[];
  warnings: { line: number; text: string }[];
  ignored: Section[];
  backup?: BackupFile;
};

export default function Import() {
  const { colors, s } = useTheme();
  const params = useLocalSearchParams<{ modo?: 'editar' | 'arquivo'; parte?: Part }>();
  const restoring = params.modo === 'arquivo';
  const editing = params.modo === 'editar';
  const part: Part | undefined = restoring ? undefined : params.parte === 'dieta' ? 'dieta' : 'treino';
  const db = useSQLiteContext();
  const profile = useProfile();
  const switchTo = useApp((st) => st.switchTo);
  const loadActive = useApp((st) => st.loadActive);

  const [text, setText] = useState(editing && part ? planToText(profile.plan, part) : '');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const partName = part === 'dieta' ? 'dieta' : 'treino';
  const title = restoring ? 'Restaurar backup' : `${editing ? 'Editar' : 'Importar'} ${partName}`;

  const analyze = () => {
    const result = parsePlanText(text, profile.plan.name, part);
    const sections = editing && part ? PART_SECTIONS[part] : foundIn(result, part);
    if (!editing && sections.length === 0) {
      return Alert.alert(
        'Nada reconhecido',
        part === 'dieta'
          ? 'Escreva uma refeição por linha, como “Almoço: frango e arroz | peixe e batata”.'
          : 'Comece cada treino com uma linha como “Segunda: pernas” ou “Treino A”.',
      );
    }
    setPreview({ incoming: result.plan, sections, warnings: result.warnings, ignored: ignoredIn(result, part) });
  };

  const pickFile = async () => {
    try {
      const f = await pickTextFile();
      if (!f) return;
      if (!f.name.toLowerCase().endsWith('.json') && !f.text.trimStart().startsWith('{')) {
        setText(f.text);
        setPreview(null);
        return;
      }
      const parsed = parseJsonFile(f.text);
      if (parsed.kind === 'plan' && parsed.part && part && parsed.part !== part) {
        return Alert.alert(
          'Arquivo de outra parte',
          `Este arquivo é de ${parsed.part}. Importe pela opção “Importar ${parsed.part}”.`,
        );
      }
      const sections = (part ? PART_SECTIONS[part] : ALL_SECTIONS).filter((sec) => hasContent(parsed.plan, sec));
      if (parsed.kind === 'backup' && restoring) setNewName(parsed.backup.profile?.name ?? '');
      else if (sections.length === 0) return Alert.alert('Arquivo vazio', `O arquivo não tem ${partName}.`);
      setPreview({
        incoming: parsed.plan,
        sections,
        warnings: [],
        ignored: [],
        backup: parsed.kind === 'backup' && restoring ? parsed.backup : undefined,
      });
    } catch (e) {
      Alert.alert('Não foi possível ler o arquivo', (e as Error).message);
    }
  };

  const paste = async () => setText(await Clipboard.getStringAsync());

  const applyHere = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const next = pickSections(profile.plan, preview.incoming, preview.sections);
      await savePlan(db, profile.id, !editing && preview.sections.includes('days') ? stampTreino(next, todayKey()) : next);
      await loadActive(db);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const applyNew = async () => {
    if (!preview) return;
    if (!newName.trim()) return Alert.alert('Nome', 'Digite o nome do novo perfil.');
    setBusy(true);
    try {
      const id = preview.backup
        ? await restoreBackup(db, preview.backup, preview.incoming, newName.trim())
        : await createProfile(db, newName.trim(), null, stampTreino(pickSections(emptyPlan(), preview.incoming, preview.sections), todayKey()));
      await switchTo(db, id);
      router.dismissTo('/');
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const show = new Set(preview?.sections ?? []);
  const p = preview?.incoming;
  const t = p?.targets;
  const range = (a?: number, b?: number) => (a === undefined ? '' : b !== undefined && b !== a ? `${a}–${b}` : `${a}`);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title }} />
      <Screen>
        {!preview && (
          <>
            {part && (
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Subtitle>{editing ? `Seu ${partName} em texto` : `Colar ${partName}`}</Subtitle>
                  <Chip label={showHelp ? 'Fechar ajuda' : 'Formato?'} onPress={() => setShowHelp(!showHelp)} />
                </Row>
                {showHelp && (
                  <View style={{ gap: 6 }}>
                    <Body muted style={{ fontSize: 13 }}>
                      {HELP[part]}
                    </Body>
                    <Text
                      style={[
                        s.small,
                        {
                          fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
                          backgroundColor: colors.bg,
                          padding: 8,
                          borderRadius: radius.sm,
                        },
                      ]}
                    >
                      {EXAMPLES[part]}
                    </Text>
                    <Button small variant="ghost" label="Usar este exemplo" onPress={() => setText(EXAMPLES[part])} />
                  </View>
                )}
                <TextInput
                  multiline
                  value={text}
                  onChangeText={setText}
                  placeholder={EXAMPLES[part].split('\n').slice(0, 3).join('\n') + '\n…'}
                  placeholderTextColor={colors.muted}
                  textAlignVertical="top"
                  autoCorrect={false}
                  style={[s.input, { minHeight: 220, maxHeight: 420, fontSize: 14 }]}
                />
                <Row>
                  {!editing && <Button small variant="ghost" label="Colar" icon="clipboard-outline" onPress={paste} style={{ flex: 1 }} />}
                  <Button small label="Analisar" icon="search-outline" onPress={analyze} disabled={!editing && !text.trim()} style={{ flex: 2 }} />
                </Row>
              </Card>
            )}
            {!editing && (
              <Card>
                <Subtitle>{restoring ? 'Escolher backup' : 'Ou abrir arquivo'}</Subtitle>
                <Body muted style={{ fontSize: 13 }}>
                  {restoring
                    ? 'Backup .json exportado pelo MeowFit. Ele vira um novo perfil.'
                    : `.json de ${partName} compartilhado pelo MeowFit, ou .txt no formato acima.`}
                </Body>
                <Button variant="secondary" label="Escolher arquivo" icon="folder-open-outline" onPress={pickFile} />
              </Card>
            )}
          </>
        )}

        {preview && p && t && (
          <>
            <Card>
              <Subtitle>{preview.backup ? 'Backup encontrado' : 'Pré-visualização'}</Subtitle>
              {preview.backup && (
                <Body muted>
                  Perfil “{preview.backup.profile?.name}” · {preview.backup.data?.set_logs?.length ?? 0} séries ·{' '}
                  {preview.backup.data?.measurements?.length ?? 0} medidas
                </Body>
              )}

              {show.has('days') &&
                p.days.map((d, i) => (
                  <View key={i} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 2 }}>
                    <Body style={{ fontWeight: '700' }}>{dayName(d)}</Body>
                    {d.exercises.map((e) => (
                      <Row key={e.id} style={{ justifyContent: 'space-between' }}>
                        <Body style={{ flex: 1 }}>{e.name}</Body>
                        <Body muted>{target(e)}</Body>
                      </Row>
                    ))}
                  </View>
                ))}

              {show.has('habits') && p.habits.length > 0 && (
                <PreviewList title="Hábitos da semana" items={p.habits} />
              )}

              {show.has('meals') &&
                p.meals.map((m, mi) => (
                  <View key={mi} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 2 }}>
                    <Body style={{ fontWeight: '700' }}>{m.time ? `${m.time} · ${m.name}` : m.name}</Body>
                    {m.options.map((o, i) => (
                      <Body key={i} muted>
                        {i + 1}. {o}
                      </Body>
                    ))}
                  </View>
                ))}

              {show.has('targets') && hasContent(p, 'targets') && (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 2 }}>
                  <Body style={{ fontWeight: '700' }}>Metas</Body>
                  {t.kcalMin !== undefined && <Body muted>{range(t.kcalMin, t.kcalMax)} kcal</Body>}
                  {t.proteinMin !== undefined && <Body muted>{range(t.proteinMin, t.proteinMax)} g de proteína</Body>}
                  {t.waterL !== undefined && <Body muted>{String(t.waterL).replace('.', ',')} L de água</Body>}
                </View>
              )}

              {show.has('rules') && p.rules.length > 0 && <PreviewList title="Regras" items={p.rules} />}

              {!editing && !preview.backup && part && (
                <Body muted style={{ fontSize: 13, marginTop: 6 }}>
                  {part === 'treino'
                    ? 'Só o treino será trocado. A dieta do perfil não muda.'
                    : 'Só a dieta será trocada. O treino do perfil não muda.'}
                </Body>
              )}
            </Card>

            {preview.ignored.length > 0 && (
              <Card style={{ backgroundColor: colors.warnSoft, borderColor: colors.warnSoft }}>
                <Body style={{ fontSize: 13 }}>
                  O texto também tinha {preview.ignored.map((sec) => SECTION_LABEL[sec]).join(', ')}. Isso ficou de fora: importe pela
                  opção “Importar {part === 'treino' ? 'dieta' : 'treino'}”.
                </Body>
              </Card>
            )}

            {preview.warnings.length > 0 && (
              <Card style={{ backgroundColor: colors.warnSoft, borderColor: colors.warnSoft }}>
                <Subtitle>Linhas ignoradas</Subtitle>
                {preview.warnings.map((w) => (
                  <Body key={w.line} style={{ fontSize: 13 }}>
                    Linha {w.line}: {w.text}
                  </Body>
                ))}
                <Body muted style={{ fontSize: 13 }}>
                  {part === 'dieta'
                    ? 'Linhas sem opções (como horário de treino) ficam de fora. Uma refeição precisa de pelo menos uma opção.'
                    : 'Exercícios precisam vir depois de um dia (“Segunda: …” ou “Treino A”).'}
                </Body>
              </Card>
            )}

            <Card>
              {!preview.backup && (
                <Button
                  label={editing ? `Salvar ${partName}` : `Aplicar no perfil de ${profile.name}`}
                  icon="checkmark-outline"
                  onPress={applyHere}
                  disabled={busy}
                />
              )}
              {!editing && (
                <>
                  <Field
                    label={preview.backup ? 'Nome do perfil restaurado' : 'Ou criar um novo perfil'}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Nome"
                  />
                  <Button
                    variant="secondary"
                    label={preview.backup ? 'Restaurar como novo perfil' : `Criar perfil com este ${partName}`}
                    icon="person-add-outline"
                    onPress={applyNew}
                    disabled={busy}
                  />
                </>
              )}
              <Button variant="ghost" label="Voltar e editar" onPress={() => setPreview(null)} />
            </Card>
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  const { colors, s } = useTheme();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 2 }}>
      <Body style={{ fontWeight: '700' }}>{title}</Body>
      {items.map((h, i) => (
        <Body key={i} muted>
          • {h}
        </Body>
      ))}
    </View>
  );
}
