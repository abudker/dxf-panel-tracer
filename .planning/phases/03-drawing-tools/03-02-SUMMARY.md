---
phase: 03-drawing-tools
plan: 02
subsystem: ui
tags: [react-konva, konva, zustand, typescript, canvas, drawing-tools]

# Dependency graph
requires:
  - phase: 03-drawing-tools-01
    provides: segments store (addSegment, deleteSegment, setDrawingClick, etc.), geometry utils (circumcircle, snapToEndpoint), DrawingState types

provides:
  - DrawingLayer component rendering committed segments and ghost preview
  - useDrawingKeys hook for keyboard shortcuts (L/A/S, Ctrl+Z/Shift+Z, Delete, Escape)
  - CanvasStage extended with click routing, mousemove tracking, and DrawingLayer integration
  - Toolbar Line/Arc/Select buttons with active highlighting and disabled state
affects:
  - phase: 04-dxf-export (reads segments array built by these drawing tools)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Shape sceneFunc with context.arc() for arc segments (NOT Konva Arc component)
    - useDrawingKeys hook registers window keydown listener to avoid canvas focus issues
    - isInteractMode combines isCalibrateMode and isDrawingMode for cursor/draggable logic
    - arcGhostData computed in useMemo to avoid arc circumcircle calculation every render

key-files:
  created:
    - src/components/DrawingLayer.tsx
    - src/hooks/useDrawingKeys.ts
  modified:
    - src/components/CanvasStage.tsx
    - src/components/Toolbar.tsx

key-decisions:
  - "DrawingLayer uses Shape sceneFunc with context.arc() for arcs — Konva Arc component renders ring/donut sectors, not path arcs"
  - "useDrawingKeys attaches to window (not canvas) since Konva canvas cannot receive keyboard focus"
  - "isInteractMode = isCalibrateMode || isDrawingMode combines both non-pan modes for cursor and draggable logic"
  - "Arc ghost preview uses useMemo to avoid recomputing circumcircle on every render frame"

patterns-established:
  - "Shape sceneFunc for arc rendering: ctx.beginPath(); ctx.arc(...); ctx.fillStrokeShape(shape)"
  - "Window keydown hook with useEffect empty deps: read state via getState() inside handler to avoid stale closures"
  - "Ghost preview renders only when drawing.clickPoints.length > 0 && drawing.cursorWorld !== null"

requirements-completed: [DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06, DRAW-07]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 03 Plan 02: Drawing Tools UI Summary

**Interactive drawing tools: DrawingLayer (segments + ghost preview + snap ring), useDrawingKeys hook, CanvasStage click/mousemove routing with snapping, and Toolbar Line/Arc/Select buttons with active state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T22:32:00Z
- **Completed:** 2026-03-28T22:34:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 4

## Accomplishments
- DrawingLayer renders committed segments (lines via Konva Line, arcs via Shape sceneFunc), ghost preview (dashed), click point indicators, and amber snap ring
- useDrawingKeys handles all keyboard shortcuts: L/A/S for tool switch, Ctrl+Z/Shift+Z for undo/redo, Delete/Backspace for segment deletion, Escape to cancel
- CanvasStage routes clicks to setDrawingClick with endpoint snapping, tracks mousemove for ghost preview, disables panning during drawing
- Toolbar shows Line/Arc/Select buttons with active (blue) state; drawing buttons dim/disabled when uncalibrated

## Task Commits

Each task was committed atomically:

1. **Task 1: DrawingLayer component** - `9ed4800` (feat)
2. **Task 2: useDrawingKeys, CanvasStage, Toolbar** - `b17cf66` (feat)
3. **Task 3: Checkpoint auto-approved** - (no commit — verification only)

**Plan metadata:** (committed with SUMMARY.md)

## Files Created/Modified
- `src/components/DrawingLayer.tsx` - Konva Layer rendering segments, ghost preview, snap ring indicator
- `src/hooks/useDrawingKeys.ts` - Window keydown listener for all drawing keyboard shortcuts
- `src/components/CanvasStage.tsx` - Extended with click routing, mousemove handler, DrawingLayer integration
- `src/components/Toolbar.tsx` - Added Line/Arc/Select tool buttons with active and disabled states

## Decisions Made
- DrawingLayer uses `<Shape sceneFunc>` with `context.arc()` for arc segments — Konva's built-in `<Arc>` renders ring/donut sectors, not geometric path arcs (confirmed by plan anti-patterns)
- Window-level keydown listener in useDrawingKeys — Konva canvas element cannot receive keyboard focus without tabIndex, and attaching to the Stage div requires focus management; window is the correct target
- `isInteractMode` variable combines calibrate and drawing modes to unify cursor (crosshair) and draggable (false) logic in a single place
- Arc ghost preview useMemo wraps circumcircle computation (expensive math) to avoid recalculating on every mousemove render

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Complete interactive drawing tools ready: lines (2-click), arcs (3-click), ghost preview, endpoint snapping, selection, deletion, undo/redo
- All 7 DRAW requirements (DRAW-01 through DRAW-07) implemented
- Segments stored in world coordinates with canvas-convention angles — DXF angle conversion (negate Y) deferred to Phase 4 export as planned
- Phase 4 (DXF export) can now read the `segments` array and pxPerMm calibration to produce DXF output

---
*Phase: 03-drawing-tools*
*Completed: 2026-03-28*
