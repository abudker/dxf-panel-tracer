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

/** Tool modes — 'calibrate' added in Phase 2; 'line' and 'arc' will be added in Phase 3 */
export type ToolMode = 'select' | 'calibrate';

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
