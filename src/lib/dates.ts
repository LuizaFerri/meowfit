import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const toKey = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayKey = () => toKey(new Date());
export const weekStartKey = (d = new Date()) => toKey(startOfWeek(d, { weekStartsOn: 1 }));
export const weekDays = (d = new Date()) => {
  const start = startOfWeek(d, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const fmtShort = (key: string) => format(parseISO(key), 'dd/MM');
export const fmtLong = (key: string) => format(parseISO(key), "EEEE, d 'de' MMMM", { locale: ptBR });
export const daysSince = (key: string) => differenceInCalendarDays(new Date(), parseISO(key));
