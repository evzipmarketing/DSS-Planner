const DEG = Math.PI / 180;

export type TanProjection = {
  raDeg: number;
  decDeg: number;
  /** Angular size of the longest image side. */
  fovDeg: number;
  widthPx: number;
  heightPx: number;
};

export function tanDegreesPerPixel(projection: TanProjection): number {
  return projection.fovDeg / Math.max(projection.widthPx, projection.heightPx);
}

function wrapDeltaRad(delta: number): number {
  return Math.atan2(Math.sin(delta), Math.cos(delta));
}

/**
 * Gnomonic projection, north up and east left, matching hips2fits at rotation 0.
 */
export function equatorialToPixel(
  projection: TanProjection,
  raDeg: number,
  decDeg: number,
): { x: number; y: number } {
  const dec0 = projection.decDeg * DEG;
  const ra0 = projection.raDeg * DEG;
  const dec = decDeg * DEG;
  const dra = wrapDeltaRad(raDeg * DEG - ra0);
  const cosDec = Math.cos(dec);
  const sinDec = Math.sin(dec);
  const cosDec0 = Math.cos(dec0);
  const sinDec0 = Math.sin(dec0);
  const cosDra = Math.cos(dra);
  const denom = sinDec * sinDec0 + cosDec * cosDec0 * cosDra;
  const xi = (cosDec * Math.sin(dra)) / denom;
  const eta = (sinDec * cosDec0 - cosDec * sinDec0 * cosDra) / denom;
  const scale = tanDegreesPerPixel(projection) * DEG;
  return {
    x: projection.widthPx / 2 - xi / scale,
    y: projection.heightPx / 2 - eta / scale,
  };
}

export function pixelToEquatorial(
  projection: TanProjection,
  x: number,
  y: number,
): { raDeg: number; decDeg: number } {
  const scale = tanDegreesPerPixel(projection) * DEG;
  const xi = -(x - projection.widthPx / 2) * scale;
  const eta = -(y - projection.heightPx / 2) * scale;
  const dec0 = projection.decDeg * DEG;
  const ra0 = projection.raDeg * DEG;
  const rho = Math.hypot(xi, eta);
  if (rho < 1e-12) {
    return { raDeg: projection.raDeg, decDeg: projection.decDeg };
  }
  const c = Math.atan(rho);
  const sinC = Math.sin(c);
  const cosC = Math.cos(c);
  const dec = Math.asin(cosC * Math.sin(dec0) + (eta * sinC * Math.cos(dec0)) / rho);
  const ra =
    ra0 +
    Math.atan2(
      xi * sinC,
      rho * cosC * Math.cos(dec0) - eta * sinC * Math.sin(dec0),
    );
  let raDeg = (ra / DEG) % 360;
  if (raDeg < 0) raDeg += 360;
  return { raDeg, decDeg: dec / DEG };
}

export function centerAfterSensorDrag(
  projection: TanProjection,
  dragXPx: number,
  dragYPx: number,
): { raDeg: number; decDeg: number } {
  return pixelToEquatorial(
    projection,
    projection.widthPx / 2 + dragXPx,
    projection.heightPx / 2 + dragYPx,
  );
}
