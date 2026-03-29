import { useAppStore } from '../store/useAppStore';

export function ClosureWarningModal() {
  const closureWarningOpen = useAppStore((s) => s.closureWarningOpen);

  if (!closureWarningOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center"
      onClick={() => useAppStore.getState().dismissExport()}
    >
      <div
        className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-6 w-[340px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">Shape Not Closed</h2>

        <p className="text-sm text-[#999] mb-6">
          The traced shape is not closed. The first and last endpoints do not connect. Export anyway?
        </p>

        <div className="flex gap-3">
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
            className="flex-1 px-4 py-2 rounded-lg bg-[#3b82f6] text-white font-medium hover:bg-[#2563eb]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
