import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import {
  IMAGEABLE_MIN_ALTITUDE_DEG,
  formatClock,
  type NightTrack,
  type TrackSample,
} from "@dss/core";
import { colors, type ThemeName } from "@/theme/tokens";

const WIDTH = 340;
const HEIGHT = 160;
const PAD = { left: 28, right: 8, top: 10, bottom: 22 };
const Y_MIN = -20;
const Y_MAX = 90;

export function AltitudeChart({
  theme,
  track,
  timezone,
}: {
  theme: ThemeName;
  track: NightTrack | null;
  timezone: string;
}) {
  const c = colors(theme);
  const samples = useMemo(() => darkSamples(track?.samples ?? []), [track]);
  if (!track || samples.length === 0) {
    return <View style={{ height: HEIGHT }} />;
  }
  const start = samples[0]!.time.getTime();
  const end = samples[samples.length - 1]!.time.getTime();
  const target = samples.map((sample) => `${xAt(sample.time.getTime(), start, end)},${yAt(sample.targetAltitude)}`).join(" ");
  const moon = samples.map((sample) => `${xAt(sample.time.getTime(), start, end)},${yAt(sample.moonAltitude)}`).join(" ");
  const labels = pickLabels(samples);
  const moonPeak = samples.reduce((best, sample) => (sample.moonAltitude > best.moonAltitude ? sample : best), samples[0]!);

  return (
    <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {track.usableIntervals.map((interval) => {
        const x0 = Math.max(start, interval.start.getTime());
        const x1 = Math.min(end, interval.end.getTime());
        if (x1 <= x0) return null;
        const x = xAt(x0, start, end);
        const width = Math.max(0, xAt(x1, start, end) - x);
        return (
          <Rect
            key={interval.start.toISOString()}
            x={x}
            y={PAD.top}
            width={width}
            height={HEIGHT - PAD.top - PAD.bottom}
            fill={c.usable}
          />
        );
      })}
      {[0, IMAGEABLE_MIN_ALTITUDE_DEG, 60, 90].map((altitude) => (
        <Line
          key={altitude}
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={yAt(altitude)}
          y2={yAt(altitude)}
          stroke={altitude === 0 ? c.moon : c.lineStrong}
          strokeDasharray={altitude === IMAGEABLE_MIN_ALTITUDE_DEG ? "4 4" : undefined}
        />
      ))}
      <Polyline points={moon} fill="none" stroke={c.moon} strokeWidth={1.5} />
      <G
        transform={`translate(${xAt(moonPeak.time.getTime(), start, end)} ${Math.min(
          HEIGHT - PAD.bottom - 10,
          Math.max(PAD.top + 10, yAt(moonPeak.moonAltitude)),
        )})`}
      >
        <Circle r={8} fill={c.bgRaised} />
        <Circle r={5.5} fill={c.moon} />
        <Circle cx={2.6} r={4.4} fill={c.bgRaised} />
      </G>
      <Polyline points={target} fill="none" stroke={c.accent} strokeWidth={2.2} />
      {labels.map((sample) => (
        <SvgText
          key={sample.time.toISOString()}
          x={xAt(sample.time.getTime(), start, end)}
          y={HEIGHT - 4}
          fill={c.faint}
          fontSize="10"
          textAnchor="middle"
        >
          {formatClock(sample.time, timezone)}
        </SvgText>
      ))}
    </Svg>
  );
}

function darkSamples(samples: TrackSample[]): TrackSample[] {
  const dark = samples.filter((sample) => sample.sunAltitude <= 0);
  return dark.length >= 2 ? dark : samples;
}

function pickLabels(samples: TrackSample[]): TrackSample[] {
  if (samples.length <= 5) return samples;
  const step = Math.max(1, Math.floor(samples.length / 4));
  const labels: TrackSample[] = [];
  for (let index = 0; index < samples.length; index += step) {
    labels.push(samples[index]!);
  }
  const last = samples[samples.length - 1]!;
  if (labels[labels.length - 1] !== last) labels.push(last);
  return labels;
}

function xAt(time: number, start: number, end: number): number {
  const span = Math.max(1, end - start);
  return PAD.left + ((time - start) / span) * (WIDTH - PAD.left - PAD.right);
}

function yAt(altitude: number): number {
  const clamped = Math.min(Y_MAX, Math.max(Y_MIN, altitude));
  return PAD.top + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * (HEIGHT - PAD.top - PAD.bottom);
}
