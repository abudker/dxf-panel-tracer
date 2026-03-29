/** A 2D point in either screen or world coordinate space */
export interface Point {
  x: number;
  y: number;
}

/** The current viewport transform: pan offset (x, y) and uniform scale */
export interface Viewport {
  scale: number;
  x: number;  // stage offset in screen pixels
  y: number;  // stage offset in screen pixels
}

/** Tool modes — 'calibrate' added in Phase 2; 'line' and 'arc' added in Phase 3 */
export type ToolMode = 'select' | 'calibrate' | 'line' | 'arc';

/** A straight line segment defined by two endpoints in world coordinates */
export interface LineSegment {
  id: string;
  type: 'line';
  start: Point;  // world coordinates
  end: Point;    // world coordinates
}

/** An arc segment defined by circumcircle geometry and three original click points */
export interface ArcSegment {
  id: string;
  type: 'arc';
  center: Point;       // world coordinates
  radius: number;      // world pixels
  /** radians, canvas convention (Y-down). Convert to DXF CCW at export. */
  startAngle: number;  // radians, canvas convention (Y-down)
  /** radians, canvas convention (Y-down). Convert to DXF CCW at export. */
  endAngle: number;    // radians, canvas convention (Y-down)
  anticlockwise: boolean;  // direction for canvas rendering
  p1: Point;  // start endpoint (world coords)
  p2: Point;  // end endpoint (world coords)
  p3: Point;  // point-on-arc (world coords) — for re-deriving if needed
}

/** Discriminated union of all segment types */
export type Segment = LineSegment | ArcSegment;

/** Transient state during an active drawing operation (not part of undo history) */
export interface DrawingState {
  clickPoints: Point[];       // 0-2 accumulated click points in world coords
  cursorWorld: Point | null;  // current cursor in world coords for ghost preview
}

/** Analysis of gaps between segment endpoints for closure assistance */
export interface GapInfo {
  fromSegmentIndex: number;
  toSegmentIndex: number;
  distance: number;  // world pixels
}

export interface GapAnalysis {
  gaps: GapInfo[];
  maxGap: number;       // largest gap in world pixels
  maxGapReal: number;   // largest gap in real-world units (mm or inches)
  unit: CalibrationUnit;
  canAutoClose: boolean; // true if gaps are small enough to nudge
}

/** Unit used for the real-world calibration distance */
export type CalibrationUnit = 'mm' | 'in';

/** Persistent calibration result stored after a successful two-click calibration */
export interface CalibrationState {
  pxPerMm: number;
  unit: CalibrationUnit;
}

/** Transient state during the two-click calibration flow */
export interface CalibrationClickState {
  /** World-coordinate click points; length 0, 1, or 2 */
  clickPoints: Point[];
  isModalOpen: boolean;
}
