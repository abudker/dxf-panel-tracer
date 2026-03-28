import { useRef } from 'react';
import { Upload } from 'lucide-react';

interface UploadButtonProps {
  onFileSelect: (file: File) => void;
}

export function UploadButton({ onFileSelect }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-[4px] px-[8px] py-[8px] rounded text-[14px] font-normal leading-[1.5] text-[#f5f5f5] bg-transparent hover:bg-[#3a3a3a] active:bg-[#3b82f6] active:text-white transition-colors cursor-pointer"
        style={{ minWidth: '44px', minHeight: '44px' }}
        title="Open Photo"
      >
        <Upload size={18} className="text-[#a3a3a3]" />
        <span>Open Photo</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
    </>
  );
}
