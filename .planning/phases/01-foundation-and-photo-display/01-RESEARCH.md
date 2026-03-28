# Phase 1: Foundation and Photo Display - Research

**Researched:** 2026-03-28
**Domain:** React + Konva.js canvas app scaffold — photo upload, EXIF-aware display, pan/zoom navigation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**App Layout & Shell**
- Full-viewport canvas with floating toolbar — maximizes tracing area
- Top-left floating overlay toolbar — out of the way, easy to reach
- Initial empty state shows a drop zone with "Upload a photo to start" prompt
- Dark UI (dark gray toolbar/bg) with light canvas — reduces eye strain when tracing over photos

**Canvas & Rendering**
- Use Konva.js + react-konva for canvas rendering — scene graph, hit testing, layer management built in
- Single Konva Stage with Image layer + Drawing layer — Konva handles layering natively
- Use Konva's built-in pixelRatio support for HiDPI/Retina displays
- Zustand for state management — selector subscriptions prevent unnecessary canvas re-renders

**Photo Upload & Navigation**
- Drag-and-drop on canvas + file picker button for upload
- Support JPG, PNG, WebP formats — covers all phone camera outputs
- Initial photo fit: contain (fit entire photo in viewport so user sees the whole panel first)
- Scroll wheel zoom anchored to cursor position, with min/max limits (10%–1000%)

### Claude's Discretion

None specified — specific implementation approaches not prescribed beyond the above.

Research recommends world-coordinate system from day one so all geometry is stored in world units, not pixels.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHOTO-01 | User can upload a photo and display it as the canvas background | File API + URL.createObjectURL, exifr for orientation, use-image hook for Konva display |
| PHOTO-02 | User can pan the canvas by dragging | Konva Stage `draggable` prop + `onDragEnd` position sync to Zustand |
| PHOTO-03 | User can zoom in/out with scroll wheel | Konva Stage `onWheel` handler with pointer-anchored scale math + clamp |
</phase_requirements>

---

## Summary

This phase bootstraps a greenfield Vite + React + TypeScript project and delivers a working canvas where the user can upload a phone photo and navigate it. The stack is fully decided in CONTEXT.md and matches a mature, well-documented combination: Konva.js 10.2.3 with react-konva 19.2.3 for the canvas, Zustand 5 for state, and Tailwind CSS v4 for the thin HTML shell UI.

The two non-trivial technical problems are (1) EXIF orientation correction so portrait phone photos don't appear sideways, and (2) the pointer-anchored zoom math that keeps a point stationary under the cursor during scroll. Both have verified, complete code patterns documented below.

The world-coordinate principle is essential to establish in this phase. All geometric positions stored in state must be in world units (stage-local coordinates, accounting for pan/zoom), not screen pixels. This is the foundation that makes Phase 2 calibration and Phase 3 drawing tools possible without coordinate bugs.

**Primary recommendation:** Scaffold with `npm create vite@latest -- --template react-ts`, add konva + react-konva + use-image + zustand + tailwindcss + @tailwindcss/vite + exifr, implement the EXIF-corrected photo as a `URL.createObjectURL()` fed into `useImage`, and use the Stage `draggable` prop for pan plus an `onWheel` handler for pointer-anchored zoom with clamped scale.

---

## Project Constraints (from CLAUDE.md)

Directives from CLAUDE.md that plans must comply with:

| Directive | Constraint |
|-----------|-----------|
| Client-side only | No backend, no server round-trips for photo loading |
| DXF output must use LINE and ARC entities | Out of scope for Phase 1 but architecture must not block it |
| Use GSD workflow | All file edits go through `/gsd:execute-phase`, not direct edits outside GSD |
| Stack is locked | React 19, TypeScript 6, Vite 8, Konva 10, react-konva 19, Zustand 5, Tailwind 4 |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | Component model | Official react-konva bindings; concurrent rendering reduces canvas jank |
| TypeScript | 6.0.2 | Type safety | Geometric math (coordinate transforms) requires type-checked shapes |
| Vite | 8.0.3 | Build tool | `npm create vite@latest -- --template react-ts` is the canonical scaffold |
| Konva.js | 10.2.3 | Canvas scene graph | Hit testing, layers, drag events, pixelRatio — everything needed |
| react-konva | 19.2.3 | React bindings for Konva | Official; JSX-based canvas element declaration |
| use-image | 1.1.4 | Async image loading for Konva | Official Konva hook; handles loading/loaded/failed lifecycle cleanly |
| Zustand | 5.0.12 | App state | Selector subscriptions prevent canvas re-render on unrelated state |
| Tailwind CSS | 4.2.2 | Shell UI styling (toolbar, overlay) | v4 requires zero config file; `@import "tailwindcss"` only |
| @tailwindcss/vite | 4.2.2 | Vite plugin for Tailwind v4 | Replaces PostCSS config; no `tailwind.config.js` needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| exifr | 7.1.3 | Read EXIF orientation tag | Required: phone JPEGs have orientation metadata; canvas ignores CSS `image-orientation` in some browsers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| exifr | Native CSS `image-orientation: from-image` | CSS fixes `<img>` display but canvas `drawImage()` behavior is inconsistent across browsers — exifr is explicit and reliable |
| exifr | blueimp-load-image | Heavier, older library; exifr is focused and 9kB mini bundle |
| Zustand | React Context | Context re-renders entire tree on any state change; Zustand selectors are surgical |

**Installation:**
```bash
npm create vite@latest . -- --template react-ts
npm install konva react-konva use-image zustand exifr
npm install tailwindcss @tailwindcss/vite
```

**Version verification (confirmed against npm registry on 2026-03-28):**
| Package | Verified Version |
|---------|-----------------|
| konva | 10.2.3 |
| react-konva | 19.2.3 |
| use-image | 1.1.4 |
| zustand | 5.0.12 |
| tailwindcss | 4.2.2 |
| @tailwindcss/vite | 4.2.2 |
| exifr | 7.1.3 |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── AppShell.tsx        # Full-viewport layout, dark bg, positions canvas + toolbar
│   ├── CanvasStage.tsx     # Konva Stage + Layers, handles pan/zoom events
│   ├── PhotoLayer.tsx      # Konva Layer with EXIF-corrected Image node
│   ├── DrawingLayer.tsx    # Konva Layer placeholder for Phase 3 shapes
│   └── Toolbar.tsx         # Floating overlay HTML toolbar (Tailwind-styled)
├── hooks/
│   ├── useViewport.ts      # Pan/zoom state and wheel/drag handlers
│   └── usePhotoUpload.ts   # File input + drag-drop + EXIF correction
├── store/
│   └── useAppStore.ts      # Zustand store: photo URL, viewport transform, tool mode
├── utils/
│   └── coordinates.ts      # screenToWorld / worldToScreen transform helpers
├── types/
│   └── index.ts            # Shared TypeScript interfaces
├── main.tsx
└── index.css               # @import "tailwindcss";
```

### Pattern 1: Pointer-Anchored Zoom (Konva onWheel)

**What:** Scale the Stage around the cursor position so the point under the cursor stays fixed
**When to use:** All scroll-wheel zoom interactions

```typescript
// Source: https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html
const MIN_SCALE = 0.1;  // 10%
const MAX_SCALE = 10;   // 1000%
const ZOOM_FACTOR = 1.12;  // per scroll tick — aggressive enough to feel responsive

function handleWheel(e: KonvaEventObject<WheelEvent>) {
  e.evt.preventDefault();

  const stage = stageRef.current;
  if (!stage) return;

  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  // Point under cursor in world (stage-local) coordinates
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  const direction = e.evt.deltaY > 0 ? -1 : 1;
  const rawScale = direction > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR;
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale));

  stage.scale({ x: newScale, y: newScale });

  // Reposition stage so mousePointTo stays under cursor
  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };
  stage.position(newPos);

  // Sync to Zustand
  setViewport({ scale: newScale, x: newPos.x, y: newPos.y });
}
```

### Pattern 2: Stage Panning via draggable Prop

**What:** Konva's built-in stage drag — set `draggable` on the Stage and sync position to Zustand on drag end
**When to use:** Left-click drag to pan

```typescript
// Source: https://konvajs.org/docs/drag_and_drop/Drag_a_Stage.html
<Stage
  width={stageWidth}
  height={stageHeight}
  draggable
  ref={stageRef}
  onWheel={handleWheel}
  onDragEnd={(e) => {
    setViewport({ x: e.target.x(), y: e.target.y() });
  }}
>
  <PhotoLayer />
  <DrawingLayer />
</Stage>
```

**Caveat:** When `draggable` is combined with the wheel zoom handler, zoom anchoring works correctly only when using the `onWheel` approach above — NOT by also setting scale on the stage via CSS transforms. Stick to the stage `scale()` + `position()` approach.

### Pattern 3: EXIF-Corrected Photo Loading

**What:** Read EXIF orientation from the File object, draw to an off-screen canvas with the correct rotation, then create a corrected `objectURL` to pass to `useImage`
**When to use:** Every time a photo file is uploaded

```typescript
// Source: exifr docs (https://github.com/MikeKovarik/exifr), MDN createObjectURL
import exifr from 'exifr';

async function correctOrientation(file: File): Promise<string> {
  const orientation = await exifr.orientation(file) ?? 1;

  // orientation === 1 means no rotation needed — fast path
  if (orientation === 1) return URL.createObjectURL(file);

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise((res) => { img.onload = res; });

  // Orientation 6 = 90° CW (most common for portrait phones)
  // Orientation 3 = 180°
  // Orientation 8 = 270° CW
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const swap = orientation === 6 || orientation === 8;
  canvas.width  = swap ? img.height : img.width;
  canvas.height = swap ? img.width  : img.height;

  ctx.save();
  if (orientation === 3) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
  } else if (orientation === 6) {
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (orientation === 8) {
    ctx.translate(0, canvas.height);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  return new Promise((resolve) => canvas.toBlob((blob) => {
    resolve(URL.createObjectURL(blob!));
  }, 'image/jpeg', 0.95));
}
```

### Pattern 4: "Contain" Fit on Photo Load

**What:** Calculate initial scale and position so the photo fills the viewport without cropping
**When to use:** Immediately after a photo is loaded, before the user has panned/zoomed

```typescript
// No external source — standard contain math
function calculateContainFit(
  imgW: number, imgH: number,
  viewW: number, viewH: number
) {
  const scale = Math.min(viewW / imgW, viewH / imgH);
  const x = (viewW - imgW * scale) / 2;
  const y = (viewH - imgH * scale) / 2;
  return { scale, x, y };
}

// Apply to stage after photo loads:
const fit = calculateContainFit(img.naturalWidth, img.naturalHeight, stageWidth, stageHeight);
stage.scale({ x: fit.scale, y: fit.scale });
stage.position({ x: fit.x, y: fit.y });
setViewport(fit);
```

### Pattern 5: World Coordinate Helpers

**What:** Functions to convert screen pixels to world coordinates and back, accounting for current pan/zoom
**When to use:** Must be established in Phase 1 — used by every downstream tool interaction

```typescript
// src/utils/coordinates.ts
export interface Viewport {
  scale: number;
  x: number;  // stage offset x (screen pixels)
  y: number;  // stage offset y (screen pixels)
}

// Convert screen pixel position to world (stage-local) units
export function screenToWorld(screen: { x: number; y: number }, v: Viewport) {
  return {
    x: (screen.x - v.x) / v.scale,
    y: (screen.y - v.y) / v.scale,
  };
}

// Convert world units back to screen pixels
export function worldToScreen(world: { x: number; y: number }, v: Viewport) {
  return {
    x: world.x * v.scale + v.x,
    y: world.y * v.scale + v.y,
  };
}
```

### Pattern 6: Zustand Store Shape

**What:** Minimal store for Phase 1 — photo URL and viewport transform

```typescript
// src/store/useAppStore.ts
import { create } from 'zustand';

interface Viewport { scale: number; x: number; y: number; }

interface AppState {
  photoUrl: string | null;
  viewport: Viewport;
  setPhotoUrl: (url: string) => void;
  setViewport: (v: Partial<Viewport>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  photoUrl: null,
  viewport: { scale: 1, x: 0, y: 0 },
  setPhotoUrl: (url) => set({ photoUrl: url }),
  setViewport: (v) => set((s) => ({ viewport: { ...s.viewport, ...v } })),
}));
```

### Pattern 7: File Upload via Drag-and-Drop + Input

**What:** HTML5 drag events on the canvas container div + a hidden `<input type="file">` triggered by a toolbar button
**When to use:** Both entry points must work

```typescript
// Drag-and-drop event prevention (required or browser opens file in tab)
onDragOver={(e: React.DragEvent) => e.preventDefault()}
onDrop={(e: React.DragEvent) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && /image\/(jpeg|png|webp)/.test(file.type)) {
    handlePhotoFile(file);  // runs EXIF correction → setPhotoUrl
  }
}}
```

### Anti-Patterns to Avoid

- **Storing screen coordinates in Zustand:** Drawing segment positions stored in pixels break when the user zooms. Store world coordinates only.
- **Using `stage.toDataURL()` to display images:** Creates a round-trip to bitmap; use `URL.createObjectURL` + `useImage` instead.
- **Not calling `e.evt.preventDefault()` on the wheel handler:** Browser page scroll hijacks the event and the zoom doesn't work.
- **Not calling `e.preventDefault()` on both `dragover` and `drop`:** Browser opens the image in a new tab instead of handing the file to your handler.
- **Setting `pixelRatio` on the Stage manually:** Konva auto-detects `window.devicePixelRatio` — do not override unless you have a specific performance reason.
- **Applying orientation correction via CSS `image-orientation`:** CSS applies to `<img>` elements. Canvas `drawImage()` behavior varies across browsers and doesn't reliably apply CSS properties. Use the explicit canvas-rotation approach above.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async image load lifecycle | Custom Image loading state machine | `use-image` hook | Handles loading/loaded/failed, object URL cleanup, CORS |
| Canvas hit testing | Manual bounding box checks | Konva's built-in pointer event system | Konva handles all hit detection including transparent pixel exclusion |
| HiDPI scaling | Manual devicePixelRatio multiply | Konva's auto pixelRatio | Konva scales canvas buffer automatically — no manual scaling needed |
| EXIF orientation parsing | Byte-level JPEG parsing | `exifr` | EXIF byte format is complex; exifr handles all 8 orientation values including flips |
| State subscription optimization | Manual shouldUpdate logic | Zustand selectors | `useAppStore(s => s.photoUrl)` re-renders only when `photoUrl` changes |

**Key insight:** The pan/zoom coordinate math is genuinely non-trivial — get it wrong and every downstream coordinate (calibration points, drawing endpoints) will be wrong. Use the verified pattern from the Konva docs.

---

## Common Pitfalls

### Pitfall 1: EXIF Orientation Ignored by Canvas

**What goes wrong:** User uploads a portrait iPhone photo (orientation 6 = 90° CW). The photo appears sideways in the canvas even though it looks correct in macOS Finder.
**Why it happens:** `canvas.drawImage()` does not apply CSS `image-orientation`. Chrome 81+ auto-corrects `<img>` elements but canvas context ignores the EXIF tag. Browser behavior also varies (WebKit does auto-rotate, Firefox does not in all code paths).
**How to avoid:** Always read orientation with `exifr.orientation(file)` before creating the display URL. Apply canvas rotation for values 3, 6, and 8. Return early for value 1 (no rotation).
**Warning signs:** Photo looks correct in system file picker preview but sideways or upside-down in the canvas.

### Pitfall 2: Zoom Anchor Drifts to Top-Left

**What goes wrong:** Scroll wheel zooms, but the zoom anchor is the stage origin (top-left) not the cursor position. User zooms into a corner of the photo and the subject flies off screen.
**Why it happens:** `stage.scale()` scales around (0,0) unless position is recalculated. The stage position must be updated after every scale change.
**How to avoid:** Use the `mousePointTo` calculation from Pattern 1 — calculate world position under cursor BEFORE scaling, then reposition the stage AFTER scaling so that world point maps back to the same screen position.
**Warning signs:** Zoom center is always the top-left regardless of where the cursor is.

### Pitfall 3: Pan + Zoom State Out of Sync with Stage

**What goes wrong:** Zustand viewport state (scale, x, y) diverges from what the stage actually shows, causing Phase 3 coordinate conversions to produce wrong positions.
**Why it happens:** Konva's `draggable` prop updates the stage's internal position directly without React re-renders. If you only set `x`/`y` in state on `onDragEnd`, there's a brief period of divergence.
**How to avoid:** For Phase 1 pan/zoom, Zustand sync on `onDragEnd` and `onWheel` is sufficient. In later phases, always derive world coordinates from `stageRef.current.x()` and `stageRef.current.scaleX()` at the moment of pointer events rather than from stale Zustand state.
**Warning signs:** Debug overlay shows viewport coordinates that don't match what is visible on screen.

### Pitfall 4: Stage Size Not Matching Viewport

**What goes wrong:** The Konva Stage is smaller than the browser viewport, leaving a gap where drag events don't register.
**Why it happens:** Stage `width`/`height` props set to `window.innerWidth`/`window.innerHeight` at mount time don't update when the window resizes.
**How to avoid:** Set stage dimensions to the container element's `clientWidth`/`clientHeight` using a `ResizeObserver` on the parent div, and update Zustand or component state accordingly. For Phase 1 a simpler approach works: bind `width={window.innerWidth}` and `height={window.innerHeight}` and add a `resize` event listener that triggers a state update.
**Warning signs:** Clicking near the right or bottom edge of the visible canvas has no effect.

### Pitfall 5: Tailwind v4 Config Confusion

**What goes wrong:** Developer adds a `tailwind.config.js` file and runs `@tailwind base; @tailwind components; @tailwind utilities` in CSS — these are v3 patterns. v4 silently ignores the config file and the CSS directives produce nothing or throw errors.
**Why it happens:** Nearly all Tailwind tutorials pre-date v4.
**How to avoid:** Tailwind v4 uses ONLY `@import "tailwindcss";` in CSS and only the `@tailwindcss/vite` plugin in `vite.config.ts`. No `tailwind.config.js`, no PostCSS config, no `@tailwind` directives.
**Warning signs:** Tailwind classes have no effect, or build fails with "Unknown at rule @tailwind".

### Pitfall 6: TrackPad Pinch Hijacks Scroll Zoom

**What goes wrong:** On a MacBook trackpad, a two-finger pinch fires a wheel event with `ctrlKey: true`. If not handled, it fights with the browser's native page zoom.
**Why it happens:** Browsers map trackpad pinch to wheel events with a `ctrlKey` flag. The Konva zoom-to-pointer example includes a direction flip for this case.
**How to avoid:** In the `onWheel` handler, when `e.evt.ctrlKey` is true, flip the direction: `direction = -direction`. The Konva official example already includes this guard.

---

## Code Examples

Verified patterns from official sources:

### Vite + React + TypeScript + Tailwind v4 Bootstrap

```bash
npm create vite@latest . -- --template react-ts
npm install konva react-konva use-image zustand exifr
npm install tailwindcss @tailwindcss/vite
```

```typescript
// vite.config.ts — Source: https://tailwindcss.com/docs/installation/vite
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* src/index.css — Source: https://tailwindcss.com/docs/installation/vite */
@import "tailwindcss";
```

### useImage with Object URL

```typescript
// Source: https://github.com/konvajs/use-image and https://konvajs.org/docs/react/Images.html
import useImage from 'use-image';
import { Image as KonvaImage } from 'react-konva';

function PhotoNode({ url }: { url: string }) {
  const [image, status] = useImage(url);
  if (status !== 'loaded' || !image) return null;
  return <KonvaImage image={image} x={0} y={0} />;
}
```

### Minimal Konva Stage with Two Layers

```typescript
// Source: https://konvajs.org/docs/react/index.html
import { Stage, Layer } from 'react-konva';

<Stage
  width={stageWidth}
  height={stageHeight}
  ref={stageRef}
  draggable
  onWheel={handleWheel}
  onDragEnd={(e) => setViewport({ x: e.target.x(), y: e.target.y() })}
>
  <Layer>   {/* Photo layer */}
    <PhotoNode url={photoUrl} />
  </Layer>
  <Layer>   {/* Drawing layer — Phase 3 */}
  </Layer>
</Stage>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind `@tailwind base/components/utilities` | `@import "tailwindcss"` + `@tailwindcss/vite` plugin | Tailwind v4, Jan 2025 | No `tailwind.config.js` needed; no PostCSS config |
| `Create React App` scaffold | `npm create vite@latest` | Deprecated since 2023 | CRA is dead — Vite is the standard |
| Manual canvas `devicePixelRatio` scaling | Konva auto `pixelRatio` | Konva 8+ | Zero config HiDPI support |
| `exif-js` for EXIF parsing | `exifr` | ~2021 | `exifr` is 30x faster; mini browser bundle ~9kB |

**Deprecated/outdated:**
- `create-react-app`: Deprecated, not maintained. Do not use.
- `dxf-writer` npm package: Last published 3 years ago, abandoned. (Relevant for Phase 4, not Phase 1.)
- Tailwind v3 config patterns (`tailwind.config.js`, PostCSS, `@tailwind` directives): Replaced by v4's Vite plugin.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build tooling | Yes | 25.8.1 | — |
| npm | Package install | Yes | 11.11.0 | — |
| git | Version control | Yes | 2.50.1 | — |
| Browser (Chrome/Firefox/Safari) | App runtime | Yes (desktop) | — | — |

**No missing dependencies.** The project is greenfield — all dependencies are installed via npm during Wave 0. No external services, databases, or CLI tools beyond Node/npm are required.

---

## Open Questions

1. **`use-image` with blob URL from corrected canvas**
   - What we know: `useImage(url)` accepts any valid string URL. `URL.createObjectURL()` returns a `blob:` URL.
   - What's unclear: The `use-image` README does not explicitly test blob URLs, only HTTP URLs.
   - Recommendation: This should work (blob URLs are valid URLs), but verify by testing a phone JPEG upload in the browser as the first acceptance test. If it fails, create a data URL with `canvas.toDataURL()` as fallback.

2. **Trackpad vs. scroll wheel delta normalization**
   - What we know: MacBook trackpad pinch emits `wheel` events with fractional deltaY values; mechanical scroll wheels emit larger integer deltas.
   - What's unclear: `ZOOM_FACTOR = 1.12` per tick may feel too fast on trackpad (many small ticks) and too slow on scroll wheel (few large ticks).
   - Recommendation: Use `deltaY` magnitude awareness — clamp delta to a max before applying the factor, or use `1 + Math.abs(deltaY) * 0.001` scaling. Tune during acceptance testing.

3. **Stage size on HiDPI when `window.innerWidth` is used**
   - What we know: Konva auto-scales canvas buffer for devicePixelRatio, so a 1440px logical viewport on a 2x display gets a 2880px canvas buffer.
   - What's unclear: Whether setting `width={window.innerWidth}` and `height={window.innerHeight}` causes the stage container div to be the correct CSS size vs. the canvas pixel size.
   - Recommendation: Set both the container div and the Stage to `100vw` / `100vh` via CSS and read the div's `clientWidth`/`clientHeight` for Stage props. This is the safest pattern.

---

## Sources

### Primary (HIGH confidence)
- [Konva zoom-to-pointer official docs](https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html) — zoom algorithm with pointer anchoring
- [Konva drag stage official docs](https://konvajs.org/docs/drag_and_drop/Drag_a_Stage.html) — `draggable` prop panning
- [react-konva Images official docs](https://konvajs.org/docs/react/Images.html) — `useImage` hook pattern
- [use-image GitHub README](https://github.com/konvajs/use-image) — API: returns `[image, status]`, status is `"loading"|"loaded"|"failed"`
- [Tailwind v4 + Vite official docs](https://tailwindcss.com/docs/installation/vite) — `@import "tailwindcss"`, `@tailwindcss/vite` plugin
- npm registry — version verification for all packages (2026-03-28)

### Secondary (MEDIUM confidence)
- [MDN CSS image-orientation](https://developer.mozilla.org/en-US/docs/Web/CSS/image-orientation) — `from-image` default in modern browsers; does not apply to canvas `drawImage()`
- [exifr GitHub](https://github.com/MikeKovarik/exifr) — `exifr.orientation(file)` API; 9kB mini browser bundle; handles all 8 orientation values
- [Konva Scale Image To Fit docs](https://konvajs.org/docs/sandbox/Scale_Image_To_Fit.html) — contain/cover math
- [Konva performance tips](https://konvajs.org/docs/performance/All_Performance_Tips.html) — pixelRatio auto-detection
- [w3c/csswg-drafts issue 4666](https://github.com/w3c/csswg-drafts/issues/4666) — canvas drawImage and image-orientation spec discussion confirming per-browser variance

### Tertiary (LOW confidence)
- WebSearch results on trackpad delta normalization — community advice, not authoritative; flag for tuning during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed against npm registry on research date; all packages actively maintained
- Architecture patterns: HIGH — zoom/pan algorithm sourced directly from Konva official docs
- EXIF correction pattern: HIGH — exifr API confirmed from GitHub README; canvas rotation math is standard
- Tailwind v4 setup: HIGH — verified against official Tailwind docs
- World coordinate system: HIGH — standard math, no library risk
- Pitfalls: MEDIUM — pitfalls 1-4 verified against official docs and spec; pitfalls 5-6 based on community sources (multiple)

**Research date:** 2026-03-28
**Valid until:** 2026-06-28 (Konva/react-konva are stable; Tailwind v4 patterns are new but stabilizing)
