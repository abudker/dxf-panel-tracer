---
phase: 01-foundation-and-photo-display
verified: 2026-03-28T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Upload a portrait phone photo (EXIF orientation 6) via the file picker"
    expected: "Photo displays upright in the canvas, not rotated 90 degrees sideways"
    why_human: "EXIF canvas rotation is correct in code, but the actual display output requires a real browser and a phone-captured JPEG with orientation=6 EXIF tag to confirm"
  - test: "Scroll wheel zoom on the canvas while photo is loaded"
    expected: "The point under the cursor stays anchored as you zoom in and out; zoom stops at extremes"
    why_human: "Pointer-anchored zoom math is correct, but the felt behavior (cursor anchor, clamping feel) can only be confirmed by a human in a running browser"
  - test: "Drag a non-image file (e.g. a .txt file) onto the drop zone"
    expected: "Error message 'Only JPG, PNG, and WebP photos are supported. Try a different file.' appears"
    why_human: "File-type validation logic is present in code, but real drag-and-drop behavior with OS file objects must be confirmed in a browser"
  - test: "Drag an image file onto the drop zone while it shows 'Upload a photo to start'"
    expected: "Border turns blue, heading changes to 'Drop to open', then photo loads and canvas appears on drop"
    why_human: "State toggle between isDragOver states and subsequent conditional render are logic-correct, but visual feedback and the transition to CanvasStage require live browser confirmation"
---

# Phase 1: Foundation and Photo Display — Verification Report

**Phase Goal:** User can upload a photo and navigate it as a tracing background, with the coordinate system fully established for downstream tools
**Verified:** 2026-03-28
**Status:** human_needed — all automated checks pass; 4 items require browser confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | User can upload an image file from their computer and see it fill the canvas | VERIFIED | `usePhotoUpload.handlePhotoFile` calls `setPhotoUrl` -> `App.tsx` conditionally renders `<CanvasStage>` -> `PhotoLayer` renders `<KonvaImage image={image}>` from `useImage(photoUrl)` |
| 2 | User can pan the canvas by clicking and dragging | VERIFIED | `CanvasStage` has `draggable` prop on `<Stage>` and `onDragEnd={handleDragEnd}`; `useViewport.handleDragEnd` calls `setViewport({x,y})`; viewport useEffect syncs stage position |
| 3 | User can zoom in and out with the scroll wheel and the image stays anchored to the cursor position | VERIFIED | `useViewport.handleWheel` implements pointer-anchored zoom with `stage.getPointerPosition()`, clamped via `Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale))` where MIN=0.1, MAX=10 |
| 4 | A high-resolution phone photo displays without orientation errors (EXIF rotation applied correctly) | VERIFIED (code) / ? NEEDS HUMAN (visual) | `usePhotoUpload.correctOrientation` handles orientations 1, 3, 6, 8 via off-screen canvas with `ctx.rotate`; canvas dimensions swapped for 90°/270° rotations. Runtime output requires human confirmation. |

**Score:** 4/4 truths verified (code) — 4 items routed to human verification for visual/runtime confirmation

---

### Required Artifacts

#### Plan 01-01 Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/types/index.ts` | Point, Viewport, ToolMode definitions | Yes | Yes — all 3 exports present with correct shapes | Yes — imported by `useAppStore`, `coordinates.ts` | VERIFIED |
| `src/utils/coordinates.ts` | screenToWorld, worldToScreen, calculateContainFit | Yes | Yes — all 3 functions with correct math | Yes — imported by `usePhotoUpload.ts`; used for contain-fit calculation | VERIFIED |
| `src/store/useAppStore.ts` | Zustand store with photoUrl, viewport, setPhotoUrl, setViewport | Yes | Yes — full AppState interface, all setters implemented | Yes — imported in App.tsx, hooks, PhotoLayer, CanvasStage | VERIFIED |
| `src/components/Toolbar.tsx` | Floating toolbar component | Yes | Yes — fixed positioning at top-left with correct colors and border | Yes — rendered in App.tsx as `<Toolbar onFileSelect={onFileSelect}>` | VERIFIED |
| `src/components/UploadButton.tsx` | Open Photo button triggering file picker | Yes | Yes — Lucide Upload icon, hidden file input, 44px touch target, accepts image/jpeg,image/png,image/webp | Yes — rendered inside Toolbar, `onFileSelect` prop wired | VERIFIED |

#### Plan 01-02 Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/hooks/usePhotoUpload.ts` | Photo file handling with EXIF orientation correction | Yes | Yes — validates type, reads exifr.orientation, canvas rotation for 3/6/8, setPhotoUrl+setPhotoSize+setViewport | Yes — imported and called in App.tsx via `usePhotoUpload()` | VERIFIED |
| `src/hooks/useViewport.ts` | Pan/zoom event handlers for Konva Stage | Yes | Yes — handleWheel (pointer-anchored, clamped 0.1–10, ZOOM_FACTOR=1.12) and handleDragEnd with setViewport | Yes — imported in CanvasStage, passed to `<Stage onWheel handleDragEnd>` | VERIFIED |
| `src/components/CanvasStage.tsx` | Konva Stage with pan/zoom | Yes | Yes — draggable Stage, resize observer, viewport useEffect syncing scale/position, grab/grabbing cursor | Yes — rendered in App.tsx when photoUrl is set; contains PhotoLayer | VERIFIED |
| `src/components/PhotoLayer.tsx` | Konva Layer displaying photo | Yes | Yes — useImage(photoUrl), guards on load status, KonvaImage at world origin (0,0) | Yes — rendered inside CanvasStage's Stage | VERIFIED |
| `src/components/DropZoneOverlay.tsx` | Empty state with drag-and-drop | Yes | Yes — isDragOver state, drag handlers, file type validation, error display, "Upload a photo to start" / "Drop to open" copy | Yes — rendered in App.tsx when photoUrl is null | VERIFIED |

---

### Key Link Verification

#### Plan 01-01 Key Links

| From | To | Via | Pattern | Status |
|------|----|-----|---------|--------|
| `src/store/useAppStore.ts` | `src/types/index.ts` | imports Viewport type | `import type { Viewport, ToolMode } from '../types'` — line 2 | WIRED |
| `src/utils/coordinates.ts` | `src/types/index.ts` | imports Viewport type | `import type { Point, Viewport } from '../types'` — line 1 | WIRED |
| `src/App.tsx` | `src/components/Toolbar.tsx` | renders Toolbar component | `<Toolbar onFileSelect={onFileSelect} />` — line 21 | WIRED |

#### Plan 01-02 Key Links

| From | To | Via | Pattern | Status |
|------|----|-----|---------|--------|
| `src/hooks/usePhotoUpload.ts` | `src/store/useAppStore.ts` | calls setPhotoUrl and setViewport | `useAppStore.getState()` then `setPhotoUrl`, `setPhotoSize`, `setViewport` — lines 74–80 | WIRED |
| `src/hooks/useViewport.ts` | `src/store/useAppStore.ts` | calls setViewport on wheel and drag-end | `useAppStore.getState().setViewport(...)` — lines 42, 47 | WIRED |
| `src/components/CanvasStage.tsx` | `src/hooks/useViewport.ts` | uses handleWheel and handleDragEnd | `const { handleWheel, handleDragEnd } = useViewport(stageRef)` — line 17; passed to `<Stage>` props — lines 51–52 | WIRED |
| `src/components/CanvasStage.tsx` | `src/components/PhotoLayer.tsx` | renders PhotoLayer inside Stage | `<PhotoLayer />` — line 65 | WIRED |
| `src/App.tsx` | `src/components/CanvasStage.tsx` | renders CanvasStage when photo loaded | `{photoUrl ? <CanvasStage />` — lines 22–24 | WIRED |
| `src/App.tsx` | `src/components/DropZoneOverlay.tsx` | renders DropZoneOverlay when no photo | `: <DropZoneOverlay onFileSelect={onFileSelect} />}` — lines 25–26 | WIRED |

All 9 key links verified as WIRED.

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `PhotoLayer.tsx` | `photoUrl` | `useAppStore((s) => s.photoUrl)` | Yes — set by `usePhotoUpload` via `URL.createObjectURL(correctedBlob)` after EXIF processing | FLOWING |
| `PhotoLayer.tsx` | `image` | `useImage(photoUrl ?? '')` | Yes — `useImage` resolves real HTMLImageElement from the blob URL; guards on `status !== 'loaded'` | FLOWING |
| `CanvasStage.tsx` | `viewport` | `useAppStore((s) => s.viewport)` | Yes — set by `usePhotoUpload` (contain-fit on load) and `useViewport` (pan/zoom events) | FLOWING |
| `DropZoneOverlay.tsx` | `isDragOver` / `error` | local `useState`, set by drag event handlers | Yes — driven by real DOM drag events | FLOWING |
| `App.tsx` | `photoUrl` (conditional render gate) | `useAppStore((s) => s.photoUrl)` | Yes — null initially, set to real blob URL by `usePhotoUpload` | FLOWING |

No hollow props. No disconnected data sources. No static stubs reaching render output.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PHOTO-01 | 01-01, 01-02 | User can upload a photo and display it as the canvas background | SATISFIED | File picker (UploadButton) + drag-and-drop (DropZoneOverlay) both call `handlePhotoFile`; EXIF-corrected blob URL stored in `photoUrl`; PhotoLayer renders it via `useImage` in Konva |
| PHOTO-02 | 01-02 | User can pan the canvas by dragging | SATISFIED | Konva Stage with `draggable` prop; `handleDragEnd` syncs pan position to Zustand; viewport useEffect applies position to stage |
| PHOTO-03 | 01-02 | User can zoom in/out with scroll wheel | SATISFIED | `handleWheel` in `useViewport` implements pointer-anchored zoom, clamped 10%–1000% (MIN_SCALE=0.1, MAX_SCALE=10) |

No orphaned requirements — REQUIREMENTS.md maps PHOTO-01, PHOTO-02, PHOTO-03 to Phase 1 and all three are addressed by plans 01-01 and 01-02. All requirements marked `[x]` as Complete in REQUIREMENTS.md.

---

### Build and Type-Check Results

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Production build | `npm run build` | Exit 0 — 1804 modules, dist/assets generated | PASS |
| TypeScript | `npx tsc --noEmit` | Exit 0 — no type errors | PASS |
| No Tailwind v3 config file | `ls tailwind.config.js` | NOT FOUND | PASS |
| No Tailwind v3 config (TS) | `ls tailwind.config.ts` | NOT FOUND | PASS |
| No boilerplate App.css | `ls src/App.css` | NOT FOUND | PASS |
| Tailwind v4 CSS pattern | `src/index.css` | `@import "tailwindcss"` only, no `@tailwind` directives | PASS |

---

### Anti-Patterns Found

No anti-patterns detected. Scanned all files in `src/` for:
- TODO/FIXME/PLACEHOLDER/XXX/HACK comments — none found
- `return null` placeholders — `PhotoLayer` returns null when image not loaded, which is correct guard logic (not a stub)
- Empty handlers — `onDragMove={() => {}}` in CanvasStage is intentional (event consumed to suppress Konva default), not a stub
- Hardcoded empty state reaching render — none found; all state variables are populated from real sources before being rendered

The `<Layer>{/* Drawing layer — Phase 3 */}</Layer>` in CanvasStage is an intentional placeholder for the next phase, not a broken current-phase feature.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Project builds without errors | `npm run build` | Exit 0, 1804 modules transformed | PASS |
| TypeScript compiles cleanly | `npx tsc --noEmit` | Exit 0, no output | PASS |
| `usePhotoUpload` exports `handlePhotoFile` | `node -e "import('./src/hooks/usePhotoUpload.ts')"` | Skipped — ESM/browser-only module | SKIP |
| Zoom clamp at 10% and 1000% | Static code inspection | `Math.max(0.1, Math.min(10, rawScale))` confirmed | PASS (static) |
| EXIF orientation 6 path | Static code inspection | `swap = orientation === 6` swaps dimensions; `ctx.translate(canvas.width, 0); ctx.rotate(Math.PI/2)` | PASS (static) |

Behavioral spot-checks 3 skipped — source files are ESM/browser-only React modules that cannot be required by Node directly. Build verification substitutes.

---

### Human Verification Required

#### 1. EXIF Orientation Correction (Portrait Phone Photo)

**Test:** Upload a JPEG photo taken in portrait orientation on a smartphone (iOS or Android). These typically have EXIF orientation tag = 6.
**Expected:** Photo displays upright in the canvas, filling the viewport in a contain-fit layout. If orientation correction were absent, the photo would appear rotated 90 degrees clockwise (sideways).
**Why human:** The `correctOrientation` function is code-correct (canvas rotation for each orientation value is verified), but confirming the actual rendered output requires a real JPEG with EXIF metadata in a running browser.

#### 2. Pointer-Anchored Scroll Zoom Feel

**Test:** Upload any photo, then position the cursor over a specific feature (corner, edge) and scroll up to zoom in.
**Expected:** The feature under the cursor stays stationary while the rest of the image zooms around it. Scrolling down zooms out with the same anchor behavior. Zooming at minimum/maximum should stop smoothly with no visual jump.
**Why human:** The math for pointer-anchored zoom is correct (verified by code inspection), but the perceived smoothness, correct anchor behavior, and clamping feel must be confirmed in a real browser with real scroll events.

#### 3. Invalid File Type Drop Error

**Test:** While the empty-state drop zone is visible, drag a non-image file (e.g., a `.txt`, `.pdf`, or `.mp4`) onto the window and drop it.
**Expected:** Error message "Only JPG, PNG, and WebP photos are supported. Try a different file." appears below the drop zone content. No crash.
**Why human:** The validation logic is present and correct, but drag-and-drop with non-image files from the OS involves browser-specific MIME type reporting that must be tested live.

#### 4. Drag-and-Drop Visual Feedback and Photo Load

**Test:** With the empty-state screen visible, drag an image file (JPG or PNG) from the desktop over the window. Hover over the drop zone without dropping.
**Expected:** Drop zone border changes from gray (#3a3a3a dashed) to blue (#3b82f6 solid), and the heading changes from "Upload a photo to start" to "Drop to open". On drop, the photo loads and the canvas view replaces the drop zone.
**Why human:** State transitions (`isDragOver`) and the conditional render switching from DropZoneOverlay to CanvasStage require live browser interaction to confirm the visual feedback and the render transition work correctly.

---

### Gaps Summary

No blocking gaps found. All 10 artifacts are present, substantive, and wired. All 9 key links are verified. All 3 requirements (PHOTO-01, PHOTO-02, PHOTO-03) are satisfied. The build and TypeScript compilation pass cleanly.

Four items are routed to human verification — these are runtime/visual behaviors (EXIF correction output, zoom anchor feel, drag-and-drop interactions) that are code-correct but require a running browser to confirm the user experience matches the spec.

---

_Verified: 2026-03-28_
_Verifier: Claude (gsd-verifier)_
