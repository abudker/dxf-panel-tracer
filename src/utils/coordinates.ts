import type { Point, Viewport } from '../types';

/**
 * Convert a screen-pixel position to world (stage-local) coordinates.
 * Accounts for current pan offset and zoom scale.
 */
export function screenToWorld(screen: Point, v: Viewport): Point {
  return {
    x: (screen.x - v.x) / v.scale,
    y: (screen.y - v.y) / v.scale,
  };
}

/**
 * Convert a world (stage-local) position back to screen pixels.
 */
export function worldToScreen(world: Point, v: Viewport): Point {
  return {
    x: world.x * v.scale + v.x,
    y: world.y * v.scale + v.y,
  };
}

/**
 * Calculate contain-fit: scale and position to fit an image entirely
 * within a viewport with centering.
 */
export function calculateContainFit(
  imgW: number,
  imgH: number,
  viewW: number,
  viewH: number
): Viewport {
  const scale = Math.min(viewW / imgW, viewH / imgH);
  const x = (viewW - imgW * scale) / 2;
  const y = (viewH - imgH * scale) / 2;
  return { scale, x, y };
}
