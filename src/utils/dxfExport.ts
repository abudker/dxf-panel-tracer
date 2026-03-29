import type { Segment, CalibrationUnit, GapAnalysis, GapInfo } from '../types';

// ============================================================
// Private helpers
// ============================================================

/** Convert world pixels to real-world units (mm or inches). */
function toRealUnits(worldPx: number, pxPerMm: number, unit: CalibrationUnit): number {
  const mm = worldPx / pxPerMm;
  return unit === 'in' ? mm / 25.4 : mm;
}

/** Format a number to 6 decimal places. */
function fmt(n: number): string {
  return n.toFixed(6);
}

/** Get the start endpoint of a segment (line.start, arc.p1). */
function getSegStart(seg: Segment): { x: number; y: number } {
  return seg.type === 'line' ? seg.start : seg.p1;
}

/** Get the end endpoint of a segment (line.end, arc.p2). */
function getSegEnd(seg: Segment): { x: number; y: number } {
  return seg.type === 'line' ? seg.end : seg.p2;
}

// ============================================================
// Exported functions
// ============================================================

/**
 * Check if a shape (ordered list of segments) is closed.
 *
 * Closed means the start endpoint of the first segment is within
 * `tolerancePx` pixels of the end endpoint of the last segment.
 */
export function isShapeClosed(segments: Segment[], tolerancePx = 0.5): boolean {
  if (segments.length === 0) return false;
  const first = segments[0];
  const last = segments[segments.length - 1];
  const p1 = getSegStart(first);
  const p2 = getSegEnd(last);
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy) <= tolerancePx;
}

/**
 * Analyze gaps between consecutive segment endpoints and the closure gap
 * (last endpoint → first endpoint). Returns gap distances and the max
 * adjustment needed to auto-close the shape.
 */
export function analyzeGaps(
  segments: Segment[],
  pxPerMm: number,
  unit: CalibrationUnit
): GapAnalysis {
  if (segments.length === 0) {
    return { gaps: [], maxGap: 0, maxGapReal: 0, unit, canAutoClose: false };
  }

  const gaps: GapInfo[] = [];

  // Check consecutive segment connections
  for (let i = 0; i < segments.length - 1; i++) {
    const endPt = getSegEnd(segments[i]);
    const startPt = getSegStart(segments[i + 1]);
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.5) {
      gaps.push({ fromSegmentIndex: i, toSegmentIndex: i + 1, distance: dist });
    }
  }

  // Check closure gap (last endpoint → first endpoint)
  const lastEnd = getSegEnd(segments[segments.length - 1]);
  const firstStart = getSegStart(segments[0]);
  const cdx = lastEnd.x - firstStart.x;
  const cdy = lastEnd.y - firstStart.y;
  const closureDist = Math.sqrt(cdx * cdx + cdy * cdy);
  if (closureDist > 0.5) {
    gaps.push({
      fromSegmentIndex: segments.length - 1,
      toSegmentIndex: 0,
      distance: closureDist,
    });
  }

  const maxGap = gaps.reduce((max, g) => Math.max(max, g.distance), 0);
  const maxGapMm = maxGap / pxPerMm;
  const maxGapReal = unit === 'in' ? maxGapMm / 25.4 : maxGapMm;

  return {
    gaps,
    maxGap,
    maxGapReal,
    unit,
    canAutoClose: maxGap > 0 && maxGap < 50, // auto-close if gaps < 50 world px
  };
}

/**
 * Compute the LWPOLYLINE bulge value for an arc segment.
 *
 * Bulge = tan(included_angle / 4).
 * Positive = arc bulges left (CCW), negative = right (CW).
 *
 * After Y-flip: canvas anticlockwise becomes CW in DXF space (negative bulge),
 * canvas clockwise becomes CCW in DXF space (positive bulge).
 */
function computeBulge(seg: Segment): number {
  if (seg.type === 'line') return 0;

  // After Y-flip, directions are reversed
  const dxfCCW = !seg.anticlockwise;

  // Compute DXF-space angles (negated for Y-flip)
  const flippedStart = -seg.startAngle;
  const flippedEnd = -seg.endAngle;

  // Compute sweep angle (always positive magnitude)
  let sweep: number;
  if (dxfCCW) {
    sweep = flippedEnd - flippedStart;
    if (sweep <= 0) sweep += 2 * Math.PI;
  } else {
    sweep = flippedStart - flippedEnd;
    if (sweep <= 0) sweep += 2 * Math.PI;
  }

  const bulge = Math.tan(sweep / 4);
  return dxfCCW ? bulge : -bulge;
}

/**
 * Build a DXF string from an ordered list of segments.
 *
 * Uses a single LWPOLYLINE entity with bulge values for arcs.
 * This guarantees endpoint continuity — no floating-point gaps between
 * entities that cause "open vectors" warnings in CNC software.
 *
 * Applies:
 * - Y-axis flip (canvas Y-down → DXF Y-up): negate all Y values
 * - Origin normalization: translate so minimum X/Y is at (0, 0)
 * - Unit scaling: worldPx / pxPerMm [/ 25.4 for inches]
 * - Arc bulge computation with direction handling
 */
export function buildDxfString(
  segments: Segment[],
  pxPerMm: number,
  unit: CalibrationUnit
): string {
  if (segments.length === 0) return '0\nEOF\n';

  const insunits = unit === 'in' ? 1 : 4;

  // ----------------------------------------------------------
  // Step 1: Collect vertex positions (start of each segment)
  // ----------------------------------------------------------
  const vertices: { x: number; y: number; bulge: number }[] = [];

  for (const seg of segments) {
    const start = getSegStart(seg);
    vertices.push({
      x: start.x,
      y: -start.y, // Y-flip
      bulge: computeBulge(seg),
    });
  }

  // ----------------------------------------------------------
  // Step 2: Origin normalization
  // ----------------------------------------------------------
  // Include all segment start AND end points, plus arc center ± radius
  const allX: number[] = vertices.map((v) => v.x);
  const allY: number[] = vertices.map((v) => v.y);
  for (const seg of segments) {
    const end = getSegEnd(seg);
    allX.push(end.x);
    allY.push(-end.y);
    if (seg.type === 'arc') {
      allX.push(seg.center.x - seg.radius, seg.center.x + seg.radius);
      const flippedCy = -seg.center.y;
      allY.push(flippedCy - seg.radius, flippedCy + seg.radius);
    }
  }
  const minX = Math.min(...allX);
  const minY = Math.min(...allY);

  // ----------------------------------------------------------
  // Step 3: Check closure
  // ----------------------------------------------------------
  const closed = isShapeClosed(segments);

  // ----------------------------------------------------------
  // Step 4: Build DXF content
  // ----------------------------------------------------------
  const lines: string[] = [];

  // HEADER section
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1015');
  lines.push('9', '$INSUNITS', '70', String(insunits));
  lines.push('0', 'ENDSEC');

  // ENTITIES section — single LWPOLYLINE
  lines.push('0', 'SECTION', '2', 'ENTITIES');
  lines.push('0', 'LWPOLYLINE');
  lines.push('8', '0');                              // layer 0
  lines.push('90', String(vertices.length));          // vertex count
  lines.push('70', closed ? '1' : '0');               // 1 = closed

  for (const v of vertices) {
    const x = toRealUnits(v.x - minX, pxPerMm, unit);
    const y = toRealUnits(v.y - minY, pxPerMm, unit);
    lines.push('10', fmt(x));
    lines.push('20', fmt(y));
    if (v.bulge !== 0) {
      lines.push('42', fmt(v.bulge));
    }
  }

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\n') + '\n';
}

/**
 * Trigger a browser file download with the given DXF content.
 *
 * Creates a temporary Blob URL, clicks a hidden anchor, then immediately
 * revokes the URL to avoid memory leaks.
 */
export function downloadDxf(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate the default DXF export filename using the local date.
 * Format: panel-trace-YYYY-MM-DD.dxf
 */
export function generateDxfFilename(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `panel-trace-${yyyy}-${mm}-${dd}.dxf`;
}
