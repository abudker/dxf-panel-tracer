---
phase: 03-drawing-tools
plan: 01
subsystem: drawing
tags: [zustand, typescript, geometry, circumcircle, undo-redo, konva, arc, line]

# Dependency graph
requires:
  - phase: 02-scale-calibration
    provides: CalibrationState (pxPerMm), ToolMode guard, Viewport type, useAppStore pattern
provides:
  - LineSegment and ArcSegment types as discriminated union (Segment)
  - DrawingState transient type for FSM click accumulation
  - ToolMode extended with 'line' and 'arc'
  - circumcircle algorithm (center, radius, collinear from 3 points)
  - arcDirectionFromThreePoints (anticlockwise boolean for canvas.arc)
  - snapToEndpoint (scale-aware proximity check against all endpoints)
  - getEndpoints (endpoint extraction from segment array)
  - normalizeAngle, isAngleInSweep helpers
  - useAppStore extended with segments, drawHistory (max 50), drawFuture, selectedSegmentId, drawing
  - addSegment, deleteSegment, selectSegment, setDrawingClick, setCursorWorld, clearDrawing, undoDraw, redoDraw actions
affects: [DrawingLayer, CanvasStage, Toolbar, useDrawingKeys, dxf-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Canvas-convention angles (Y-down Math.atan2) stored in ArcSegment, DXF conversion deferred to Phase 4 export
    - Snapshot-based undo/redo with Segment[][] arrays, history capped at 50 via slice(-50)
    - FSM click logic lives in store action (setDrawingClick), not in React render cycle
    - crypto.randomUUID() for segment IDs
    - arcDirectionFromThreePoints uses isAngleInSweep (CCW sweep membership check) to pick correct arc direction

key-files:
  created:
    - src/utils/geometry.ts
  modified:
    - src/types/index.ts
    - src/store/useAppStore.ts

key-decisions:
  - "Canvas-convention angles (Y-down) stored in ArcSegment.startAngle/endAngle; DXF CCW conversion happens at export (Phase 4), not at store time"
  - "Snapshot-based undo/redo (Segment[][] arrays) rather than command/inverse pattern — simpler for two user-facing actions (add, delete)"
  - "arcDirectionFromThreePoints uses CCW sweep membership check (isAngleInSweep) rather than cross-product sign — handles wrap-around angles correctly"
  - "snapToEndpoint returns {point, snapped} object (not just Point) to allow DrawingLayer to render snap ring indicator without a second proximity call"

patterns-established:
  - "Pattern: Canvas angle convention — Math.atan2(dy, dx) in Y-down coords; negate Y for DXF export"
  - "Pattern: Undo/redo — push current state to history before mutation; slice(-50) for cap"
  - "Pattern: Drawing FSM in store — setDrawingClick drives all drawing state transitions"

requirements-completed: [DRAW-01, DRAW-02, DRAW-03, DRAW-06, DRAW-07]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 3 Plan 01: Drawing Data Layer Summary

**LineSegment/ArcSegment discriminated union, circumcircle geometry, snap utilities, and Zustand store extended with full segment lifecycle (add/delete/undo/redo FSM)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T22:27:36Z
- **Completed:** 2026-03-28T22:29:32Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- Complete type system for drawing: LineSegment, ArcSegment (with anticlockwise flag and canvas-convention angles), Segment discriminated union, DrawingState
- Full geometry utility module with circumcircle algorithm, arc direction determination, scale-aware endpoint snapping, and angle normalization helpers
- Zustand store extended with segment lifecycle (FSM-driven creation, deletion, selection) and snapshot-based undo/redo capped at 50 entries

## Task Commits

Each task was committed atomically:

1. **Task 1: Type definitions and geometry utilities** - `8e197d9` (feat)
2. **Task 2: Zustand store extension with drawing state and undo/redo** - `58f7863` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/types/index.ts` - Extended ToolMode with 'line'/'arc'; added LineSegment, ArcSegment, Segment union, DrawingState
- `src/utils/geometry.ts` - New file: circumcircle, arcDirectionFromThreePoints, snapToEndpoint, getEndpoints, normalizeAngle, isAngleInSweep
- `src/store/useAppStore.ts` - Extended with segments, drawHistory/drawFuture, drawing transient state, all drawing actions; setToolMode clears drawing state on mode switch

## Decisions Made

- **Canvas-convention angles**: ArcSegment stores startAngle/endAngle using `Math.atan2` in Y-down canvas coords. DXF CCW conversion (negate Y, convert to degrees) deferred to Phase 4. JSDoc comment on fields documents this convention.
- **Snapshot undo/redo**: Used `Segment[][]` arrays rather than command/inverse pattern. Simpler for exactly two user-facing undoable actions (add, delete). History capped at 50 via `slice(-50)`.
- **Arc direction algorithm**: Used CCW sweep membership check (`isAngleInSweep`) rather than cross-product sign. Handles angle wrap-around at 0/2π boundary correctly — cross-product approach fails when the sweep crosses the +X axis.
- **snapToEndpoint return type**: Returns `{point: Point, snapped: boolean}` rather than just `Point` so DrawingLayer can render a snap ring indicator without a second proximity check.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All data layer for drawing tools is complete and TypeScript-clean
- Phase 03-02 can build DrawingLayer, CanvasStage extension, Toolbar extension, and useDrawingKeys hook directly against this store/type API
- Blocker resolved: arc direction algorithm implemented and confirmed (isAngleInSweep approach handles angle wrap-around)
- No remaining blockers for Phase 3 UI work

---
*Phase: 03-drawing-tools*
*Completed: 2026-03-28*
