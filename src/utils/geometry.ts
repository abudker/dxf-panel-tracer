import type { Point, Viewport, Segment } from '../types';

/** Result of the circumcircle computation from three points */
export interface CircumcircleResult {
  center: Point;
  radius: number;
  collinear: boolean;
}

/**
 * Compute the circumcircle (center and radius) of three points.
 * Returns collinear=true when the points are collinear (no valid circle).
 *
 * Uses the standard perpendicular bisector formula.
 * Collinear threshold: |G| < 1e-6.
 */
export function circumcircle(p1: Point, p2: Point, p3: Point): CircumcircleResult {
  const A = p2.x - p1.x;
  const B = p2.y - p1.y;
  const C = p3.x - p1.x;
  const D = p3.y - p1.y;
  const E = A * (p1.x + p2.x) + B * (p1.y + p2.y);
  const F = C * (p1.x + p3.x) + D * (p1.y + p3.y);
  const G = 2 * (A * (p3.y - p2.y) - B * (p3.x - p2.x));

  if (Math.abs(G) < 1e-6) {
    // Points are collinear — degenerate arc, no valid circle exists
    return { center: { x: 0, y: 0 }, radius: 0, collinear: true };
  }

  const cx = (D * E - B * F) / G;
  const cy = (A * F - C * E) / G;
  const dx = cx - p1.x;
  const dy = cy - p1.y;
  const radius = Math.sqrt(dx * dx + dy * dy);

  return { center: { x: cx, y: cy }, radius, collinear: false };
}

/**
 * Normalize an angle to the range [0, 2*PI).
 */
export function normalizeAngle(angle: number): number {
  return ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/**
 * Check if a normalized angle falls within the counterclockwise sweep
 * from `start` to `end` (both already normalized to [0, 2*PI)).
 */
export function isAngleInSweep(angle: number, start: number, end: number): boolean {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(start);
  const e = normalizeAngle(end);

  if (s <= e) {
    // Normal case: sweep does not cross 0
    return a >= s && a <= e;
  } else {
    // Sweep crosses 0 (wraps around)
    return a >= s || a <= e;
  }
}

/**
 * Determine the anticlockwise flag for `context.arc()` so that the rendered arc
 * passes through p3 (the user's point-on-arc click).
 *
 * Returns `true` if the arc should be drawn counterclockwise (canvas anticlockwise=true),
 * `false` if clockwise.
 *
 * The key insight: given startAngle (from p1) and endAngle (from p2), there are two arcs.
 * We pick the one whose CCW sweep from startAngle to endAngle contains a3 (angle of p3).
 * If a3 IS in the CCW sweep, we want anticlockwise=true (canvas draws CCW).
 * If a3 is NOT in the CCW sweep, we want anticlockwise=false (canvas draws CW).
 */
export function arcDirectionFromThreePoints(
  p1: Point,
  p2: Point,
  p3: Point,
  center: Point
): boolean {
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
  const a3 = Math.atan2(p3.y - center.y, p3.x - center.x);

  // Check if p3's angle is within the CCW sweep from startAngle to endAngle
  const inCCWSweep = isAngleInSweep(a3, startAngle, endAngle);

  // If p3 is in the CCW sweep, the arc from p1 to p2 through p3 is CCW
  // canvas anticlockwise=true means CCW
  return inCCWSweep;
}

/**
 * Compute an arc from two endpoints and a signed sagitta (arc height) value.
 *
 * The sagitta controls curvature: positive = bend left of p1→p2 direction,
 * negative = bend right. The cursor side determines direction, scroll controls magnitude.
 *
 * Returns null if sagitta is too small (essentially a straight line).
 */
export function arcFromBulgeValue(
  p1: Point,
  p2: Point,
  sagitta: number
): {
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
  anticlockwise: boolean;
  p3: Point;
} | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chordLen = Math.sqrt(dx * dx + dy * dy);
  if (chordLen < 1e-6 || Math.abs(sagitta) < 2) return null;

  const halfChord = chordLen / 2;
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  // Perpendicular normal (left of p1→p2)
  const nx = -dy / chordLen;
  const ny = dx / chordLen;

  // Radius from sagitta formula: r = (h² + l²) / (2|h|)
  const absH = Math.abs(sagitta);
  const radius = (absH * absH + halfChord * halfChord) / (2 * absH);

  // Center on perpendicular bisector, opposite side from bulge
  const center: Point = {
    x: mx - nx * (radius - sagitta),
    y: my - ny * (radius - sagitta),
  };

  // p3 is the arc midpoint (on the bulge side)
  const p3: Point = {
    x: mx + nx * sagitta,
    y: my + ny * sagitta,
  };

  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
  const anticlockwise = arcDirectionFromThreePoints(p1, p2, p3, center);

  return { center, radius, startAngle, endAngle, anticlockwise, p3 };
}

/**
 * Compute an arc from two endpoints and a cursor position using sagitta-based bending.
 *
 * Projects the cursor onto the perpendicular bisector of the chord (p1→p2) to get
 * a signed sagitta (arc height). This produces smooth, predictable arc bending that
 * doesn't swing wildly when the cursor is near the chord line.
 *
 * Returns the circumcircle center, radius, canvas angles, anticlockwise flag,
 * and a synthetic p3 (the midpoint of the arc, on the perpendicular bisector).
 *
 * Returns null if the sagitta is too small (essentially a straight line).
 */
export function arcFromSagitta(
  p1: Point,
  p2: Point,
  cursor: Point
): {
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
  anticlockwise: boolean;
  p3: Point;
} | null {
  // Chord midpoint and half-length
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chordLen = Math.sqrt(dx * dx + dy * dy);
  if (chordLen < 1e-6) return null;
  const halfChord = chordLen / 2;

  // Perpendicular bisector direction (unit normal to chord)
  // Points "left" of the chord direction p1→p2
  const nx = -dy / chordLen;
  const ny = dx / chordLen;

  // Signed distance from cursor to chord line (positive = left of p1→p2)
  const cursorDx = cursor.x - mx;
  const cursorDy = cursor.y - my;
  const sagitta = cursorDx * nx + cursorDy * ny;

  // If sagitta is too small, it's basically a straight line
  if (Math.abs(sagitta) < 2) return null;

  // Clamp sagitta to prevent extreme arcs (radius > 10x chord length)
  const maxSag = halfChord * 5;
  const clampedSag = Math.max(-maxSag, Math.min(maxSag, sagitta));

  // Compute radius from sagitta: r = (h² + l²) / (2h) where h = |sagitta|, l = halfChord
  const absH = Math.abs(clampedSag);
  const radius = (absH * absH + halfChord * halfChord) / (2 * absH);

  // Center is on the perpendicular bisector, opposite the bulge side.
  // Distance from midpoint to center along the normal = (radius - sagitta).
  // The center is on the opposite side from the sagitta direction.
  const center: Point = {
    x: mx - nx * (radius - clampedSag),
    y: my - ny * (radius - clampedSag),
  };

  // p3 is the point on the arc at the midpoint of the chord, on the bulge side
  const p3: Point = {
    x: mx + nx * clampedSag,
    y: my + ny * clampedSag,
  };

  // Canvas angles
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);

  // Direction: if sagitta > 0, arc goes CCW (left side); if < 0, CW (right side)
  // Use arcDirectionFromThreePoints for correctness
  const anticlockwise = arcDirectionFromThreePoints(p1, p2, p3, center);

  return { center, radius, startAngle, endAngle, anticlockwise, p3 };
}

/**
 * Extract all unique endpoint positions from a list of segments.
 * For LineSegment: start and end.
 * For ArcSegment: p1 and p2 (the user-clicked endpoints, NOT the center).
 */
export function getEndpoints(segments: Segment[]): Point[] {
  const points: Point[] = [];
  for (const seg of segments) {
    if (seg.type === 'line') {
      points.push(seg.start, seg.end);
    } else {
      // ArcSegment — p1 and p2 are the endpoints
      points.push(seg.p1, seg.p2);
    }
  }
  return points;
}

/**
 * Snap a world-coordinate click to the nearest existing segment endpoint if
 * it falls within `thresholdScreen` screen pixels.
 *
 * The threshold is converted from screen pixels to world pixels using
 * `viewport.scale` (see Pitfall 4 in RESEARCH.md).
 *
 * Returns `{ point: snappedPoint, snapped: true }` when snapped,
 * or `{ point: worldClick, snapped: false }` when no endpoint is within range.
 */
export function snapToEndpoint(
  worldClick: Point,
  segments: Segment[],
  viewport: Viewport,
  thresholdScreen: number
): { point: Point; snapped: boolean } {
  const thresholdWorld = thresholdScreen / viewport.scale;
  const endpoints = getEndpoints(segments);

  let closestDist = Infinity;
  let closestPoint: Point | null = null;

  for (const ep of endpoints) {
    const dx = ep.x - worldClick.x;
    const dy = ep.y - worldClick.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < thresholdWorld && dist < closestDist) {
      closestDist = dist;
      closestPoint = ep;
    }
  }

  if (closestPoint) {
    return { point: closestPoint, snapped: true };
  }
  return { point: worldClick, snapped: false };
}
