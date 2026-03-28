import { Toolbar } from './components/Toolbar';

function App() {
  const handleFileSelect = (file: File) => {
    // Photo handling wired in Plan 02
    console.log('File selected:', file.name);
  };

  return (
    <div className="w-screen h-screen bg-[#1a1a1a] relative overflow-hidden">
      <Toolbar onFileSelect={handleFileSelect} />
      {/* CanvasStage and DropZoneOverlay added in Plan 02 */}
    </div>
  );
}

export default App;
