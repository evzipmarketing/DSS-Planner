"use client";

import { useEffect, useRef, useState } from "react";
import { centerAfterSensorDrag, equatorialToPixel, objectTitle } from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

const PLATE = 520;

export function FramingPreview() {
  const { selected, pointing, setPointing, optics } = usePlannerState();
  const stageRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [failureFor, setFailureFor] = useState<string | null>(null);
  const drag = useRef<
    | { mode: "pan"; id: number; x: number; y: number; baseX: number; baseY: number }
    | { mode: "rotate"; id: number; startAngle: number; startRotation: number }
    | null
  >(null);

  const plateRa = pointing?.raDeg;
  const plateDec = pointing?.decDeg;
  const plateFov = optics?.imageFovDeg;

  useEffect(() => {
    if (plateRa == null || plateDec == null || plateFov == null) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      ra: plateRa.toFixed(5),
      dec: plateDec.toFixed(5),
      fov: plateFov.toFixed(4),
      size: String(PLATE),
    });
    const requestKey = params.toString();
    void fetch(`/api/sky?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("plate");
        setSource(response.headers.get("x-sky-source"));
        setFailureFor((current) => (current === requestKey ? null : current));
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return url;
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailureFor(requestKey);
      });
    return () => controller.abort();
  }, [plateRa, plateDec, plateFov]);

  const requestKey =
    plateRa == null || plateDec == null || plateFov == null
      ? null
      : new URLSearchParams({
          ra: plateRa.toFixed(5),
          dec: plateDec.toFixed(5),
          fov: plateFov.toFixed(4),
          size: String(PLATE),
        }).toString();
  const failed = requestKey != null && failureFor === requestKey;

  if (!selected || !pointing || !optics) {
    return (
      <Section index="09" title="Frame">
        <p className="note">Choose a target and a rig to preview the sensor on the sky.</p>
      </Section>
    );
  }

  const virtual = {
    raDeg: pointing.raDeg,
    decDeg: pointing.decDeg,
    fovDeg: optics.imageFovDeg,
    widthPx: 1000,
    heightPx: 1000,
  };
  const objectPoint = equatorialToPixel(virtual, selected.raDeg, selected.decDeg);
  const major = selected.majorArcmin == null ? 0 : ((selected.majorArcmin / 60) / optics.imageFovDeg) * 100;
  const minor =
    selected.minorArcmin == null ? major : ((selected.minorArcmin / 60) / optics.imageFovDeg) * 100;
  const widthPct = (optics.field.widthDeg / optics.imageFovDeg) * 100;
  const heightPct = (optics.field.heightDeg / optics.imageFovDeg) * 100;

  function commitPan(dx: number, dy: number) {
    const stage = stageRef.current;
    if (!stage || !pointing || !optics) return;
    const bounds = stage.getBoundingClientRect();
    const next = centerAfterSensorDrag(
      {
        raDeg: pointing.raDeg,
        decDeg: pointing.decDeg,
        fovDeg: optics.imageFovDeg,
        widthPx: bounds.width,
        heightPx: bounds.height,
      },
      dx,
      dy,
    );
    const decDeg = Math.min(85, Math.max(-85, next.decDeg));
    setPointing({ ...pointing, raDeg: next.raDeg, decDeg });
    setOffset({ x: 0, y: 0 });
  }

  return (
    <Section index="09" title="Frame">
      <div
        ref={stageRef}
        className="stage"
        tabIndex={0}
        aria-label="Framing preview. Drag the sensor to pan. Drag the handle to rotate."
        onKeyDown={(event) => {
          const step = 28;
          if (event.key === "ArrowLeft") commitPan(-step, 0);
          else if (event.key === "ArrowRight") commitPan(step, 0);
          else if (event.key === "ArrowUp") commitPan(0, -step);
          else if (event.key === "ArrowDown") commitPan(0, step);
          else if (event.key === "[") setPointing({ ...pointing, rotationDeg: pointing.rotationDeg - 5 });
          else if (event.key === "]") setPointing({ ...pointing, rotationDeg: pointing.rotationDeg + 5 });
          else return;
          event.preventDefault();
        }}
      >
        {imageUrl && !failed ? <img className="plate" src={imageUrl} alt={`DSS2 colour field around ${objectTitle(selected)}`} /> : null}
        <span className="compass n">N</span>
        <span className="compass e">E</span>
        {major > 0 ? (
          <span
            className="ellipse"
            style={{
              left: `${objectPoint.x / 10}%`,
              top: `${objectPoint.y / 10}%`,
              width: `${minor}%`,
              height: `${major}%`,
              ["--pa" as string]: `${-(selected.positionAngleDeg ?? 0)}deg`,
            }}
          />
        ) : null}
        <div
          className="sensor"
          style={{
            width: `${widthPct}%`,
            height: `${heightPct}%`,
            ["--dx" as string]: `${offset.x}px`,
            ["--dy" as string]: `${offset.y}px`,
            ["--rot" as string]: `${pointing.rotationDeg}deg`,
          }}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).dataset.handle === "rotate") return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { mode: "pan", id: event.pointerId, x: event.clientX, y: event.clientY, baseX: offset.x, baseY: offset.y };
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current || current.id !== event.pointerId) return;
            if (current.mode === "pan") {
              setOffset({ x: current.baseX + event.clientX - current.x, y: current.baseY + event.clientY - current.y });
            } else if (stageRef.current) {
              const bounds = stageRef.current.getBoundingClientRect();
              const angle = Math.atan2(event.clientY - (bounds.top + bounds.height / 2), event.clientX - (bounds.left + bounds.width / 2));
              const degrees = (angle * 180) / Math.PI;
              setPointing({ ...pointing, rotationDeg: current.startRotation + degrees - current.startAngle });
            }
          }}
          onPointerUp={(event) => {
            const current = drag.current;
            drag.current = null;
            if (current?.mode === "pan" && current.id === event.pointerId) {
              commitPan(current.baseX + event.clientX - current.x, current.baseY + event.clientY - current.y);
            }
          }}
        >
          <button
            type="button"
            className="handle"
            data-handle="rotate"
            aria-label="Rotate the sensor"
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
                startRotation: pointing.rotationDeg,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const current = drag.current;
              const stage = stageRef.current;
              if (!current || current.mode !== "rotate" || current.id !== event.pointerId || !stage) return;
              const bounds = stage.getBoundingClientRect();
              const angle = Math.atan2(
                event.clientY - (bounds.top + bounds.height / 2),
                event.clientX - (bounds.left + bounds.width / 2),
              );
              setPointing({
                ...pointing,
                rotationDeg: current.startRotation + (angle * 180) / Math.PI - current.startAngle,
              });
            }}
            onPointerUp={(event) => {
              if (drag.current?.id === event.pointerId) drag.current = null;
            }}
          />
        </div>
      </div>
      <div className="tools">
        <button type="button" className="ghost" onClick={() => setPointing({ ...pointing, rotationDeg: pointing.rotationDeg - 5 })}>
          Rotate −5°
        </button>
        <button type="button" className="ghost" onClick={() => setPointing({ ...pointing, rotationDeg: pointing.rotationDeg + 5 })}>
          Rotate +5°
        </button>
        <label className="field" style={{ width: "auto" }}>
          Angle
          <input
            type="number"
            value={Math.round(pointing.rotationDeg)}
            onChange={(event) => {
              const rotationDeg = Number(event.target.value);
              if (Number.isFinite(rotationDeg)) setPointing({ ...pointing, rotationDeg });
            }}
          />
        </label>
        <button
          type="button"
          className="ghost"
          onClick={() => setPointing({ raDeg: selected.raDeg, decDeg: selected.decDeg, rotationDeg: 0 })}
        >
          Centre on target
        </button>
      </div>
      <p className="note">
        North is up and east is left. The rectangle is the sensor and the ellipse is the catalogue size. Drag the rectangle
        to point the rig, or the handle to rotate it. Arrow keys pan when the frame is focused.
      </p>
      <p className="note">
        {failed
          ? "The sky plate did not load. The frame is still drawn to scale."
          : source === "hips2fits"
            ? "DSS2 colour from CDS hips2fits."
            : source === "hips-tiles"
              ? "DSS2 colour HiPS tiles from CDS/P/DSS2/color. hips2fits did not answer, so the plate is built from a public tile mirror."
              : "Loading the DSS2 colour plate…"}{" "}
        Digitized Sky Survey, STScI/NASA, coloured by CDS.
      </p>
    </Section>
  );
}
