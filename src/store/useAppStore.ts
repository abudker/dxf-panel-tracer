import { create } from 'zustand';
import type { Viewport, ToolMode } from '../types';

interface AppState {
  // Photo
  photoUrl: string | null;
  photoSize: { width: number; height: number } | null;
  setPhotoUrl: (url: string) => void;
  setPhotoSize: (size: { width: number; height: number }) => void;
  clearPhoto: () => void;

  // Viewport (pan/zoom)
  viewport: Viewport;
  setViewport: (v: Partial<Viewport>) => void;

  // Tool mode
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  photoUrl: null,
  photoSize: null,
  setPhotoUrl: (url) => set({ photoUrl: url }),
  setPhotoSize: (size) => set({ photoSize: size }),
  clearPhoto: () => set({ photoUrl: null, photoSize: null }),

  viewport: { scale: 1, x: 0, y: 0 },
  setViewport: (v) =>
    set((s) => ({ viewport: { ...s.viewport, ...v } })),

  toolMode: 'select',
  setToolMode: (mode) => set({ toolMode: mode }),
}));
