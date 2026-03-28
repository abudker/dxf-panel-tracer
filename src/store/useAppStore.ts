import { create } from 'zustand';
import type { Viewport, ToolMode, Point, CalibrationState, CalibrationClickState, CalibrationUnit } from '../types';

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

  // Calibration (persistent result, null = not calibrated)
  calibration: CalibrationState | null;

  // Transient click-collection state
  calibrationClick: CalibrationClickState;

  // Toast for scale-first warning
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;

  // Calibration actions
  addCalibrationPoint: (p: Point) => void;
  confirmCalibration: (distance: number, unit: CalibrationUnit) => void;
  cancelCalibration: () => void;
  resetCalibration: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  photoUrl: null,
  photoSize: null,
  setPhotoUrl: (url) => set({ photoUrl: url }),
  setPhotoSize: (size) => set({ photoSize: size }),
  clearPhoto: () => set({ photoUrl: null, photoSize: null }),

  viewport: { scale: 1, x: 0, y: 0 },
  setViewport: (v) =>
    set((s) => ({ viewport: { ...s.viewport, ...v } })),

  toolMode: 'select',
  setToolMode: (mode) => {
    // Guard: future drawing tools (not 'select', not 'calibrate') require calibration
    if (mode !== 'select' && mode !== 'calibrate' && !get().calibration) {
      set({ toastMessage: 'Set scale reference first' });
      return;
    }
    // When switching to calibrate mode, clear any in-progress click state so re-calibration starts fresh
    if (mode === 'calibrate') {
      set({ toolMode: mode, calibrationClick: { clickPoints: [], isModalOpen: false } });
      return;
    }
    set({ toolMode: mode });
  },

  calibration: null,
  calibrationClick: { clickPoints: [], isModalOpen: false },

  toastMessage: null,
  setToastMessage: (msg) => set({ toastMessage: msg }),

  addCalibrationPoint: (p) => {
    const { calibrationClick } = get();
    const { clickPoints } = calibrationClick;

    if (clickPoints.length === 0) {
      set({ calibrationClick: { ...calibrationClick, clickPoints: [p] } });
    } else if (clickPoints.length === 1) {
      set({ calibrationClick: { clickPoints: [...clickPoints, p], isModalOpen: true } });
    }
    // If clickPoints.length >= 2: ignore (modal is open)
  },

  confirmCalibration: (distance, unit) => {
    const { calibrationClick } = get();
    const { clickPoints } = calibrationClick;
    if (clickPoints.length < 2) return;

    const [p1, p2] = clickPoints;
    const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const distanceMm = unit === 'in' ? distance * 25.4 : distance;
    const pxPerMm = pixelDist / distanceMm;

    set({
      calibration: { pxPerMm, unit },
      calibrationClick: { clickPoints: [], isModalOpen: false },
      toolMode: 'select',
    });
  },

  cancelCalibration: () => {
    // Clear click state but preserve existing calibration (user may be re-calibrating)
    set({
      calibrationClick: { clickPoints: [], isModalOpen: false },
      toolMode: 'select',
    });
  },

  resetCalibration: () => {
    set({
      calibration: null,
      calibrationClick: { clickPoints: [], isModalOpen: false },
    });
  },
}));
