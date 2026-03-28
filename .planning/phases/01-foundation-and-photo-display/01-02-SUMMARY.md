---
phase: 01-foundation-and-photo-display
plan: 02
subsystem: ui
tags: [react, konva, react-konva, use-image, exifr, zustand, tailwind]

# Dependency graph
requires:
  - phase: 01-foundation-and-photo-display
    plan: 01
    provides: "AppStore with photoUrl/photoSize/viewport/setViewport, Toolbar with onFileSelect prop, coordinates util with calculateContainFit, types (Viewport, Point)"

provides:
  - "Photo upload with EXIF orientation correction for orientations 1/3/6/8 via off-screen canvas"
  - "Konva Stage with draggable pan (grab/grabbing cursor) and pointer-anchored scroll-wheel zoom (clamped 0.1–10)"
  - "PhotoLayer component displaying EXIF-corrected photo at world origin via use-image hook"
  - "DropZoneOverlay empty state with drag-and-drop file handling and validation error messages"
  - "App wired to show DropZoneOverlay (no photo) or CanvasStage (photo loaded)"
  - "Contain-fit initial viewport calculated on photo load and synced to Konva Stage"

affects: [phase-02-calibration, phase-03-drawing-tools, phase-04-dxf-export]

# Tech tracking
tech-stack:
  added: [exifr, use-image]
  patterns:
    - "useAppStore.getState() inside event callbacks to avoid stale closures"
    - "Viewport state synced to Konva Stage via useEffect on viewport change (contains-fit on photo load)"
    - "EXIF orientation correction: swap canvas width/height for 90/270-degree rotations, off-screen canvas draw, toBlob URL"
    - "Konva draggable Stage + onDragEnd for pan sync; onWheel for pointer-anchored zoom"

key-files:
  created:
    - src/hooks/usePhotoUpload.ts
    - src/hooks/useViewport.ts
    - src/components/PhotoLayer.tsx
    - src/components/CanvasStage.tsx
    - src/components/DropZoneOverlay.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "useAppStore.getState() used inside event handlers (not hook selector) to prevent stale closure captures in Konva callbacks"
  - "viewport useEffect syncs Konva Stage transform on every viewport state change, enabling contain-fit repositioning after photo load"

patterns-established:
  - "Pattern: hooks export named functions (usePhotoUpload, useViewport) — consistent with store and component conventions"
  - "Pattern: EXIF correction is async; handlePhotoFile is async, called via useCallback in App"
  - "Pattern: DropZoneOverlay validates file type client-side before calling onFileSelect — keeps upload hook clean"

requirements-completed: [PHOTO-01, PHOTO-02, PHOTO-03]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 01 Plan 02: Photo Upload, EXIF Correction, Konva Canvas with Pan/Zoom Summary

**Konva Stage with EXIF-corrected photo upload, pointer-anchored scroll zoom (10%-1000%), draggable pan, contain-fit initial view, and drag-and-drop empty state**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T21:29:36Z
- **Completed:** 2026-03-28T21:31:21Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 6

## Accomplishments

- Photo upload handles EXIF orientation 6 (90° CW — portrait phone), 3 (180°), and 8 (270° CW) via off-screen canvas rotation
- Konva Stage provides pointer-anchored zoom (scroll wheel, clamped 0.1–10.0) and draggable pan with grab/grabbing cursor feedback
- DropZoneOverlay shows empty state with drag-and-drop support, visual feedback on drag-over (border turns blue, heading changes to "Drop to open"), and error message for unsupported file types
- App conditionally renders CanvasStage or DropZoneOverlay based on photoUrl state; both Toolbar and DropZoneOverlay route files through the same handlePhotoFile path

## Task Commits

Each task was committed atomically:

1. **Task 1: Photo upload hook with EXIF correction and viewport hook** - `6cbc4d5` (feat)
2. **Task 2: CanvasStage, PhotoLayer, DropZoneOverlay, and App wiring** - `32f9a3d` (feat)
3. **Task 3: Human verify checkpoint** - auto-approved (no commit)

## Files Created/Modified

- `src/hooks/usePhotoUpload.ts` - Validates file type, reads EXIF orientation via exifr, corrects via off-screen canvas, sets photoUrl/photoSize/viewport (contain-fit)
- `src/hooks/useViewport.ts` - Pointer-anchored zoom with MIN_SCALE=0.1/MAX_SCALE=10/ZOOM_FACTOR=1.12, drag-end pan sync, uses getState() to avoid stale closures
- `src/components/PhotoLayer.tsx` - Konva Layer with useImage hook displaying photo at world origin (0,0)
- `src/components/CanvasStage.tsx` - Konva Stage with draggable pan, onWheel zoom, resize observer for dimensions, viewport useEffect for contain-fit sync
- `src/components/DropZoneOverlay.tsx` - Empty state with drag-over feedback, file type validation, error display
- `src/App.tsx` - Wires photoUrl selector to conditionally render CanvasStage or DropZoneOverlay, routes file selection through usePhotoUpload

## Decisions Made

- `useAppStore.getState()` used inside Konva event handlers instead of React hook selectors to prevent stale closure captures — Konva callbacks execute outside React render cycle
- Viewport `useEffect` in CanvasStage syncs Konva Stage transform on every `viewport` state change, which enables contain-fit repositioning to take effect immediately after photo load

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 success criteria fully met: photo upload (PHOTO-01), pan (PHOTO-02), zoom (PHOTO-03)
- Canvas foundation ready for Phase 2 calibration: user can upload a photo and navigate it to position calibration points
- Coordinate utilities (screenToWorld, worldToScreen, calculateContainFit) established and tested through usage
- Zustand store shape is stable — Phase 2 calibration adds to it without changing existing fields

---
*Phase: 01-foundation-and-photo-display*
*Completed: 2026-03-28*

## Self-Check: PASSED

- All 6 source files created/modified: FOUND
- SUMMARY.md created: FOUND
- Task 1 commit 6cbc4d5: FOUND
- Task 2 commit 32f9a3d: FOUND
