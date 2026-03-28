---
phase: 02-scale-calibration
plan: 02
subsystem: ui
tags: [react, typescript, zustand, tailwind, ruler, calibration, canvas]

# Dependency graph
requires:
  - phase: 02-scale-calibration-01
    provides: calibration store (pxPerMm, unit, viewport state) established in Plan 01

provides:
  - RulerOverlay component with auto-scaling tick marks displaying real-world units
  - HTML fixed overlay ruler visible at canvas bottom after calibration is set
  - pickNiceInterval function selecting readable major tick intervals at any zoom level
  - Minor tick subdivisions (4 per interval) for finer visual granularity

affects: [03-drawing-tools, 04-dxf-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HTML ruler overlay over Konva canvas (avoids inverse-scale math, simpler React model)
    - pickNiceInterval with static lookup table for nice human-readable tick spacing
    - World-coordinate to screen-coordinate mapping for ruler tick positions

key-files:
  created:
    - src/components/RulerOverlay.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "RulerOverlay uses inline styles for pixel-accurate positioning rather than Tailwind utilities for sub-pixel values"
  - "majorIntervalPx variable removed — minor tick spacing computed from actual rendered major tick screen positions, not pre-calculated interval"

patterns-established:
  - "Pattern: HTML ruler overlay reads viewport.x for pan-scroll and viewport.scale for zoom-adaptive tick spacing"
  - "Pattern: pickNiceInterval receives both screenPxPerMm and unit — unit-specific nice step arrays (mm vs in)"

requirements-completed: [PHOTO-05]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 02 Plan 02: RulerOverlay Summary

**Fixed-position HTML ruler overlay with pickNiceInterval auto-scaling ticks, labeled in calibration unit (mm or inches), scrolling with pan offset via viewport.x**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T22:07:03Z
- **Completed:** 2026-03-28T22:09:00Z
- **Tasks:** 2 (1 auto + 1 checkpoint auto-approved)
- **Files modified:** 2

## Accomplishments

- RulerOverlay component renders a 32px fixed strip at canvas bottom, only after calibration is set
- Auto-scaling major tick intervals using unit-specific nice step arrays (mm: 1-1000, in: 0.25-50) ensuring ticks stay 60+ screen pixels apart at any zoom
- 4 minor ticks subdivide each major interval for finer visual reference; suppressed when total tick count exceeds 200 (performance guard)
- Ruler ticks scroll with pan offset (viewport.x) staying aligned with photo world coordinates
- Unit indicator label ("millimeters" / "inches") in bottom-right corner of ruler strip
- TypeScript clean, production build passing

## Task Commits

1. **Task 1: Create RulerOverlay component and wire into App** - `5678e48` (feat)
2. **Task 2: Verify complete calibration flow** - auto-approved checkpoint (no commit)

## Files Created/Modified

- `src/components/RulerOverlay.tsx` - HTML ruler overlay with pickNiceInterval, major+minor ticks, unit label
- `src/App.tsx` - Added RulerOverlay import and render after CanvasStage/DropZoneOverlay

## Decisions Made

- Used inline styles for tick positioning (left, bottom, width, height) rather than dynamic Tailwind classes — Tailwind's JIT cannot generate arbitrary pixel values computed at runtime.
- Removed pre-calculated `majorIntervalPx` variable (was unused — TypeScript strict mode caught it); minor tick positions are derived from the difference between adjacent major tick `screenX` values, which is more accurate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `majorIntervalPx` variable that caused TypeScript build error**
- **Found during:** Task 1 (build verification)
- **Issue:** `majorIntervalPx` was computed but never used; TypeScript strict mode (`TS6133`) treats it as an error, breaking the build
- **Fix:** Removed the variable. Minor tick spacing is computed from adjacent major tick `screenX` values instead, which is equivalent and more accurate
- **Files modified:** src/components/RulerOverlay.tsx
- **Verification:** `npm run build` exits 0
- **Committed in:** 5678e48 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - build error)
**Impact on plan:** Fix was necessary for build to pass. No scope creep; minor tick logic still correct.

## Issues Encountered

None beyond the TypeScript unused-variable error (auto-fixed).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Scale calibration system fully complete (Plans 01 and 02): two-click calibration, modal, visual dots/line, ruler overlay, toast warning, toolbar badge
- Phase 03 drawing tools can read `calibration.pxPerMm` from the store to convert world pixels to real-world units
- Phase 04 DXF export reads the same `pxPerMm` value — no changes to store shape needed

---
*Phase: 02-scale-calibration*
*Completed: 2026-03-28*
