import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface DropZoneOverlayProps {
  onFileSelect: (file: File) => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function DropZoneOverlay({ onFileSelect }: DropZoneOverlayProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      setError(null);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Only JPG, PNG, and WebP photos are supported. Try a different file.');
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect],
  );

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-40"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`flex flex-col items-center gap-[16px] p-[24px] rounded-lg border-2 border-dashed transition-colors ${
          isDragOver ? 'border-[#3b82f6] border-solid' : 'border-[#3a3a3a]'
        }`}
      >
        <Upload size={48} className="text-[#a3a3a3]" />
        <h2 className="text-[20px] font-semibold leading-[1.2] text-[#f5f5f5]">
          {isDragOver ? 'Drop to open' : 'Upload a photo to start'}
        </h2>
        <p className="text-[14px] font-normal leading-[1.5] text-[#a3a3a3] text-center max-w-[400px]">
          Drag a photo onto this window or click Open Photo to choose a file from your computer.
          Supports JPG, PNG, and WebP.
        </p>
        {error && (
          <p className="text-[14px] font-normal leading-[1.5] text-red-400 text-center max-w-[400px]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
