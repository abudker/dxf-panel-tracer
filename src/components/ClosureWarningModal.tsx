import { useAppStore } from '../store/useAppStore';

export function ClosureWarningModal() {
  const closureWarningOpen = useAppStore((s) => s.closureWarningOpen);
  const gapAnalysis = useAppStore((s) => s.gapAnalysis);

  if (!closureWarningOpen) return null;

  const formatDistance = (value: number, unit: string) => {
    if (unit === 'in') {
      return value < 0.01 ? `${(value * 1000).toFixed(1)} thou` : `${value.toFixed(3)}"`;
    }
    return value < 1 ? `${(value * 1000).toFixed(1)} µm` : `${value.toFixed(2)} mm`;
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center"
      onClick={() => useAppStore.getState().dismissExport()}
    >
      <div
        className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-6 w-[400px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-3">Shape Not Closed</h2>

        {gapAnalysis && gapAnalysis.gaps.length > 0 ? (
          <div className="mb-4">
            <p className="text-sm text-[#999] mb-3">
              {gapAnalysis.gaps.length === 1
                ? 'There is 1 gap between segment endpoints.'
                : `There are ${gapAnalysis.gaps.length} gaps between segment endpoints.`}
            </p>

            <div className="bg-[#1a1a1a] rounded-lg p-3 mb-3">
              <div className="text-xs text-[#666] uppercase tracking-wide mb-1">
                Max adjustment needed
              </div>
              <div className="text-lg font-semibold text-white">
                {formatDistance(gapAnalysis.maxGapReal, gapAnalysis.unit)}
              </div>
            </div>

            {gapAnalysis.gaps.length > 1 && (
              <div className="text-xs text-[#666] space-y-1 mb-3">
                {gapAnalysis.gaps.map((gap, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {gap.toSegmentIndex === 0
                        ? `Segment ${gap.fromSegmentIndex + 1} → start`
                        : `Segment ${gap.fromSegmentIndex + 1} → ${gap.toSegmentIndex + 1}`}
                    </span>
                    <span className="text-[#999]">
                      {formatDistance(
                        gapAnalysis.unit === 'in'
                          ? gap.distance / (useAppStore.getState().calibration?.pxPerMm ?? 1) / 25.4
                          : gap.distance / (useAppStore.getState().calibration?.pxPerMm ?? 1),
                        gapAnalysis.unit
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#999] mb-4">
            The traced shape is not closed. The first and last endpoints do not connect.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {gapAnalysis?.canAutoClose && (
            <button
              type="button"
              onClick={() => useAppStore.getState().autoCloseAndExport()}
              className="w-full px-4 py-2 rounded-lg bg-[#3b82f6] text-white font-medium hover:bg-[#2563eb]"
            >
              Auto-close &amp; export
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => useAppStore.getState().dismissExport()}
              className="flex-1 px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#3a3a3a] text-[#999] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => useAppStore.getState().confirmExport()}
              className="flex-1 px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#3a3a3a] text-[#999] hover:text-white"
            >
              Export as-is
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
