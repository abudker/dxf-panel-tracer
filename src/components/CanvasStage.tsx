import { useRef, useEffect, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useAppStore } from '../store/useAppStore';
import { useViewport } from '../hooks/useViewport';
import { PhotoLayer } from './PhotoLayer';

export function CanvasStage() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const viewport = useAppStore((s) => s.viewport);
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: 'grab' }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onDragStart={() => {
          if (containerRef.current) {
            containerRef.current.style.cursor = 'grabbing';
          }
        }}
        onDragMove={() => {}}
        onMouseUp={() => {
          if (containerRef.current) {
            containerRef.current.style.cursor = 'grab';
          }
        }}
      >
        <PhotoLayer />
        <Layer>{/* Drawing layer — Phase 3 */}</Layer>
      </Stage>
    </div>
  );
}
