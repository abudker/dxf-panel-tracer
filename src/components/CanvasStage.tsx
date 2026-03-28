import { useRef, useEffect, useState } from 'react';
import { Stage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useAppStore } from '../store/useAppStore';
import { useViewport } from '../hooks/useViewport';
import { useDrawingKeys } from '../hooks/useDrawingKeys';
import { screenToWorld } from '../utils/coordinates';
import { snapToEndpoint } from '../utils/geometry';
import { PhotoLayer } from './PhotoLayer';
import { CalibrationLayer } from './CalibrationLayer';
import { DrawingLayer } from './DrawingLayer';

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

  // Register global keyboard shortcuts for drawing tools
  useDrawingKeys();

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
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldPoint = screenToWorld(pointer, state.viewport);

    if (state.toolMode === 'calibrate') {
      state.addCalibrationPoint(worldPoint);
      return;
    }
    if (state.toolMode === 'line' || state.toolMode === 'arc') {
      // Apply snapping before recording the click
      const { point: snapped } = snapToEndpoint(worldPoint, state.segments, state.viewport, 10);
      state.setDrawingClick(snapped);
      return;
    }
    // Select mode: segment clicks handled by segment onClick in DrawingLayer
    // Background click deselection handled in DrawingLayer's Layer onClick
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const state = useAppStore.getState();
    if (state.toolMode !== 'line' && state.toolMode !== 'arc') return;
    if (state.drawing.clickPoints.length === 0) return; // only track cursor after first click
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldPoint = screenToWorld(pointer, state.viewport);
    state.setCursorWorld(worldPoint);
  };

  const isDrawingMode = toolMode === 'line' || toolMode === 'arc';
  const isCalibrateMode = toolMode === 'calibrate';
  const isInteractMode = isCalibrateMode || isDrawingMode;

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: isInteractMode ? 'crosshair' : 'grab' }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={!isInteractMode}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onDragStart={() => {
          if (!isInteractMode && containerRef.current) {
            containerRef.current.style.cursor = 'grabbing';
          }
        }}
        onDragMove={() => {}}
        onMouseUp={() => {
          if (containerRef.current) {
            containerRef.current.style.cursor = isInteractMode ? 'crosshair' : 'grab';
          }
        }}
      >
        <PhotoLayer />
        <CalibrationLayer />
        <DrawingLayer />
      </Stage>
    </div>
  );
}
