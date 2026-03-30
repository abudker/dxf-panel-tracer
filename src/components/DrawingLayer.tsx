import { useMemo } from 'react';
import { Layer, Line, Shape, Circle } from 'react-konva';
import { useAppStore } from '../store/useAppStore';
import { snapToEndpoint, circumcircle, arcDirectionFromThreePoints } from '../utils/geometry';
import type { LineSegment, ArcSegment } from '../types';

export function DrawingLayer() {
  const segments = useAppStore((s) => s.segments);
  const selectedId = useAppStore((s) => s.selectedSegmentId);
  const drawing = useAppStore((s) => s.drawing);
  const toolMode = useAppStore((s) => s.toolMode);
  const viewport = useAppStore((s) => s.viewport);

  // Snap target computation for snap ring indicator
  const snapTarget = useMemo(() => {
    if (!drawing.cursorWorld || (toolMode !== 'line' && toolMode !== 'arc')) return null;
    const result = snapToEndpoint(drawing.cursorWorld, segments, viewport, 10);
    return result.snapped ? result.point : null;
  }, [drawing.cursorWorld, segments, viewport, toolMode]);

  // Compute arc ghost preview when arc tool has 2 click points + cursor
  // Arc passes through the cursor position — move cursor to bend arc in any direction
  const arcGhostData = useMemo(() => {
    if (
      toolMode !== 'arc' ||
      drawing.clickPoints.length !== 2 ||
      !drawing.cursorWorld
    ) {
      return null;
    }
    const [p1, p2] = drawing.clickPoints;
    const cursor = drawing.cursorWorld;
    const result = circumcircle(p1, p2, cursor);
    if (result.collinear) return null;
    const { center, radius } = result;
    const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
    const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
    const anticlockwise = arcDirectionFromThreePoints(p1, p2, cursor, center);
    return { center, radius, startAngle, endAngle, anticlockwise };
  }, [toolMode, drawing.clickPoints, drawing.cursorWorld]);

  const handleLayerClick = (e: { target: { getLayer: () => unknown; getStage: () => unknown } }) => {
    const state = useAppStore.getState();
    if (state.toolMode !== 'select') return;
    // Deselect if click target is the layer or stage background (not a shape)
    const target = e.target;
    if (target.getLayer() === target || target.getStage() === target) {
      state.selectSegment(null);
    }
  };

  return (
    <Layer onClick={handleLayerClick}>
      {/* Committed segments */}
      {segments.map((seg) => {
        if (seg.type === 'line') {
          const lineSeg = seg as LineSegment;
          return (
            <Line
              key={lineSeg.id}
              points={[lineSeg.start.x, lineSeg.start.y, lineSeg.end.x, lineSeg.end.y]}
              stroke={lineSeg.id === selectedId ? '#f59e0b' : '#22d3ee'}
              strokeWidth={2}
              hitStrokeWidth={20}
              onClick={() => {
                const state = useAppStore.getState();
                if (state.toolMode === 'select') state.selectSegment(lineSeg.id);
              }}
            />
          );
        } else {
          const arcSeg = seg as ArcSegment;
          return (
            <Shape
              key={arcSeg.id}
              sceneFunc={(ctx, shape) => {
                ctx.beginPath();
                ctx.arc(
                  arcSeg.center.x,
                  arcSeg.center.y,
                  arcSeg.radius,
                  arcSeg.startAngle,
                  arcSeg.endAngle,
                  arcSeg.anticlockwise
                );
                ctx.fillStrokeShape(shape);
              }}
              stroke={arcSeg.id === selectedId ? '#f59e0b' : '#22d3ee'}
              strokeWidth={2}
              hitStrokeWidth={20}
              fill="transparent"
              onClick={() => {
                const state = useAppStore.getState();
                if (state.toolMode === 'select') state.selectSegment(arcSeg.id);
              }}
            />
          );
        }
      })}

      {/* Ghost preview: Line tool with 1 click point */}
      {toolMode === 'line' &&
        drawing.clickPoints.length === 1 &&
        drawing.cursorWorld && (
          <Line
            points={[
              drawing.clickPoints[0].x,
              drawing.clickPoints[0].y,
              drawing.cursorWorld.x,
              drawing.cursorWorld.y,
            ]}
            stroke="#22d3ee"
            strokeWidth={1.5}
            dash={[6, 4]}
            listening={false}
          />
        )}

      {/* Ghost preview: Arc tool with 1 click point — straight line preview */}
      {toolMode === 'arc' &&
        drawing.clickPoints.length === 1 &&
        drawing.cursorWorld && (
          <Line
            points={[
              drawing.clickPoints[0].x,
              drawing.clickPoints[0].y,
              drawing.cursorWorld.x,
              drawing.cursorWorld.y,
            ]}
            stroke="#22d3ee"
            strokeWidth={1.5}
            dash={[6, 4]}
            listening={false}
          />
        )}

      {/* Ghost preview: Arc tool with 2 click points — sagitta-based bend */}
      {toolMode === 'arc' &&
        drawing.clickPoints.length === 2 &&
        drawing.cursorWorld &&
        arcGhostData && (
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath();
              ctx.arc(
                arcGhostData.center.x,
                arcGhostData.center.y,
                arcGhostData.radius,
                arcGhostData.startAngle,
                arcGhostData.endAngle,
                arcGhostData.anticlockwise
              );
              ctx.fillStrokeShape(shape);
            }}
            stroke="#22d3ee"
            strokeWidth={1.5}
            dash={[6, 4]}
            fill="transparent"
            listening={false}
          />
        )}

      {/* Fallback: Arc tool with 2 click points but cursor on chord — show straight line */}
      {toolMode === 'arc' &&
        drawing.clickPoints.length === 2 &&
        drawing.cursorWorld &&
        !arcGhostData && (
          <Line
            points={[
              drawing.clickPoints[0].x,
              drawing.clickPoints[0].y,
              drawing.clickPoints[1].x,
              drawing.clickPoints[1].y,
            ]}
            stroke="#22d3ee"
            strokeWidth={1.5}
            dash={[6, 4]}
            listening={false}
          />
        )}

      {/* Click point indicators */}
      {drawing.clickPoints.map((p, i) => (
        <Circle key={i} x={p.x} y={p.y} radius={4} fill="#22d3ee" listening={false} />
      ))}

      {/* Snap ring indicator */}
      {snapTarget && (
        <Circle
          x={snapTarget.x}
          y={snapTarget.y}
          radius={8}
          stroke="#f59e0b"
          strokeWidth={2}
          fill="transparent"
          listening={false}
        />
      )}
    </Layer>
  );
}
