import { Layer, Circle, Line } from 'react-konva';
import { useAppStore } from '../store/useAppStore';

export function CalibrationLayer() {
  const { clickPoints } = useAppStore((s) => s.calibrationClick);
  const toolMode = useAppStore((s) => s.toolMode);

  // Nothing to show if no points clicked and not in calibrate mode
  if (clickPoints.length === 0 && toolMode !== 'calibrate') return null;

  return (
    <Layer>
      {clickPoints.map((point, i) => (
        <Circle
          key={i}
          x={point.x}
          y={point.y}
          radius={6}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      ))}
      {clickPoints.length === 2 && (
        <Line
          points={[
            clickPoints[0].x,
            clickPoints[0].y,
            clickPoints[1].x,
            clickPoints[1].y,
          ]}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[8, 5]}
        />
      )}
    </Layer>
  );
}
