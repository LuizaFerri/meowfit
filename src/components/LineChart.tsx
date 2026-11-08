import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from './ThemeProvider';

type Point = { label: string; value: number };

export function LineChart({
  data,
  color,
  unit = '',
  height = 160,
}: {
  data: Point[];
  color?: string;
  unit?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const stroke = color ?? colors.primary;
  const [width, setWidth] = useState(0);
  if (data.length === 0) return null;

  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const values = data.map((d) => d.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.1;
  max += span * 0.1;

  const w = Math.max(0, width - padL - padR);
  const h = height - padT - padB;
  const x = (i: number) => padL + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * h;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const fmt = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
  const last = data[data.length - 1];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {[max, (max + min) / 2, min].map((v, i) => (
            <Line key={i} x1={padL} x2={width - padR} y1={y(v)} y2={y(v)} stroke={colors.border} strokeWidth={1} />
          ))}
          {[max, min].map((v, i) => (
            <SvgText key={i} x={padL - 6} y={y(v) + 4} fontSize={11} fill={colors.muted} textAnchor="end">
              {fmt(v)}
            </SvgText>
          ))}
          <Path d={path} stroke={stroke} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, i) => (
            <Circle key={i} cx={x(i)} cy={y(d.value)} r={i === data.length - 1 ? 4.5 : 3} fill={stroke} />
          ))}
          <SvgText x={x(0)} y={height - 4} fontSize={11} fill={colors.muted} textAnchor={data.length === 1 ? 'middle' : 'start'}>
            {data[0].label}
          </SvgText>
          {data.length > 1 && (
            <SvgText x={x(data.length - 1)} y={height - 4} fontSize={11} fill={colors.muted} textAnchor="end">
              {last.label}
            </SvgText>
          )}
        </Svg>
      )}
      <Text style={{ position: 'absolute', right: padR, top: 0, fontSize: 13, fontWeight: '600', color: stroke }}>
        {fmt(last.value)}
        {unit}
      </Text>
    </View>
  );
}
