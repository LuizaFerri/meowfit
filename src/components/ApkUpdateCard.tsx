import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { getSetting, setSetting } from '@/db/queries';
import { RELEASES_API, readRelease, updateToShow, type ApkRelease } from '@/lib/apkReleaseLogic';
import { Body, Button, Card, Row, Subtitle } from './ui';
import { useTheme } from './ThemeProvider';

const DISMISSED_KEY = 'apk_dismissed';

const apkUpdatesAvailable =
  Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export function ApkUpdateCard() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const [release, setRelease] = useState<ApkRelease | null>(null);

  useEffect(() => {
    if (!apkUpdatesAvailable) return;
    let alive = true;
    (async () => {
      const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) return;
      const latest = readRelease(await res.json());
      const dismissed = await getSetting<{ version: string | null }>(db, DISMISSED_KEY, { version: null });
      if (alive) setRelease(updateToShow(latest, Application.nativeApplicationVersion, dismissed.version));
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [db]);

  if (!release) return null;

  const dismiss = () => {
    setRelease(null);
    setSetting(db, DISMISSED_KEY, { version: release.version }).catch(() => {});
  };

  return (
    <Card style={{ borderColor: colors.primary }}>
      <Row style={{ gap: 10 }}>
        <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
        <Subtitle>Versão nova do app</Subtitle>
      </Row>
      <Body muted>
        A versão {release.version} está disponível. Baixe e instale por cima: seus dados continuam no celular.
      </Body>
      <Row>
        <Button small variant="ghost" label="Agora não" onPress={dismiss} style={{ flex: 1 }} />
        <Button
          small
          icon="download-outline"
          label="Baixar"
          onPress={() => Linking.openURL(release.url).catch(() => {})}
          style={{ flex: 1 }}
        />
      </Row>
    </Card>
  );
}
