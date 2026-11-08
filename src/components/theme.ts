export type Palette = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  info: string;
  inputBg: string;
};

export const lilac: Palette = {
  bg: '#F6F1FB',
  card: '#FFFFFF',
  text: '#2D2440',
  muted: '#6E6386',
  border: '#E7DDF3',
  primary: '#7044B8',
  onPrimary: '#FFFFFF',
  primarySoft: '#EEE4FC',
  accent: '#2C7563',
  onAccent: '#FFFFFF',
  accentSoft: '#DDF2EB',
  warn: '#975816',
  warnSoft: '#FBEBD9',
  danger: '#B93A33',
  info: '#3C6BBE',
  inputBg: '#FDFBFF',
};

export const dark: Palette = {
  bg: '#16121E',
  card: '#221C2D',
  text: '#EEE8F7',
  muted: '#A69CB8',
  border: '#362D45',
  primary: '#C3A3F5',
  onPrimary: '#1F1530',
  primarySoft: '#3A2D55',
  accent: '#77D1B8',
  onAccent: '#10261F',
  accentSoft: '#1E3A33',
  warn: '#F2B866',
  warnSoft: '#3E301C',
  danger: '#FF8A80',
  info: '#8DB5FF',
  inputBg: '#1B1624',
};

export type ThemeMode = 'lilas' | 'escuro' | 'sistema';
export const DEFAULT_THEME_MODE: ThemeMode = 'lilas';

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
