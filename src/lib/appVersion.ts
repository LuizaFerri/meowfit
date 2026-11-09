import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

export function appVersionLabel() {
  const version = (Platform.OS === 'web' ? null : Application.nativeApplicationVersion) ?? Constants.expoConfig?.version ?? '';
  const base = version ? `Versão ${version}` : 'Versão web';
  if (Platform.OS === 'web' || !Updates.isEnabled || Updates.isEmbeddedLaunch || !Updates.createdAt) return base;
  return `${base} · atualizada em ${Updates.createdAt.toLocaleDateString('pt-BR')}`;
}
