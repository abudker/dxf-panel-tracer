import { useRef, useEffect, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useAppStore } from '../store/useAppStore';
import { useViewport } from '../hooks/useViewport';
import { screenToWorld } from '../utils/coordinates';
import { PhotoLayer } from './PhotoLayer';
import { CalibrationLayer } from './CalibrationLayer';

export function CanvasStage() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const viewport = useAppStore((s) => s.viewport);
  const toolMode = useAppStore((s) => s.toolMode);
  const { handleWheel, handleDragEnd } = useViewport(stageRef);

  // Resize observer to keep stage filling the viewport
  useEffect(() => {
    const updateSize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Sync stage transform when viewport state changes (e.g., from contain-fit on photo load)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.scale({ x: viewport.scale, y: viewport.scale });
    stage.position({ x: viewport.x, y: viewport.y });
    stage.batchDraw();
  }, [viewport]);

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    const state = useAppStore.getState();
    if (state.toolMode !== 'calibrate') return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldPoint = screenToWorld(pointer, state.viewport);
    state.addCalibrationPoint(worldPoint);
  };

  const isCalibrateMode = toolMode === 'calibrate';

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: isCalibrateMode ? 'crosshair' : 'grab' }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={!isCalibrateMode}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onClick={handleStageClick}
        onDragStart={() => {
          if (!isCalibrateMode && containerRef.current) {
            containerRef.current.style.cursor = 'grabbing';
          }
        }}
        onDragMove={() => {}}
        onMouseUp={() => {
          if (containerRef.current) {
            containerRef.current.style.cursor = isCalibrateMode ? 'crosshair' : 'grab';
          }
        }}
      >
        <PhotoLayer />
        <CalibrationLayer />
        <Layer>{/* Drawing layer — Phase 3 */}</Layer>
      </Stage>
    </div>
  );
}
