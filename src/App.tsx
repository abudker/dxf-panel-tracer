import { useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { CanvasStage } from './components/CanvasStage';
import { DropZoneOverlay } from './components/DropZoneOverlay';
import { CalibrationModal } from './components/CalibrationModal';
import { ClosureWarningModal } from './components/ClosureWarningModal';
import { Toast } from './components/Toast';
import { RulerOverlay } from './components/RulerOverlay';
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
      <CalibrationModal />
      <ClosureWarningModal />
      <Toast />
      {photoUrl ? (
        <CanvasStage />
      ) : (
        <DropZoneOverlay onFileSelect={onFileSelect} />
      )}
      <RulerOverlay />
      <div className="fixed bottom-2 right-2 text-[10px] text-[#444] select-none pointer-events-none z-10">
        v{__APP_VERSION__}
      </div>
    </div>
  );
}

export default App;
