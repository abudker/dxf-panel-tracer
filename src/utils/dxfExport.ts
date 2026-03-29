import type { Segment, CalibrationUnit, GapAnalysis, GapInfo } from '../types';

// ============================================================
// Private helpers
// ============================================================

/** Normalize degrees to [0, 360). */
function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

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
 * Build a DXF string from an ordered list of segments.
 *
 * Applies:
 * - Y-axis flip (canvas Y-down → DXF Y-up): negate all Y values
 * - Origin normalization: translate so minimum X/Y is at (0, 0)
 *   Arc bounding boxes include center ± radius (not just center point)
 * - Unit scaling: worldPx / pxPerMm [/ 25.4 for inches]
 * - Arc angle conversion: radians → degrees, negate (Y-flip), normalize [0,360)
 *   Swap start/end when anticlockwise=true (canvas CCW → CW after Y-flip → swap restores CCW for DXF)
 */
export function buildDxfString(
  segments: Segment[],
  pxPerMm: number,
  unit: CalibrationUnit
): string {
  const insunits = unit === 'in' ? 1 : 4;

  // ----------------------------------------------------------
  // Step 1: Collect all flipped coordinates for bounding box
  // ----------------------------------------------------------
  const allX: number[] = [];
  const allY: number[] = []; // already Y-flipped (negated)

  for (const seg of segments) {
    if (seg.type === 'line') {
      allX.push(seg.start.x, seg.end.x);
      allY.push(-seg.start.y, -seg.end.y);
    } else {
      // Arc: bounding box must include center ± radius to handle arcs near edges
      allX.push(seg.center.x - seg.radius, seg.center.x + seg.radius);
      const flippedCy = -seg.center.y;
      allY.push(flippedCy - seg.radius, flippedCy + seg.radius);
    }
  }

  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;

  // ----------------------------------------------------------
  // Step 2: Build DXF content line-by-line
  // ----------------------------------------------------------
  const lines: string[] = [];

  // HEADER section
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1009');
  lines.push('9', '$INSUNITS', '70', String(insunits));
  lines.push('0', 'ENDSEC');

  // ENTITIES section
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  for (const seg of segments) {
    if (seg.type === 'line') {
      const x1 = toRealUnits(seg.start.x - minX, pxPerMm, unit);
      const y1 = toRealUnits(-seg.start.y - minY, pxPerMm, unit);
      const x2 = toRealUnits(seg.end.x - minX, pxPerMm, unit);
      const y2 = toRealUnits(-seg.end.y - minY, pxPerMm, unit);

      lines.push('0', 'LINE');
      lines.push('8', '0');        // layer 0
      lines.push('10', fmt(x1));
      lines.push('20', fmt(y1));
      lines.push('30', '0.000000');
      lines.push('11', fmt(x2));
      lines.push('21', fmt(y2));
      lines.push('31', '0.000000');
    } else {
      // Arc
      const cx = toRealUnits(seg.center.x - minX, pxPerMm, unit);
      const cy = toRealUnits(-seg.center.y - minY, pxPerMm, unit);
      const radius = toRealUnits(seg.radius, pxPerMm, unit);

      // Angle conversion:
      // 1. Negate angles (Y-flip reverses angle direction)
      // 2. Convert radians to degrees
      // 3. Normalize to [0, 360)
      let startDeg = normDeg(-seg.startAngle * (180 / Math.PI));
      let endDeg   = normDeg(-seg.endAngle   * (180 / Math.PI));

      // 4. If canvas arc was anticlockwise=true (CCW in screen), after Y-flip it becomes CW.
      //    Swap start/end so DXF sweeps CCW over the correct arc.
      if (seg.anticlockwise) {
        [startDeg, endDeg] = [endDeg, startDeg];
      }

      lines.push('0', 'ARC');
      lines.push('8', '0');        // layer 0
      lines.push('10', fmt(cx));
      lines.push('20', fmt(cy));
      lines.push('30', '0.000000');
      lines.push('40', fmt(radius));
      lines.push('50', fmt(startDeg));
      lines.push('51', fmt(endDeg));
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
