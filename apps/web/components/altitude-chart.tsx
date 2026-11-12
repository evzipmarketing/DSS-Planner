"use client";

import { formatClock, formatHours, objectTitle } from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

const WIDTH = 640;
const HEIGHT = 250;
const PAD = { left: 36, right: 8, top: 12, bottom: 24 };
const Y_MIN = -20;
const Y_MAX = 90;

export function AltitudeChart() {
  const { selected, track, site } = usePlannerState();
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
            ? "It does not stay above 30° while the sun is below −18°."
            : `Usable ${track.usableIntervals
                .map((interval) => `${formatClock(interval.start, site.timezone)}–${formatClock(interval.end, site.timezone)}`)
                .join(", ")} (${formatHours(track.usableHours)}).`
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
            {[0, 30, 60, 90].map((altitude) => (
              <g key={altitude}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={yAt(altitude)}
                  y2={yAt(altitude)}
                  stroke={altitude === 0 ? "var(--sage)" : "var(--line-strong)"}
                  strokeDasharray={altitude === 30 ? "4 4" : undefined}
                />
                <text x={4} y={yAt(altitude) + 4} fill="var(--faint)" fontSize="11">
                  {altitude}°
                </text>
              </g>
            ))}
            <polyline fill="none" stroke="var(--moon)" strokeWidth="1.5" points={moon} />
            <polyline fill="none" stroke="var(--saffron)" strokeWidth="2.2" points={target} />
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
            <span className="swatch"><i style={{ background: "var(--saffron)" }} /> Target</span>
            <span className="swatch"><i style={{ background: "var(--moon)" }} /> Moon</span>
            <span className="swatch"><i style={{ background: "var(--sage)" }} /> Horizon</span>
            <span className="swatch"><i style={{ background: "var(--usable)", height: 10 }} /> Usable, above 30° and sun below −18°</span>
          </div>
        </div>
      ) : null}
    </Section>
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
