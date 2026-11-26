"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  centerAfterSensorDrag,
  clampMosaicZoom,
  equatorialToPixel,
  formatDeclination,
  formatRightAscension,
  mosaicPlateFovDeg,
  objectTitle,
  type DeepSkyObject,
  type MosaicPlan,
  type MosaicRaDec,
} from "@dss/core";

const PLATE = 520;
const VIRT = 1000;

type Props = {
  object: DeepSkyObject;
  plan: MosaicPlan;
  center: MosaicRaDec;
  onCenterChange: (next: MosaicRaDec) => void;
  rotationDeg: number;
  onRotationChange: (deg: number) => void;
  zoom?: number;
};

export function MosaicSkyPreview({
  object,
  plan,
  center,
  onCenterChange,
  rotationDeg,
  onRotationChange,
  zoom = 1,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [plate, setPlate] = useState<{ key: string; url: string } | null>(null);
  const [failureFor, setFailureFor] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState(PLATE);
  const drag = useRef<
    | { mode: "pan"; id: number; x: number; y: number; baseX: number; baseY: number }
    | { mode: "rotate"; id: number; startAngle: number; startRotation: number }
    | null
  >(null);

  const zoomFactor = clampMosaicZoom(zoom);
  // Zoom out: fetch a wider plate so sky still fills the stage.
  // Zoom in: keep the fit plate and scale the view (instant, no refetch).
  const plateFov = mosaicPlateFovDeg(plan, Math.min(1, zoomFactor));
  const viewScale = Math.max(1, zoomFactor);
  const requestKey = useMemo(
    () =>
      new URLSearchParams({
        ra: center.raDeg.toFixed(5),
        dec: center.decDeg.toFixed(5),
        fov: plateFov.toFixed(4),
        size: String(PLATE),
      }).toString(),
    [center.raDeg, center.decDeg, plateFov],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => setStageSize(stage.getBoundingClientRect().width || PLATE);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
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

  const projection = {
    raDeg: center.raDeg,
    decDeg: center.decDeg,
    fovDeg: plateFov,
    widthPx: VIRT,
    heightPx: VIRT,
  };

  const objectPoint = equatorialToPixel(projection, object.raDeg, object.decDeg);
  const majorPct =
    object.majorArcmin == null ? 0 : ((object.majorArcmin / 60) / plateFov) * 100;
  const minorPct =
    object.minorArcmin == null ? majorPct : ((object.minorArcmin / 60) / plateFov) * 100;

  const panelShapes = plan.panels.map((panel) => {
    const corners = panel.polygon.map((corner) => equatorialToPixel(projection, corner.raDeg, corner.decDeg));
    const centerPx = equatorialToPixel(projection, panel.raDeg, panel.decDeg);
    return {
      key: panel.label,
      index: panel.index + 1,
      points: corners.map((pt) => `${(pt.x / VIRT) * 100},${(pt.y / VIRT) * 100}`).join(" "),
      cx: (centerPx.x / VIRT) * 100,
      cy: (centerPx.y / VIRT) * 100,
    };
  });

  const outerPts = plan.outerPolygon.map((corner) => equatorialToPixel(projection, corner.raDeg, corner.decDeg));
  const brackets = cornerBrackets(outerPts.map((pt) => ({ x: (pt.x / VIRT) * 100, y: (pt.y / VIRT) * 100 })));

  const handlePx = (() => {
    const midTop = {
      x: (outerPts[0]!.x + outerPts[1]!.x) / 2,
      y: (outerPts[0]!.y + outerPts[1]!.y) / 2,
    };
    return { x: (midTop.x / VIRT) * 100, y: (midTop.y / VIRT) * 100 };
  })();

  function commitPan(dx: number, dy: number) {
    const stage = stageRef.current;
    if (!stage) return;
    const bounds = stage.getBoundingClientRect();
    const scale = Math.max(0.01, viewScale);
    const next = centerAfterSensorDrag(
      {
        raDeg: center.raDeg,
        decDeg: center.decDeg,
        fovDeg: plateFov,
        widthPx: bounds.width,
        heightPx: bounds.height,
      },
      dx / scale,
      dy / scale,
    );
    onCenterChange({
      raDeg: next.raDeg,
      decDeg: Math.min(85, Math.max(-85, next.decDeg)),
    });
    setOffset({ x: 0, y: 0 });
  }

  function wrapRotation(value: number) {
    let next = value % 360;
    if (next < 0) next += 360;
    return next;
  }

  return (
    <div className="mosaic-sky">
      <div
        ref={stageRef}
        className="mosaic-stage"
        tabIndex={0}
        aria-label="Mosaic preview. Drag the grid to pan. Drag the handle to rotate."
        onKeyDown={(event) => {
          const step = 28;
          if (event.key === "ArrowLeft") commitPan(-step, 0);
          else if (event.key === "ArrowRight") commitPan(step, 0);
          else if (event.key === "ArrowUp") commitPan(0, -step);
          else if (event.key === "ArrowDown") commitPan(0, step);
          else if (event.key === "[") onRotationChange(wrapRotation(rotationDeg - 5));
          else if (event.key === "]") onRotationChange(wrapRotation(rotationDeg + 5));
          else return;
          event.preventDefault();
        }}
      >
        <div className="mosaic-zoom-scale" style={{ transform: `scale(${viewScale})` }}>
          {imageUrl && !failed ? (
            <img className="plate" src={imageUrl} alt={`Sky plate around ${objectTitle(object)}`} />
          ) : null}
          {majorPct > 0 ? (
            <span
              className="ellipse"
              style={{
                left: `${objectPoint.x / 10}%`,
                top: `${objectPoint.y / 10}%`,
                width: `${minorPct}%`,
                height: `${majorPct}%`,
                ["--pa" as string]: `${-(object.positionAngleDeg ?? 0)}deg`,
              }}
            />
          ) : null}

          {/* Drag moves mosaic overlays only; sky plate stays fixed until release. */}
          <div
            className="mosaic-zoom-pan"
            style={{
              // Offset is screen pixels; divide so scale(viewScale) keeps 1:1 finger tracking.
              transform: `translate(${offset.x / viewScale}px, ${offset.y / viewScale}px)`,
            }}
          >
            <svg
              className="mosaic-overlay"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).dataset.handle === "rotate") return;
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = {
                  mode: "pan",
                  id: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  baseX: offset.x,
                  baseY: offset.y,
                };
              }}
              onPointerMove={(event) => {
                const current = drag.current;
                if (!current || current.id !== event.pointerId) return;
                if (current.mode === "pan") {
                  setOffset({
                    x: current.baseX + event.clientX - current.x,
                    y: current.baseY + event.clientY - current.y,
                  });
                  return;
                }
                const stage = stageRef.current;
                if (!stage) return;
                const bounds = stage.getBoundingClientRect();
                const angle = Math.atan2(
                  event.clientY - (bounds.top + bounds.height / 2),
                  event.clientX - (bounds.left + bounds.width / 2),
                );
                onRotationChange(wrapRotation(current.startRotation + (angle * 180) / Math.PI - current.startAngle));
              }}
              onPointerUp={(event) => {
                const current = drag.current;
                drag.current = null;
                if (current?.mode === "pan" && current.id === event.pointerId) {
                  commitPan(current.baseX + event.clientX - current.x, current.baseY + event.clientY - current.y);
                }
              }}
            >
              {brackets.map((d, index) => (
                <path key={`bracket-${index}`} className="mosaic-bracket" d={d} />
              ))}
              {panelShapes.map((panel) => (
                <g key={panel.key}>
                  <polygon className="mosaic-panel-poly" points={panel.points} />
                  <text
                    className="mosaic-panel-label"
                    x={panel.cx}
                    y={panel.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {panel.index}
                  </text>
                </g>
              ))}
              <circle
                className="mosaic-rotate-hit"
                cx={handlePx.x}
                cy={handlePx.y}
                r={Math.max(2.2, (14 / Math.max(stageSize, 1)) * 100)}
                data-handle="rotate"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const stage = stageRef.current;
                  if (!stage) return;
                  const bounds = stage.getBoundingClientRect();
                  const angle = Math.atan2(
                    event.clientY - (bounds.top + bounds.height / 2),
                    event.clientX - (bounds.left + bounds.width / 2),
                  );
                  drag.current = {
                    mode: "rotate",
                    id: event.pointerId,
                    startAngle: (angle * 180) / Math.PI,
                    startRotation: rotationDeg,
                  };
                  (event.currentTarget as Element).setPointerCapture(event.pointerId);
                }}
              />
              <circle className="mosaic-rotate-handle" cx={handlePx.x} cy={handlePx.y} r={1.4} />
            </svg>
          </div>
        </div>
        <span className="compass n">N</span>
        <span className="compass e">E</span>
      </div>

      <div className="mosaic-sky-readout" aria-live="polite">
        <span>
          Mosaic {plan.mosaicWidthDeg.toFixed(2)}° × {plan.mosaicHeightDeg.toFixed(2)}°
        </span>
        <span>
          Panel {plan.panelFov.widthDeg.toFixed(2)}° × {plan.panelFov.heightDeg.toFixed(2)}°
        </span>
        <span>
          {formatRightAscension(center.raDeg)} · {formatDeclination(center.decDeg)}
        </span>
      </div>
    </div>
  );
}

function cornerBrackets(corners: Array<{ x: number; y: number }>): string[] {
  // corners: NW, NE, SE, SW
  const [nw, ne, se, sw] = corners;
  if (!nw || !ne || !se || !sw) return [];
  const arm = 3.2;
  function bracket(corner: { x: number; y: number }, alongA: { x: number; y: number }, alongB: { x: number; y: number }) {
    const a = unitToward(corner, alongA, arm);
    const b = unitToward(corner, alongB, arm);
    return `M ${a.x} ${a.y} L ${corner.x} ${corner.y} L ${b.x} ${b.y}`;
  }
  return [
    bracket(nw, ne, sw),
    bracket(ne, nw, se),
    bracket(se, ne, sw),
    bracket(sw, se, nw),
  ];
}

function unitToward(from: { x: number; y: number }, to: { x: number; y: number }, length: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const hyp = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / hyp) * length, y: from.y + (dy / hyp) * length };
}
