import { useAppStore } from '../store/useAppStore';

const NICE_STEPS_MM = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const NICE_STEPS_IN = [0.25, 0.5, 1, 2, 5, 10, 20, 50];
const TARGET_MIN_PX = 60;

function pickNiceInterval(screenPxPerMm: number, unit: 'mm' | 'in'): number {
  if (unit === 'in') {
    const screenPxPerIn = screenPxPerMm * 25.4;
    for (const step of NICE_STEPS_IN) {
      if (step * screenPxPerIn >= TARGET_MIN_PX) return step;
    }
    return NICE_STEPS_IN[NICE_STEPS_IN.length - 1];
  } else {
    for (const step of NICE_STEPS_MM) {
      if (step * screenPxPerMm >= TARGET_MIN_PX) return step;
    }
    return NICE_STEPS_MM[NICE_STEPS_MM.length - 1];
  }
}

export function RulerOverlay() {
  const calibration = useAppStore((s) => s.calibration);
  const viewport = useAppStore((s) => s.viewport);

  if (calibration === null) return null;

  const { pxPerMm, unit } = calibration;
  const screenPxPerMm = pxPerMm * viewport.scale;

  const majorInterval = pickNiceInterval(screenPxPerMm, unit);

  // Compute the range of world coords visible on screen
  const worldLeftX = -viewport.x / viewport.scale;
  const worldRightX = (window.innerWidth - viewport.x) / viewport.scale;

  // Convert world px to display units
  const unitFactor = unit === 'in' ? pxPerMm * 25.4 : pxPerMm;
  const startUnit =
    Math.floor(worldLeftX / unitFactor / majorInterval) * majorInterval;
  const endUnit =
    Math.ceil(worldRightX / unitFactor / majorInterval) * majorInterval;

  // Build major ticks
  const majorTicks: { value: number; screenX: number }[] = [];
  for (
    let v = startUnit;
    v <= endUnit;
    v = Math.round((v + majorInterval) * 1e9) / 1e9
  ) {
    const worldX = v * unitFactor;
    const screenX = worldX * viewport.scale + viewport.x;
    majorTicks.push({ value: v, screenX });
  }

  // Determine whether to include minor ticks (5 subdivisions between major ticks)
  const minorCount = majorTicks.length > 0 ? (majorTicks.length - 1) * 4 : 0;
  const totalElements = majorTicks.length + minorCount;
  const showMinor = totalElements <= 200;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none border-t border-[#3a3a3a]"
      style={{ height: 32, backgroundColor: 'rgba(26,26,26,0.8)' }}
    >
      {/* Major ticks */}
      {majorTicks.map(({ value, screenX }) => (
        <div key={`major-${value}`} style={{ position: 'absolute', left: screenX }}>
          {/* Tick line */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 1,
              height: 12,
              backgroundColor: '#666',
            }}
          />
          {/* Label */}
          <span
            style={{
              position: 'absolute',
              bottom: 13,
              left: 3,
              fontSize: 10,
              color: '#999',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {value % 1 === 0
              ? `${value}${unit === 'mm' ? 'mm' : '"'}`
              : `${value}${unit === 'mm' ? 'mm' : '"'}`}
          </span>
        </div>
      ))}

      {/* Minor ticks (4 between each pair of major ticks) */}
      {showMinor &&
        majorTicks.slice(0, -1).map(({ value, screenX }, i) => {
          const nextScreenX = majorTicks[i + 1].screenX;
          const gap = (nextScreenX - screenX) / 5;
          return [1, 2, 3, 4].map((k) => {
            const minorX = screenX + gap * k;
            return (
              <div
                key={`minor-${value}-${k}`}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: minorX,
                  width: 1,
                  height: 6,
                  backgroundColor: '#444',
                }}
              />
            );
          });
        })}

      {/* Unit indicator in bottom-right */}
      <span
        style={{
          position: 'absolute',
          right: 8,
          top: 4,
          fontSize: 10,
          color: '#666',
        }}
      >
        {unit === 'mm' ? 'millimeters' : 'inches'}
      </span>
    </div>
  );
}
