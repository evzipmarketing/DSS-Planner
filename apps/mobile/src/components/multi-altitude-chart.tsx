import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from "react-native-svg";
import {
  IMAGEABLE_MIN_ALTITUDE_DEG,
  formatClock,
  type NightTrack,
  type TimeInterval,
  type TrackSample,
} from "@dss/core";
import { colors, type ThemeName } from "@/theme/tokens";

const WIDTH = 340;
const HEIGHT = 190;
const PAD = { left: 28, right: 8, top: 16, bottom: 22 };
const Y_MIN = -20;
const Y_MAX = 90;

export type MultiAltitudeSeries = {
  id: string;
  label: string;
  color: string;
  track: NightTrack;
  /** Selected duration windows drawn brighter on the curve. */
  highlightIntervals?: TimeInterval[];
  highlightColor?: string;
};

export function MultiAltitudeChart({
  theme,
  series,
  timezone,
}: {
  theme: ThemeName;
  series: MultiAltitudeSeries[];
  timezone: string;
}) {
  const c = colors(theme);
  const baseSamples = useMemo(() => {
    const first = series[0]?.track.samples ?? [];
    return darkSamples(first);
  }, [series]);

  if (series.length === 0 || baseSamples.length === 0) {
    return <View style={{ height: HEIGHT }} />;
  }

  const start = baseSamples[0]!.time.getTime();
  const end = baseSamples[baseSamples.length - 1]!.time.getTime();
  const moon = baseSamples.map((sample) => `${xAt(sample.time.getTime(), start, end)},${yAt(sample.moonAltitude)}`).join(" ");
  const labels = pickLabels(baseSamples);
  const moonPeak = baseSamples.reduce(
    (best, sample) => (sample.moonAltitude > best.moonAltitude ? sample : best),
    baseSamples[0]!,
  );

  return (
    <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
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
      <Polyline points={moon} fill="none" stroke={c.moon} strokeWidth={1.4} opacity={0.85} />
      <G
        transform={`translate(${xAt(moonPeak.time.getTime(), start, end)} ${clampY(yAt(moonPeak.moonAltitude))})`}
      >
        <Circle r={8} fill={c.bgRaised} />
        <Circle r={5.5} fill={c.moon} />
        <Circle cx={2.6} r={4.4} fill={c.bgRaised} />
      </G>
      {series.map((item) => {
        const samples = darkSamples(item.track.samples);
        if (samples.length < 2) return null;
        const fullPoints = samples
          .map((sample) => `${xAt(sample.time.getTime(), start, end)},${yAt(sample.targetAltitude)}`)
          .join(" ");
        const highlight = item.highlightIntervals ?? [];
        const highlightChunks = polylineChunksInIntervals(samples, highlight, start, end);
        const labelSample = labelSampleForSeries(samples, highlight);
        const labelX = xAt(labelSample.time.getTime(), start, end);
        const labelY = Math.max(PAD.top + 10, yAt(labelSample.targetAltitude) - 8);
        return (
          <G key={item.id}>
            <Polyline points={fullPoints} fill="none" stroke={item.color} strokeWidth={1.6} opacity={0.35} />
            {highlightChunks.map((points, index) => (
              <Polyline
                key={`${item.id}-hi-${index}`}
                points={points}
                fill="none"
                stroke={item.highlightColor ?? "#fff2c8"}
                strokeWidth={2.8}
              />
            ))}
            <SvgText
              x={labelX}
              y={labelY}
              fill={item.color}
              fontSize="9"
              fontWeight="600"
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          </G>
        );
      })}
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

function labelSampleForSeries(samples: TrackSample[], highlight: TimeInterval[]): TrackSample {
  if (highlight.length > 0) {
    const mid = highlight[0]!.start.getTime() + (highlight[0]!.end.getTime() - highlight[0]!.start.getTime()) / 2;
    let best = samples[0]!;
    let bestDist = Math.abs(best.time.getTime() - mid);
    for (const sample of samples) {
      const dist = Math.abs(sample.time.getTime() - mid);
      if (dist < bestDist) {
        best = sample;
        bestDist = dist;
      }
    }
    return best;
  }
  return samples.reduce((best, sample) => (sample.targetAltitude > best.targetAltitude ? sample : best), samples[0]!);
}

function polylineChunksInIntervals(
  samples: TrackSample[],
  intervals: TimeInterval[],
  start: number,
  end: number,
): string[] {
  if (intervals.length === 0 || samples.length < 2) return [];
  const chunks: string[] = [];
  let current: string[] = [];
  for (const sample of samples) {
    const t = sample.time.getTime();
    if (inAnyInterval(t, intervals)) {
      current.push(`${xAt(t, start, end)},${yAt(sample.targetAltitude)}`);
    } else if (current.length >= 2) {
      chunks.push(current.join(" "));
      current = [];
    } else {
      current = [];
    }
  }
  if (current.length >= 2) chunks.push(current.join(" "));
  return chunks;
}

function inAnyInterval(timeMs: number, intervals: TimeInterval[]): boolean {
  return intervals.some((interval) => timeMs >= interval.start.getTime() && timeMs <= interval.end.getTime());
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

function clampY(y: number): number {
  return Math.min(HEIGHT - PAD.bottom - 10, Math.max(PAD.top + 10, y));
}
