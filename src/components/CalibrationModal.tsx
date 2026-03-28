import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { CalibrationUnit } from '../types';

export function CalibrationModal() {
  const isModalOpen = useAppStore((s) => s.calibrationClick.isModalOpen);
  const [distance, setDistance] = useState('');
  const [unit, setUnit] = useState<CalibrationUnit>('in');

  if (!isModalOpen) return null;

  const distanceValue = parseFloat(distance);
  const isConfirmDisabled = distance === '' || isNaN(distanceValue) || distanceValue <= 0;

  function handleConfirm() {
    if (isConfirmDisabled) return;
    useAppStore.getState().confirmCalibration(distanceValue, unit);
    // Reset local state for next time
    setDistance('');
    setUnit('in');
  }

  function handleCancel() {
    useAppStore.getState().cancelCalibration();
    setDistance('');
    setUnit('in');
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center"
      onClick={handleCancel}
    >
      <div
        className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-6 w-[340px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">Set Scale Reference</h2>

        <div>
          <p className="text-sm text-[#999] mb-1">Distance between points</p>
          <input
            type="number"
            min="0.01"
            step="any"
            autoFocus
            placeholder="e.g. 12"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white outline-none focus:border-[#3b82f6]"
          />
        </div>

        <div>
          <p className="text-sm text-[#999] mb-1 mt-4">Unit</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUnit('in')}
              className={`rounded-lg px-4 py-2 cursor-pointer ${
                unit === 'in'
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#1a1a1a] text-[#999]'
              }`}
            >
              in
            </button>
            <button
              type="button"
              onClick={() => setUnit('mm')}
              className={`rounded-lg px-4 py-2 cursor-pointer ${
                unit === 'mm'
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#1a1a1a] text-[#999]'
              }`}
            >
              mm
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#3a3a3a] text-[#999] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="flex-1 px-4 py-2 rounded-lg bg-[#3b82f6] text-white font-medium hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
