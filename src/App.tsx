import { useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { CanvasStage } from './components/CanvasStage';
import { DropZoneOverlay } from './components/DropZoneOverlay';
import { usePhotoUpload } from './hooks/usePhotoUpload';
import { useAppStore } from './store/useAppStore';

function App() {
  const photoUrl = useAppStore((s) => s.photoUrl);
  const { handlePhotoFile } = usePhotoUpload();

  const onFileSelect = useCallback(
    (file: File) => {
      handlePhotoFile(file);
    },
    [handlePhotoFile],
  );

  return (
    <div className="w-screen h-screen bg-[#1a1a1a] relative overflow-hidden">
      <Toolbar onFileSelect={onFileSelect} />
      {photoUrl ? (
        <CanvasStage />
      ) : (
        <DropZoneOverlay onFileSelect={onFileSelect} />
      )}
    </div>
  );
}

export default App;
