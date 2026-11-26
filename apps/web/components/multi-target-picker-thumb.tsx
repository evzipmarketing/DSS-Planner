"use client";

import { useEffect, useRef, useState } from "react";

function skySrc(
  raDeg: number,
  decDeg: number,
  majorArcmin: number | null,
  fovDeg: number | undefined,
  size = 96,
): string {
  const fov =
    fovDeg != null && Number.isFinite(fovDeg)
      ? Math.min(20, Math.max(0.05, fovDeg))
      : Math.min(6, Math.max(0.12, ((majorArcmin ?? 15) / 60) * 1.8));
  return `/api/sky?ra=${raDeg.toFixed(4)}&dec=${decDeg.toFixed(4)}&fov=${fov.toFixed(3)}&size=${size}`;
}

export function MultiTargetPickerThumb({
  raDeg,
  decDeg,
  majorArcmin,
  fovDeg,
  label,
  selected,
  disabled,
  accent,
  onPress,
}: {
  raDeg: number;
  decDeg: number;
  majorArcmin: number | null;
  /** When set, used as plate FOV instead of the object-size heuristic. */
  fovDeg?: number;
  label: string;
  selected: boolean;
  disabled?: boolean;
  accent?: string;
  onPress: () => void;
}) {
  const host = useRef<HTMLButtonElement>(null);
  const [show, setShow] = useState(false);
  const src = skySrc(raDeg, decDeg, majorArcmin, fovDeg);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const img = new Image();
        img.onload = () => {
          if (!cancelled) setShow(true);
        };
        img.onerror = () => {
          if (!cancelled) setShow(false);
        };
        img.src = src;
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [src]);

  return (
    <button
      ref={host}
      type="button"
      className={`multi-target-thumb${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onPress}
      style={selected && accent ? { borderColor: accent } : undefined}
    >
      <span className="multi-target-thumb-frame">
        {show ? <img src={src} alt="" /> : <span className="multi-target-thumb-placeholder" />}
      </span>
      <span className="multi-target-thumb-label">{label}</span>
    </button>
  );
}
