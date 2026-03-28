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

/** Tool modes — Phase 1 only has 'select', future phases add 'line', 'arc', 'calibrate' */
export type ToolMode = 'select';
