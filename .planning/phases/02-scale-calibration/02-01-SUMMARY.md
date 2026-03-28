---
phase: 02-scale-calibration
plan: 01
subsystem: ui
tags: [konva, zustand, react, calibration, canvas]

# Dependency graph
requires:
  - phase: 01-foundation-and-photo-display
    provides: CanvasStage with PhotoLayer, Zustand store with viewport/toolMode, screenToWorld utility, Tailwind dark UI shell

provides:
  - Two-click scale calibration flow computing pxPerMm from world-coordinate click points
  - CalibrationLayer Konva Layer rendering accent-blue dots and dashed line during calibration
  - CalibrationModal dialog collecting distance and unit (in/mm) after second click
  - Toast auto-dismiss notification for scale-first enforcement
  - Toolbar Calibrate button with active state and amber "No scale set" badge
  - setToolMode guard blocking drawing tools when calibration is null (PHOTO-06 forward-compatible)

affects: [03-drawing-tools, 04-dxf-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "World-coordinate click capture: screenToWorld(stage.getPointerPosition(), viewport) in Konva Stage onClick handler"
    - "Calibrate mode disables Stage drag via draggable={toolMode !== 'calibrate'} declarative prop"
    - "Calibration guard in setToolMode: future drawing tools blocked when calibration === null"
    - "pxPerMm = Math.sqrt(dx^2 + dy^2) / distanceMm where distanceMm = unit === 'in' ? d*25.4 : d"

key-files:
  created:
    - src/components/CalibrationLayer.tsx
    - src/components/CalibrationModal.tsx
    - src/components/Toast.tsx
  modified:
    - src/types/index.ts
    - src/store/useAppStore.ts
    - src/components/CanvasStage.tsx
    - src/components/Toolbar.tsx
    - src/App.tsx

key-decisions:
  - "CalibrationClickState (transient) kept separate from CalibrationState (persistent) so prior calibration survives re-calibration flow"
  - "cancelCalibration preserves existing calibration to keep ruler visible during re-calibration attempt"
  - "setToolMode guard is forward-compatible: condition mode !== 'select' && mode !== 'calibrate' will fire automatically when Phase 3 adds 'line' and 'arc'"

patterns-established:
  - "CalibrationLayer dots and line are in world coordinates — they scale with viewport (correct; user zooms in to place reference points precisely)"
  - "Toast reads toastMessage from Zustand store; auto-dismisses via useEffect setTimeout with cleanup"

requirements-completed: [PHOTO-04, PHOTO-06]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 02 Plan 01: Scale Calibration Core Summary

**Two-click pxPerMm calibration with Konva dot/line visual feedback, distance modal, toast warning, and toolbar Calibrate button — fully wired into CanvasStage, Toolbar, and App**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T22:01:21Z
- **Completed:** 2026-03-28T22:03:30Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Full two-click calibration state machine in Zustand: addCalibrationPoint, confirmCalibration, cancelCalibration, resetCalibration with pxPerMm Euclidean distance computation
- Visual feedback: accent-blue (#3b82f6) dots at each clicked world-coordinate point and dashed line between them via CalibrationLayer Konva Layer
- CalibrationModal collects distance and unit with disabled Confirm when invalid; cancelCalibration preserves prior calibration for re-calibration scenarios
- Scale-first enforcement: setToolMode blocks non-select/non-calibrate tools when calibration is null and shows toast warning (PHOTO-06)
- Toolbar Calibrate button with active state and amber "No scale set" badge hidden once calibrated

## Task Commits

Each task was committed atomically:

1. **Task 1: Add calibration types and Zustand store slice** - `df7c732` (feat)
2. **Task 2: Create CalibrationLayer, CalibrationModal, and Toast components** - `f6b43fd` (feat)
3. **Task 3: Wire calibration into CanvasStage, Toolbar, and App** - `844a878` (feat)

## Files Created/Modified
- `src/types/index.ts` - Added CalibrationUnit, CalibrationState, CalibrationClickState types; expanded ToolMode to include 'calibrate'
- `src/store/useAppStore.ts` - Added full calibration slice: state, 4 actions, toastMessage, setToolMode guard
- `src/components/CalibrationLayer.tsx` - Konva Layer rendering dots and dashed line at world-coordinate click points
- `src/components/CalibrationModal.tsx` - Modal dialog with distance input, in/mm unit toggle, confirm/cancel buttons
- `src/components/Toast.tsx` - Auto-dismiss toast reading from Zustand toastMessage
- `src/components/CanvasStage.tsx` - Added onClick handler, CalibrationLayer, calibrate mode drag disable, crosshair cursor
- `src/components/Toolbar.tsx` - Added Crosshair button, active state, "No scale set" badge
- `src/App.tsx` - Added CalibrationModal and Toast overlays to render tree

## Decisions Made
- CalibrationClickState (transient) kept separate from CalibrationState (persistent) so prior pxPerMm survives while user re-calibrates
- cancelCalibration does NOT clear calibration — only clears click points and closes modal — so the ruler (Phase 02-02) remains visible during a failed re-calibration attempt
- setToolMode guard uses `mode !== 'select' && mode !== 'calibrate'` so it automatically activates when Phase 3 adds 'line' and 'arc' to ToolMode without further changes needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components read from live Zustand store state. CalibrationLayer renders actual clicked world-coordinate points. pxPerMm is computed from real input values. No hardcoded or mock data.

## Next Phase Readiness
- pxPerMm is stored in `useAppStore((s) => s.calibration)` as `{ pxPerMm, unit }` — Phase 02-02 (ruler overlay) can read this immediately
- Phase 03 drawing tools: subscribe to `calibration` to read pxPerMm; setToolMode guard is already wired
- Phase 04 DXF export: world-pixel coordinates stored in segments divided by pxPerMm gives real-world mm values
- No blockers for Phase 02-02

---
*Phase: 02-scale-calibration*
*Completed: 2026-03-28*

## Self-Check: PASSED

- All 8 source files exist on disk
- SUMMARY.md exists at .planning/phases/02-scale-calibration/02-01-SUMMARY.md
- All 3 task commits verified: df7c732, f6b43fd, 844a878
