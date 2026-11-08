import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from '@/db/queries';
import { dark, lilac, type Palette, type ThemeMode } from './theme';
import { makeStyles, type Styles } from './styles';

type Theme = {
  colors: Palette;
  s: Styles;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const STYLES = { light: makeStyles(lilac), dark: makeStyles(dark) };

const ThemeContext = createContext<Theme>({
  colors: lilac,
  s: STYLES.light,
  isDark: false,
  mode: 'sistema',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('sistema');

  useEffect(() => {
    getSetting(db, 'theme', { mode: 'sistema' as ThemeMode }).then((t) => setModeState(t.mode));
  }, [db]);

  const value = useMemo<Theme>(() => {
    const isDark = mode === 'escuro' || (mode === 'sistema' && system === 'dark');
    return {
      colors: isDark ? dark : lilac,
      s: isDark ? STYLES.dark : STYLES.light,
      isDark,
      mode,
      setMode: (m) => {
        setModeState(m);
        setSetting(db, 'theme', { mode: m });
      },
    };
  }, [mode, system, db]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
