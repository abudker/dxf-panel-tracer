import { Crosshair } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { UploadButton } from './UploadButton';

interface ToolbarProps {
  onFileSelect: (file: File) => void;
}

export function Toolbar({ onFileSelect }: ToolbarProps) {
  const toolMode = useAppStore((s) => s.toolMode);
  const calibration = useAppStore((s) => s.calibration);

  const isCalibrateActive = toolMode === 'calibrate';

  return (
    <div className="fixed top-[16px] left-[16px] z-50 flex items-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-[8px] py-[4px]">
      <UploadButton onFileSelect={onFileSelect} />
      <div className="w-px h-[24px] bg-[#3a3a3a] mx-[4px]" />
      <button
        type="button"
        title="Calibrate scale"
        onClick={() => useAppStore.getState().setToolMode('calibrate')}
        className={`w-[36px] h-[36px] flex items-center justify-center rounded-md transition-colors ${
          isCalibrateActive
            ? 'bg-[#3b82f6] hover:bg-[#3b82f6] text-white'
            : 'hover:bg-[#3a3a3a] text-[#999]'
        }`}
      >
        <Crosshair size={18} />
      </button>
      {calibration === null && (
        <span className="text-[11px] text-[#f59e0b] ml-[4px] whitespace-nowrap">
          No scale set
        </span>
      )}
    </div>
  );
}
