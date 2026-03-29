---
phase: 04-dxf-export-and-polish
verified: 2026-03-28T23:25:00Z
status: human_needed
score: 9/11 must-haves verified (2 require human)
re_verification: false
human_verification:
  - test: "Open exported DXF in Carbide Create and verify real-world dimensions"
    expected: "A calibrated distance (e.g., 100 mm) measures correctly in Carbide Create with no dimension distortion"
    why_human: "Cannot run Carbide Create programmatically; dimensional accuracy in external CAD software requires visual inspection"
  - test: "Verify arc convexity/concavity direction in Carbide Create"
    expected: "Arcs appear convex/concave in the correct direction; path is not shown as open/magenta in Carbide Create"
    why_human: "DXF arc angle math has direction conventions that are difficult to verify without rendering in the target CAD software"
---

# Phase 4: DXF Export and Polish Verification Report

**Phase Goal:** User can export the traced shape as a dimensionally accurate DXF file that opens cleanly in Carbide Create with no further cleanup
**Verified:** 2026-03-28T23:25:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | buildDxfString produces a valid DXF string with HEADER, ENTITIES, and EOF sections | VERIFIED | 36/36 tests pass; code emits `0\nSECTION\n2\nHEADER`, `0\nSECTION\n2\nENTITIES`, and `0\nEOF\n` |
| 2 | LINE entities have correct real-world coordinates after Y-flip, origin normalization, and pxPerMm scaling | VERIFIED | Tests verify all coordinate transforms; `buildDxfString` correctly negates Y, subtracts (minX, minY), calls `toRealUnits` |
| 3 | ARC entities have correct center, radius, and degree angles with proper direction handling | VERIFIED | Tests verify center Y-flip, radius scaling, radian-to-degree conversion, angle swap for anticlockwise=true |
| 4 | $INSUNITS is 1 for inches and 4 for millimeters | VERIFIED | `dxfExport.ts` line 70: `const insunits = unit === 'in' ? 1 : 4`; tests confirm both values |
| 5 | isShapeClosed returns true when first and last endpoints are within 0.5px tolerance | VERIFIED | 6 tests covering empty, single segment, exact match, gap at 0.3px, gap at 1px, and arc endpoints |
| 6 | downloadDxf triggers a browser file download with panel-trace-YYYY-MM-DD.dxf filename | VERIFIED | 5 mock-based tests verify Blob creation with `application/dxf`, createObjectURL call, download attribute set, anchor click, and revokeObjectURL |
| 7 | User can click Export DXF button in toolbar and receive a downloaded .dxf file | VERIFIED | Toolbar has Export button wired to `triggerExport()`; store calls `buildDxfString` + `downloadDxf` |
| 8 | Export button is disabled (dimmed, not clickable) when no segments exist | VERIFIED | `hasSegments = segments.length > 0 && calibration !== null`; button uses `opacity-40 cursor-not-allowed` when false |
| 9 | User sees a closure warning modal when exporting an unclosed shape | VERIFIED | `triggerExport` calls `isShapeClosed`; sets `closureWarningOpen: true` if false; `ClosureWarningModal` renders |
| 10 | Opening exported DXF in Carbide Create shows correct real-world dimensions | ? UNCERTAIN | Cannot verify programmatically — requires human to open DXF in Carbide Create and measure |
| 11 | Arcs appear in correct direction in Carbide Create (no open/magenta path) | ? UNCERTAIN | Arc angle direction math is correct in tests but actual rendering in Carbide Create requires human verification |

**Score:** 9/11 truths verified (2 require human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/dxfExport.ts` | Pure DXF export functions | VERIFIED | 185 lines; exports `buildDxfString`, `isShapeClosed`, `downloadDxf`, `generateDxfFilename` |
| `src/utils/dxfExport.test.ts` | Test suite, min 80 lines | VERIFIED | 414 lines, 36 tests, all passing |
| `vitest.config.ts` | Vitest configuration | VERIFIED | Exists, configures `globals: true, environment: 'node'` |
| `src/components/ClosureWarningModal.tsx` | Modal warning, min 30 lines | VERIFIED | 42 lines; renders conditional modal with Cancel/Continue buttons |
| `src/components/Toolbar.tsx` | Export DXF button | VERIFIED | Contains "Export" text and Download icon; `triggerExport` wired |
| `src/store/useAppStore.ts` | closureWarningOpen state and export actions | VERIFIED | Contains `closureWarningOpen`, `triggerExport`, `confirmExport`, `dismissExport` |
| `src/App.tsx` | ClosureWarningModal mounted | VERIFIED | Line 6 imports, line 27 mounts `<ClosureWarningModal />` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/Toolbar.tsx` | `src/store/useAppStore.ts` | `triggerExport` on Export button click | WIRED | Line 84: `useAppStore.getState().triggerExport()` called when `hasSegments` |
| `src/store/useAppStore.ts` | `src/utils/dxfExport.ts` | `buildDxfString`, `isShapeClosed`, `downloadDxf`, `generateDxfFilename` | WIRED | Line 4 imports all four; used in `triggerExport` and `confirmExport` |
| `src/components/ClosureWarningModal.tsx` | `src/store/useAppStore.ts` | `confirmExport` and `dismissExport` | WIRED | Lines 26 and 33: Cancel calls `dismissExport`, Continue calls `confirmExport` |
| `src/utils/dxfExport.ts` | `src/types/index.ts` | imports `Segment`, `CalibrationUnit` | WIRED | Line 1: `import type { Segment, CalibrationUnit } from '../types'` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Toolbar.tsx` | `segments`, `calibration` | `useAppStore` state | Yes — populated by drawing actions and calibration flow | FLOWING |
| `ClosureWarningModal.tsx` | `closureWarningOpen` | `useAppStore` state | Yes — set by `triggerExport` when `isShapeClosed` returns false | FLOWING |
| `useAppStore.ts triggerExport` | `segments`, `calibration` | Zustand store | Yes — segments from drawing, calibration from user input | FLOWING |
| `buildDxfString` output | `dxf` string | Coordinate math on real segment data | Yes — transforms actual segment coordinates | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 36 DXF export tests pass | `npx vitest run src/utils/dxfExport.test.ts` | 36/36 tests passed, 116ms | PASS |
| TypeScript compiles cleanly | `npx tsc --noEmit` | No output (zero errors) | PASS |
| Vitest binary available | `npx vitest --version` | v4.1.2 | PASS |
| Export button appears in Toolbar | `grep "Export" src/components/Toolbar.tsx` | Found on line 92 | PASS |
| ClosureWarningModal mounted in App | `grep "ClosureWarningModal" src/App.tsx` | Found on lines 6 and 27 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EXPORT-01 | 04-01 + 04-02 | User can export traced shape as a DXF file with LINE and ARC entities at real-world dimensions | SATISFIED | `buildDxfString` produces LINE+ARC entities with coordinate math; triggered via Toolbar Export button |
| EXPORT-02 | 04-02 | User is warned if the shape is not closed before export | SATISFIED | `triggerExport` calls `isShapeClosed`; shows `ClosureWarningModal` with Cancel/Continue when open |
| EXPORT-03 | 04-01 + 04-02 | Exported file has a sensible default filename (e.g., panel-trace-2026-03-28.dxf) | SATISFIED | `generateDxfFilename()` returns `panel-trace-YYYY-MM-DD.dxf`; used in both `triggerExport` and `confirmExport` |

No orphaned requirements: REQUIREMENTS.md maps EXPORT-01, EXPORT-02, EXPORT-03 to Phase 4. All three appear in plan frontmatter (04-01 claims EXPORT-01 + EXPORT-03; 04-02 claims EXPORT-01 + EXPORT-02 + EXPORT-03). Full coverage.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/ClosureWarningModal.tsx` | 6 | `return null` | Info | Correct guard — modal is conditionally hidden; not a stub |

No blockers. The single `return null` in `ClosureWarningModal` is the standard React conditional render guard: `if (!closureWarningOpen) return null`. The component renders fully when `closureWarningOpen` is true, confirmed by reading the full file.

### Human Verification Required

#### 1. Dimensional Accuracy in Carbide Create

**Test:** Export a DXF from a shape with a known calibration distance (e.g., click two points 100px apart and enter 100 mm). Open the downloaded `.dxf` in Carbide Create and measure the distance between the two endpoints.
**Expected:** The measurement reads 100 mm (or within 0.1 mm tolerance). All geometry is at the correct real-world scale.
**Why human:** Carbide Create cannot be run programmatically. The coordinate math (Y-flip, origin normalization, pxPerMm scaling) has been verified by unit tests, but the end-to-end round-trip through actual CNC software requires manual inspection.

#### 2. Arc Direction in Carbide Create

**Test:** Export a shape containing at least one arc. Open the DXF in Carbide Create and verify that arcs curve in the expected direction (convex vs. concave). Also verify that Carbide Create does not highlight the path as open (no magenta/red segments indicating open endpoints).
**Expected:** Arcs appear in the correct convex/concave orientation. No open-path warnings from Carbide Create.
**Why human:** DXF arc angle conventions (CCW positive from +X axis) require correct handling of the Y-axis flip and anticlockwise flag. The swap logic is unit-tested but the visual correctness in the target CAD software — which has its own rendering quirks — can only be confirmed by opening the file.

### Gaps Summary

No programmatic gaps found. The phase goal is fully wired end-to-end:

- `buildDxfString` implements correct Y-flip, origin normalization, unit scaling, and arc angle conversion (36 tests, all passing)
- `isShapeClosed` correctly detects closure within 0.5px tolerance
- `downloadDxf` triggers browser download via Blob + anchor pattern
- `generateDxfFilename` produces `panel-trace-YYYY-MM-DD.dxf`
- Toolbar Export button is wired to `triggerExport`, disabled when no segments or no calibration
- `ClosureWarningModal` renders when shape is not closed; Continue/Cancel both wired correctly
- All three requirements (EXPORT-01, EXPORT-02, EXPORT-03) are satisfied by implementation
- TypeScript compiles with zero errors

The two human verification items (dimensional accuracy and arc direction in Carbide Create) correspond directly to Success Criteria 2 and 3 from ROADMAP.md Phase 4, which explicitly require observing behavior in Carbide Create. These cannot be resolved programmatically.

---

_Verified: 2026-03-28T23:25:00Z_
_Verifier: Claude (gsd-verifier)_
