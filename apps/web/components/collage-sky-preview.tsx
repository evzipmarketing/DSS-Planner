"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collagePlateFovDeg,
  equatorialToPixel,
  formatDeclination,
  formatRightAscension,
  objectTitle,
  type CollagePlan,
  type DeepSkyObject,
} from "@dss/core";

const PLATE = 520;
const VIRT = 1000;

type Props = {
  plan: CollagePlan;
  objectsById: Map<string, DeepSkyObject>;
  colors: Map<string, string>;
  showNames?: boolean;
  /** Optional stick-figure edges as star/target id pairs (e.g. asterisms). */
  edges?: ReadonlyArray<readonly [string, string]>;
  /** Override DSS plate FOV (deg). Defaults to collagePlateFovDeg(plan). */
  plateFovDeg?: number;
};

export function CollageSkyPreview({
  plan,
  objectsById,
  colors,
  showNames = true,
  edges = [],
  plateFovDeg,
}: Props) {
  const [plate, setPlate] = useState<{ key: string; url: string } | null>(null);
  const [failureFor, setFailureFor] = useState<string | null>(null);

  const plateFov = plateFovDeg ?? collagePlateFovDeg(plan);
  const requestKey = useMemo(
    () =>
      new URLSearchParams({
        ra: plan.center.raDeg.toFixed(5),
        dec: plan.center.decDeg.toFixed(5),
        fov: plateFov.toFixed(4),
        size: String(PLATE),
      }).toString(),
    [plan.center.raDeg, plan.center.decDeg, plateFov],
  );

  useEffect(() => {
    const controller = new AbortController();
    setPlate(null);
    void fetch(`/api/sky?${requestKey}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("plate");
        setFailureFor((current) => (current === requestKey ? null : current));
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPlate((previous) => {
          if (previous) URL.revokeObjectURL(previous.url);
          return { key: requestKey, url };
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailureFor(requestKey);
      });
    return () => controller.abort();
  }, [requestKey]);

  const imageUrl = plate && plate.key === requestKey ? plate.url : null;
  const failed = failureFor === requestKey;
  const loading = !imageUrl && !failed;

  const projection = {
    raDeg: plan.center.raDeg,
    decDeg: plan.center.decDeg,
    fovDeg: plateFov,
    widthPx: VIRT,
    heightPx: VIRT,
  };

  const frameWPct = (plan.frameWidthDeg / plateFov) * 100;
  const frameHPct = (plan.frameHeightDeg / plateFov) * 100;
  const requiredWPct = (plan.requiredWidthDeg / plateFov) * 100;
  const requiredHPct = (plan.requiredHeightDeg / plateFov) * 100;

  const markers = plan.targets.map((target) => {
    const object = objectsById.get(target.id);
    const point = equatorialToPixel(projection, target.raDeg, target.decDeg);
    const majorPct =
      object?.majorArcmin == null ? 0 : ((object.majorArcmin / 60) / plateFov) * 100;
    const minorPct =
      object?.minorArcmin == null ? majorPct : ((object.minorArcmin / 60) / plateFov) * 100;
    return {
      id: target.id,
      name: target.name,
      x: (point.x / VIRT) * 100,
      y: (point.y / VIRT) * 100,
      majorPct,
      minorPct,
      pa: object?.positionAngleDeg ?? 0,
      color: colors.get(target.id) ?? "var(--accent)",
      title: object ? objectTitle(object) : target.name,
    };
  });

  return (
    <div className="collage-sky">
      <div className="collage-stage mosaic-stage" aria-label="Collage sky framing with DSS survey plate">
        {imageUrl ? (
          <img className="plate" src={imageUrl} alt="DSS2 colour field around collage center" />
        ) : (
          <div className="collage-sky-placeholder">{failed ? "Sky plate unavailable" : "Loading sky…"}</div>
        )}

        <div
          className="collage-fov-box collage-required-box"
          style={{
            width: `${requiredWPct}%`,
            height: `${requiredHPct}%`,
            ["--rot" as string]: `${plan.rotationDeg}deg`,
          }}
          aria-hidden="true"
        />
        <div
          className="collage-fov-box collage-sensor-box"
          style={{
            width: `${frameWPct}%`,
            height: `${frameHPct}%`,
            ["--rot" as string]: `${plan.rotationDeg}deg`,
          }}
          aria-hidden="true"
        />

        {markers.map((marker) =>
          marker.majorPct > 0 ? (
            <span
              key={`ellipse-${marker.id}`}
              className="ellipse collage-target-ellipse"
              style={{
                left: `${marker.x}%`,
                top: `${marker.y}%`,
                width: `${Math.max(marker.minorPct, 1.2)}%`,
                height: `${Math.max(marker.majorPct, 1.2)}%`,
                ["--pa" as string]: `${-marker.pa}deg`,
                borderColor: marker.color,
              }}
            />
          ) : null,
        )}

        <svg className="collage-sky-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map(([fromId, toId]) => {
            const from = markers.find((marker) => marker.id === fromId);
            const to = markers.find((marker) => marker.id === toId);
            if (!from || !to) return null;
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(255,255,255,0.88)"
                strokeWidth={0.55}
                strokeLinecap="round"
              />
            );
          })}
          {markers.map((marker) => (
            <g key={marker.id}>
              <circle cx={marker.x} cy={marker.y} r={1.35} fill={marker.color} stroke="rgba(0,0,0,0.55)" strokeWidth={0.35} />
              {showNames ? (
                <text className="collage-sky-label" x={marker.x + 1.8} y={marker.y - 1.4} fill={marker.color}>
                  {marker.name}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
        <span className="compass n">N</span>
        <span className="compass e">E</span>
      </div>
      <div className="collage-sky-readout mosaic-sky-readout" aria-live="polite">
        <span>
          FOV {plan.frameWidthDeg.toFixed(2)}° × {plan.frameHeightDeg.toFixed(2)}°
        </span>
        <span>
          {formatRightAscension(plan.center.raDeg)} · {formatDeclination(plan.center.decDeg)}
        </span>
        <span>rot {plan.rotationDeg.toFixed(0)}°</span>
        {loading ? <span>Loading plate…</span> : null}
      </div>
    </div>
  );
}
