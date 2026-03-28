import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function Toast() {
  const toastMessage = useAppStore((s) => s.toastMessage);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => {
      useAppStore.getState().setToastMessage(null);
    }, 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  if (!toastMessage) return null;

  return (
    <div
      className="fixed bottom-[64px] left-1/2 -translate-x-1/2 z-50 bg-[#2a2a2a] border border-[#3b82f6] text-white text-sm px-4 py-2 rounded-lg shadow-lg cursor-pointer"
      onClick={() => useAppStore.getState().setToastMessage(null)}
    >
      {toastMessage}
    </div>
  );
}
