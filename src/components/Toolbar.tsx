import { UploadButton } from './UploadButton';

interface ToolbarProps {
  onFileSelect: (file: File) => void;
}

export function Toolbar({ onFileSelect }: ToolbarProps) {
  return (
    <div
      className="fixed top-[16px] left-[16px] z-50 flex items-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-[8px] py-[4px]"
    >
      <UploadButton onFileSelect={onFileSelect} />
    </div>
  );
}
