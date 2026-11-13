"use client";

import {
  ASTRONOMICAL_SUN_ALTITUDE_DEG,
  IMAGEABLE_MIN_ALTITUDE_DEG,
  formatClock,
  formatImageableHours,
  objectTitle,
} from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

const WIDTH = 640;
const HEIGHT = 250;
const PAD = { left: 36, right: 8, top: 12, bottom: 24 };
const Y_MIN = -20;
const Y_MAX = 90;
const ALTITUDE_MARKS = [0, IMAGEABLE_MIN_ALTITUDE_DEG, 60, 90];

export function AltitudeChart() {
  const { selected, track, site, theme } = usePlannerState();
  const horizon = theme === "night" ? "var(--sage)" : "var(--moon)";
  const samples = track?.samples ?? [];
  const start = samples[0]?.time.getTime() ?? 0;
  const end = samples[samples.length - 1]?.time.getTime() ?? 1;

  const target = samples.map((sample) => `${xAt(sample.time.getTime(), start, end)},${yAt(sample.targetAltitude)}`).join(" ");
  const moon = samples.map((sample) => `${xAt(sample.time.getTime(), start, end)},${yAt(sample.moonAltitude)}`).join(" ");
  const labels = samples.filter((_, index) => index % 18 === 0);

  const summary = !selected
    ? "Choose a target to plot altitude."
    : !track
      ? "Computing the night."
      : `${objectTitle(selected)} reaches ${Math.round(track.maxTargetAltitude)}°. ${
          track.usableIntervals.length === 0
            ? `It does not stay above ${IMAGEABLE_MIN_ALTITUDE_DEG}° while the sun is below −${Math.abs(ASTRONOMICAL_SUN_ALTITUDE_DEG)}°.`
            : `Imageable ${track.usableIntervals
                .map((interval) => `${formatClock(interval.start, site.timezone)}–${formatClock(interval.end, site.timezone)}`)
                .join(", ")} (${formatImageableHours(track.usableHours)}).`
        } Moon is ${track.moonPhaseName.toLowerCase()}, ${Math.round(track.moonIlluminatedFraction * 100)}% lit.`;

  return (
    <Section index="08" title="Altitude">
      <p>{summary}</p>
      {track && samples.length > 0 ? (
        <div className="chart-wrap">
          <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
            {track.usableIntervals.map((interval) => {
              const x = xAt(interval.start.getTime(), start, end);
              const width = Math.max(0, xAt(interval.end.getTime(), start, end) - x);
              return <rect key={interval.start.toISOString()} x={x} y={PAD.top} width={width} height={HEIGHT - PAD.top - PAD.bottom} fill="var(--usable)" />;
            })}
            {ALTITUDE_MARKS.map((altitude) => (
              <g key={altitude}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={yAt(altitude)}
                  y2={yAt(altitude)}
                  stroke={altitude === 0 ? horizon : "var(--line-strong)"}
                  strokeDasharray={altitude === IMAGEABLE_MIN_ALTITUDE_DEG ? "4 4" : undefined}
                />
                <text x={4} y={yAt(altitude) + 4} fill="var(--faint)" fontSize="11">
                  {altitude}°
                </text>
              </g>
            ))}
            <polyline fill="none" stroke="var(--moon)" strokeWidth="1.5" points={moon} />
            <MoonMark samples={samples} start={start} end={end} />
            <polyline fill="none" stroke="var(--accent-text)" strokeWidth="2.2" points={target} />
            {labels.map((sample) => (
              <text
                key={sample.time.toISOString()}
                x={xAt(sample.time.getTime(), start, end)}
                y={HEIGHT - 6}
                fill="var(--faint)"
                fontSize="11"
                textAnchor="middle"
              >
                {formatClock(sample.time, site.timezone)}
              </text>
            ))}
          </svg>
          <div className="legend">
            <span className="swatch"><i style={{ background: "var(--accent-text)" }} /> Target</span>
            <span className="swatch">
              <MoonGlyph />
              Moon
            </span>
            <span className="swatch"><i style={{ background: horizon }} /> Horizon</span>
            <span className="swatch"><i style={{ background: "var(--usable)", height: 10 }} /> Imageable, above {IMAGEABLE_MIN_ALTITUDE_DEG}° and sun below −{Math.abs(ASTRONOMICAL_SUN_ALTITUDE_DEG)}°</span>
          </div>
        </div>
      ) : null}
    </Section>
  );
}

function MoonMark({
  samples,
  start,
  end,
}: {
  samples: { time: Date; moonAltitude: number }[];
  start: number;
  end: number;
}) {
  const first = samples[0];
  if (!first) return null;
  const peak = samples.reduce((best, sample) => (sample.moonAltitude > best.moonAltitude ? sample : best), first);
  const x = xAt(peak.time.getTime(), start, end);
  const y = Math.min(HEIGHT - PAD.bottom - 10, Math.max(PAD.top + 10, yAt(peak.moonAltitude)));
  return (
    <g className="moon-mark" transform={`translate(${x} ${y})`}>
      <circle r="9" fill="var(--bg)" />
      <MoonPath />
    </g>
  );
}

function MoonGlyph() {
  return (
    <svg className="moon-glyph" viewBox="-8 -8 16 16" width="14" height="14" aria-hidden="true">
      <MoonPath />
    </svg>
  );
}

function MoonPath() {
  return (
    <g>
      <circle r="6.4" fill="var(--moon)" />
      <circle cx="3.1" r="5.2" fill="var(--bg)" />
    </g>
  );
}

function xAt(time: number, start: number, end: number): number {
  const span = Math.max(1, end - start);
  return PAD.left + ((time - start) / span) * (WIDTH - PAD.left - PAD.right);
}

function yAt(altitude: number): number {
  const clamped = Math.min(Y_MAX, Math.max(Y_MIN, altitude));
  return PAD.top + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * (HEIGHT - PAD.top - PAD.bottom);
}
