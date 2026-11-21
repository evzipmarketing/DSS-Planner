export type LookDirection = {
  azimuthDeg: number;
  altitudeDeg: number;
};

export type Vec3 = { x: number; y: number; z: number };

export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function shortestDelta(fromDeg: number, toDeg: number): number {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

/** Alt/az to unit vector: +Y north, +X east, +Z up. */
export function altAzToVec(azimuthDeg: number, altitudeDeg: number): Vec3 {
  const az = (azimuthDeg * Math.PI) / 180;
  const alt = (altitudeDeg * Math.PI) / 180;
  const cosAlt = Math.cos(alt);
  return {
    x: cosAlt * Math.sin(az),
    y: cosAlt * Math.cos(az),
    z: Math.sin(alt),
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function norm(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/**
 * Project alt/az into screen coords using a look-centered stereographic view.
 * Returns null when the point is more than ~90° from the look direction.
 */
export function projectToScreen(
  azimuthDeg: number,
  altitudeDeg: number,
  look: LookDirection,
  width: number,
  height: number,
  fovDeg = 90,
): { x: number; y: number } | null {
  const target = altAzToVec(azimuthDeg, altitudeDeg);
  const forward = altAzToVec(look.azimuthDeg, look.altitudeDeg);
  const worldUp = { x: 0, y: 0, z: 1 };
  let right = cross(forward, worldUp);
  if (Math.hypot(right.x, right.y, right.z) < 1e-6) {
    right = { x: 1, y: 0, z: 0 };
  }
  right = norm(right);
  const up = norm(cross(right, forward));

  const ahead = dot(target, forward);
  if (ahead <= 0.02) return null;

  const xCam = dot(target, right);
  const yCam = dot(target, up);
  const scale = Math.tan(((fovDeg / 2) * Math.PI) / 180);
  const u = xCam / (ahead * scale);
  const v = yCam / (ahead * scale);
  if (Math.abs(u) > 1.35 || Math.abs(v) > 1.35) return null;

  const radius = Math.min(width, height) * 0.5;
  return {
    x: width / 2 + u * radius,
    y: height / 2 - v * radius,
  };
}

export function starRadius(mag: number): number {
  if (mag <= 0) return 4.2;
  if (mag <= 1) return 3.4;
  if (mag <= 2) return 2.6;
  if (mag <= 3) return 2.0;
  return 1.4;
}
