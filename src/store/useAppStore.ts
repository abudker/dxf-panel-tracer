import { create } from 'zustand';
import type { Viewport, ToolMode, Point, CalibrationState, CalibrationClickState, CalibrationUnit, Segment, DrawingState } from '../types';
import { circumcircle, arcDirectionFromThreePoints } from '../utils/geometry';
import { buildDxfString, isShapeClosed, downloadDxf, generateDxfFilename } from '../utils/dxfExport';

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

  // Committed geometry
  segments: Segment[];
  selectedSegmentId: string | null;

  // Snapshot-based undo/redo (per user decision: snapshot-based, max 50)
  drawHistory: Segment[][];   // past snapshots, index 0 = oldest
  drawFuture: Segment[][];    // future snapshots for redo

  // Transient drawing state (not part of undo history)
  drawing: DrawingState;

  // Drawing actions
  addSegment: (seg: Segment) => void;
  deleteSegment: (id: string) => void;
  selectSegment: (id: string | null) => void;
  setDrawingClick: (p: Point) => void;
  setCursorWorld: (p: Point | null) => void;
  clearDrawing: () => void;
  undoDraw: () => void;
  redoDraw: () => void;

  // Export state
  closureWarningOpen: boolean;

  // Export actions
  triggerExport: () => void;
  confirmExport: () => void;
  dismissExport: () => void;
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
      set({
        toolMode: mode,
        calibrationClick: { clickPoints: [], isModalOpen: false },
        drawing: { clickPoints: [], cursorWorld: null },
        selectedSegmentId: null,
      });
      return;
    }
    // On any mode switch, clear transient drawing state (abandons in-progress click sequences)
    set({
      toolMode: mode,
      drawing: { clickPoints: [], cursorWorld: null },
      selectedSegmentId: null,
    });
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

  // Drawing state initialization
  segments: [],
  selectedSegmentId: null,
  drawHistory: [],
  drawFuture: [],
  drawing: { clickPoints: [], cursorWorld: null },

  // Drawing actions
  addSegment: (seg) => {
    const { segments, drawHistory } = get();
    const newHistory = [...drawHistory, segments].slice(-50);
    set({
      segments: [...segments, seg],
      drawHistory: newHistory,
      drawFuture: [],
      drawing: { clickPoints: [], cursorWorld: null },
      selectedSegmentId: null,
    });
  },

  deleteSegment: (id) => {
    const { segments, drawHistory } = get();
    const newHistory = [...drawHistory, segments].slice(-50);
    set({
      segments: segments.filter((s) => s.id !== id),
      drawHistory: newHistory,
      drawFuture: [],
      selectedSegmentId: null,
    });
  },

  selectSegment: (id) => set({ selectedSegmentId: id }),

  setDrawingClick: (p) => {
    const { toolMode, drawing } = get();
    const { clickPoints } = drawing;

    if (toolMode === 'line') {
      if (clickPoints.length === 0) {
        set({ drawing: { clickPoints: [p], cursorWorld: drawing.cursorWorld } });
      } else if (clickPoints.length === 1) {
        const lineSeg = {
          id: crypto.randomUUID(),
          type: 'line' as const,
          start: clickPoints[0],
          end: p,
        };
        get().addSegment(lineSeg);
      }
    } else if (toolMode === 'arc') {
      if (clickPoints.length < 2) {
        set({ drawing: { ...drawing, clickPoints: [...clickPoints, p] } });
      } else if (clickPoints.length === 2) {
        // Third click: compute circumcircle to create arc segment
        const result = circumcircle(clickPoints[0], clickPoints[1], p);
        if (result.collinear) {
          set({
            toastMessage: 'Points are collinear — place the arc point off the line',
            drawing: { clickPoints: [], cursorWorld: null },
          });
          return;
        }
        const { center, radius } = result;
        const startAngle = Math.atan2(clickPoints[0].y - center.y, clickPoints[0].x - center.x);
        const endAngle = Math.atan2(clickPoints[1].y - center.y, clickPoints[1].x - center.x);
        const anticlockwise = arcDirectionFromThreePoints(clickPoints[0], clickPoints[1], p, center);
        const arcSeg = {
          id: crypto.randomUUID(),
          type: 'arc' as const,
          center,
          radius,
          startAngle,
          endAngle,
          anticlockwise,
          p1: clickPoints[0],
          p2: clickPoints[1],
          p3: p,
        };
        get().addSegment(arcSeg);
      }
    }
  },

  setCursorWorld: (p) => set({ drawing: { ...get().drawing, cursorWorld: p } }),

  clearDrawing: () => set({ drawing: { clickPoints: [], cursorWorld: null } }),

  undoDraw: () => {
    const { segments, drawHistory, drawFuture } = get();
    if (drawHistory.length === 0) return;
    const previous = drawHistory[drawHistory.length - 1];
    set({
      segments: previous,
      drawHistory: drawHistory.slice(0, -1),
      drawFuture: [segments, ...drawFuture],
      selectedSegmentId: null,
    });
  },

  redoDraw: () => {
    const { segments, drawHistory, drawFuture } = get();
    if (drawFuture.length === 0) return;
    const next = drawFuture[0];
    set({
      segments: next,
      drawHistory: [...drawHistory, segments],
      drawFuture: drawFuture.slice(1),
      selectedSegmentId: null,
    });
  },

  // Export state
  closureWarningOpen: false,

  triggerExport: () => {
    const { segments, calibration } = get();
    if (segments.length === 0 || !calibration) return;

    if (isShapeClosed(segments)) {
      // Shape is closed — export immediately
      const dxf = buildDxfString(segments, calibration.pxPerMm, calibration.unit);
      downloadDxf(dxf, generateDxfFilename());
    } else {
      // Shape is not closed — show warning modal
      set({ closureWarningOpen: true });
    }
  },

  confirmExport: () => {
    const { segments, calibration } = get();
    if (segments.length === 0 || !calibration) return;
    set({ closureWarningOpen: false });
    const dxf = buildDxfString(segments, calibration.pxPerMm, calibration.unit);
    downloadDxf(dxf, generateDxfFilename());
  },

  dismissExport: () => {
    set({ closureWarningOpen: false });
  },
}));
