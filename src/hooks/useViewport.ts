import type { RefObject } from 'react';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useAppStore } from '../store/useAppStore';

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_FACTOR = 1.12;

export function useViewport(stageRef: RefObject<Konva.Stage | null>) {
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    // CRITICAL: prevents browser page scroll
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Point under cursor in world (stage-local) coordinates
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const rawScale = direction > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale));

    stage.scale({ x: newScale, y: newScale });

    // Reposition stage so mousePointTo stays under cursor
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);

    // Sync to Zustand — use getState() to avoid stale closures in event callbacks
    useAppStore.getState().setViewport({ scale: newScale, x: newPos.x, y: newPos.y });
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    // Sync stage position to Zustand after drag completes
    useAppStore.getState().setViewport({ x: e.target.x(), y: e.target.y() });
  };

  return { handleWheel, handleDragEnd };
}
