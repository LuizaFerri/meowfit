import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';
import type { Palette } from '@/components/theme';
import { fmtNum } from '@/lib/format';
import type { WidgetData } from './data';

const hex = (c: string) => c as ColorProp;

export const WIDGET_URI = {
  home: 'meowfit://',
  progress: 'meowfit://progress',
  workout: (idx: number) => `meowfit://workout/${idx}`,
};

function Shell({ c, children, uri, padding = 14 }: { c: Palette; children: any; uri: string; padding?: number }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: hex(c.card),
        borderRadius: 22,
        padding,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {children}
    </FlexWidget>
  );
}

function OpenApp({ c }: { c: Palette }) {
  return (
    <Shell c={c} uri={WIDGET_URI.home}>
      <TextWidget text="🐾 MeowFit" style={{ fontSize: 13, fontWeight: '700', color: hex(c.primary) }} />
      <TextWidget text="Abra o app para criar seu perfil" style={{ fontSize: 13, color: hex(c.muted) }} maxLines={2} />
    </Shell>
  );
}

function Bar({ c, value, total, color, height = 6 }: { c: Palette; value: number; total: number; color: string; height?: number }) {
  const filled = Math.max(0, Math.min(value, total));
  const rest = total - filled;
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        width: 'match_parent',
        height,
        borderRadius: height / 2,
        backgroundColor: hex(c.border),
        overflow: 'hidden',
      }}
    >
      {filled > 0 && <FlexWidget style={{ flex: filled, height, borderRadius: height / 2, backgroundColor: hex(color) }} />}
      {rest > 0 && <FlexWidget style={{ flex: rest, height }} />}
    </FlexWidget>
  );
}

export function TodayWidget({ d, c }: { d: WidgetData; c: Palette }) {
  if (!d.ready) return <OpenApp c={c} />;
  const day = d.day;
  const title = !day ? 'Dia de descanso' : day.title ? `${day.label} · ${day.title}` : day.label;
  const status = !day
    ? 'Uma caminhada leve conta!'
    : d.finished
      ? 'Treino concluído ✓'
      : `${day.done} de ${day.total} exercícios`;
  const mealsText = d.mealsTotal > 0 ? `🍽 ${d.mealsOnPlan} de ${d.mealsTotal}` : '';

  return (
    <Shell c={c} uri={day ? WIDGET_URI.workout(day.idx) : WIDGET_URI.home}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text="🐾 MeowFit" style={{ fontSize: 13, fontWeight: '700', color: hex(c.primary) }} />
        <TextWidget text={d.dateLabel} style={{ fontSize: 12, color: hex(c.muted) }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', flexGap: 5 }}>
        <TextWidget text={title} maxLines={1} truncate="END" style={{ fontSize: 16, fontWeight: '700', color: hex(c.text) }} />
        {day && <Bar c={c} value={d.finished ? day.total : day.done} total={day.total} color={c.accent} />}
        <TextWidget
          text={status}
          style={{ fontSize: 12, color: hex(d.finished ? c.accent : c.muted), fontWeight: d.finished ? '700' : 'normal' }}
        />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget
          text={`💧 ${fmtNum(d.waterMl / 1000)} / ${fmtNum(d.waterGoalMl / 1000)} L`}
          style={{ fontSize: 13, color: hex(c.text) }}
        />
        <TextWidget text={mealsText} style={{ fontSize: 13, color: hex(c.text) }} />
      </FlexWidget>
    </Shell>
  );
}

export function WeekWidget({ d, c }: { d: WidgetData; c: Palette }) {
  if (!d.ready) return <OpenApp c={c} />;
  const warn = d.missed === 1 ? 'Hoje não pode faltar!' : d.missed > 1 ? `${d.missed} faltas seguidas` : '';
  return (
    <Shell c={c} uri={WIDGET_URI.progress} padding={10}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', alignItems: 'center', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 4 }}>
          {d.week.map((w, i) => (
            <FlexWidget
              key={i}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hex(w.done ? c.accent : c.bg),
                borderWidth: w.today ? 2 : 1,
                borderColor: hex(w.today ? c.primary : c.border),
              }}
            >
              <TextWidget
                text={w.done ? '✓' : w.letter}
                style={{ fontSize: 11, fontWeight: '700', color: hex(w.done ? c.onAccent : w.today ? c.primary : c.muted) }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget text={`${d.weekDone}/${d.planned}`} style={{ fontSize: 18, fontWeight: '800', color: hex(c.text) }} />
          <TextWidget text="treinos" style={{ fontSize: 10, color: hex(c.muted) }} />
        </FlexWidget>
      </FlexWidget>
      {warn ? (
        <TextWidget text={warn} maxLines={1} style={{ fontSize: 11, fontWeight: '700', color: hex(c.primary), marginTop: 4 }} />
      ) : null}
    </Shell>
  );
}

export function WaterWidget({ d, c }: { d: WidgetData; c: Palette }) {
  if (!d.ready) return <OpenApp c={c} />;
  const reached = d.waterMl >= d.waterGoalMl;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_URI.home }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: hex(c.card),
        borderRadius: 22,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
        <TextWidget
          text={`💧 ${fmtNum(d.waterMl / 1000)} L`}
          style={{ fontSize: 16, fontWeight: '800', color: hex(reached ? c.accent : c.text) }}
        />
        <TextWidget text={reached ? 'Meta batida!' : `de ${fmtNum(d.waterGoalMl / 1000)} L`} style={{ fontSize: 11, color: hex(c.muted) }} />
      </FlexWidget>
      <FlexWidget
        clickAction="ADD_WATER"
        accessibilityLabel="Adicionar 250 ml de água"
        style={{
          backgroundColor: hex(c.primary),
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget text="+250" style={{ fontSize: 14, fontWeight: '800', color: hex(c.onPrimary) }} />
      </FlexWidget>
    </FlexWidget>
  );
}
