# Architecture Patterns

**Domain:** Browser-based photo-tracing / technical drawing tool with DXF export
**Project:** DXF Panel Tracer
**Researched:** 2026-03-28
**Overall confidence:** HIGH (core patterns) / MEDIUM (library-specific details)

---

## Recommended Architecture

A single-page, fully client-side app with no backend. All state lives in the browser tab.
Five distinct concerns map to five distinct modules that compose around a shared document model.

```
┌─────────────────────────────────────────────────────────┐
│                        UI Shell                         │
│  (toolbar, mode indicator, scale dialog, export button) │
└──────────────────┬──────────────────────────────────────┘
                   │ user actions / mode changes
                   ▼
┌─────────────────────────────────────────────────────────┐
│                    Tool Controller                      │
│  (active tool FSM: select | line | arc | calibrate)    │
│  (converts raw mouse events → document operations)     │
└───────────┬──────────────────────────┬──────────────────┘
            │ read/write               │ read
            ▼                          ▼
┌────────────────────┐      ┌──────────────────────────────┐
│   Document Model   │      │       Viewport State         │
│  (geometry store)  │      │  (scale, offsetX, offsetY)   │
│  lines[], arcs[]   │      │  (screen ↔ world transforms) │
│  calibration{}     │      └──────────────────────────────┘
│  undo/redo stacks  │                │
└────────────────────┘                │ applies transform
            │                         ▼
            │ geometry data  ┌────────────────────┐
            └───────────────►│   Render Engine    │
                             │  (canvas 2d layer  │
                             │   bg image layer)  │
                             └────────────────────┘
                                       │
                             ┌─────────▼──────────┐
                             │   DXF Exporter     │
                             │  (world-coords →   │
                             │   DXF LINE/ARC)    │
                             └────────────────────┘
```

---

## Component Boundaries

### 1. Document Model

The single source of truth. Holds geometry and calibration. Never touches the canvas directly.

| Stores | Type | Notes |
|--------|------|-------|
| `segments` | `Array<Line \| Arc>` | World-coordinate geometry; origin is arbitrary (e.g. first point placed) |
| `calibration` | `{ p1: Point, p2: Point, realDistance: number } \| null` | Two pixel-space points + known real-world distance |
| `undoStack` | `Array<DocumentSnapshot \| Command>` | Supports undo |
| `redoStack` | `Array<DocumentSnapshot \| Command>` | Supports redo |

**Line record:** `{ type: 'line', x1, y1, x2, y2 }` — world coordinates (mm or inches)

**Arc record:** `{ type: 'arc', cx, cy, radius, startAngle, endAngle }` — center + radius in world coordinates, angles in radians, consistent with DXF ARC entity format

**Key constraint:** Geometry is stored in world coordinates (real-world units after calibration). The pixel-space photo is never baked into the geometry. This means the DXF exporter reads the model directly with no additional transformation.

**Communicates with:** Tool Controller (writes), Render Engine (reads), DXF Exporter (reads), Undo/Redo (snapshots this state).

---

### 2. Viewport State

Manages the mapping between screen pixels and world/canvas space. This is a pure math module — no rendering, no DOM access.

**State:** `{ scale: number, offsetX: number, offsetY: number }`

**Key transforms (must be available everywhere):**

```
// Screen → World (for placing drawn points from mouse events)
worldX = (screenX - offsetX) / scale
worldY = (screenY - offsetY) / scale

// World → Screen (for rendering geometry on canvas)
screenX = worldX * scale + offsetX
screenY = worldY * scale + offsetY
```

**Pan:** Updates `offsetX += deltaX`, `offsetY += deltaY` on pointer drag (no active tool).

**Zoom toward cursor:**
```
newScale = oldScale * zoomFactor
offsetX = cursorX - (cursorX - offsetX) * (newScale / oldScale)
offsetY = cursorY - (cursorY - offsetY) * (newScale / oldScale)
```

**Communicates with:** Render Engine (applies transform before every draw), Tool Controller (converts mouse events to world coords before writing to document).

---

### 3. Tool Controller (Finite State Machine)

Translates raw mouse/pointer events into document mutations. The FSM is the only component that writes to the Document Model during user interaction.

**Tool modes (states):**

| Mode | Description | Input Events Consumed |
|------|-------------|----------------------|
| `select` / `pan` | Default; drag = pan viewport | pointermove, wheel |
| `calibrate` | User clicks two reference points, then enters real distance | click (2x), dialog submit |
| `line` | Click start → click end = add one Line to document | click, pointermove (preview) |
| `arc` | Three-click interaction: start point, end point, arc midpoint (or bulge drag) | click (3x), pointermove |

**FSM transitions within a tool** (example: `line` tool):

```
IDLE → [click] → AWAITING_SECOND_POINT(p1)
AWAITING_SECOND_POINT → [pointermove] → (update preview ghost)
AWAITING_SECOND_POINT → [click] → IDLE (commit Line{p1, p2} to document)
AWAITING_SECOND_POINT → [Escape] → IDLE (cancel)
```

**Snap logic lives here.** Before committing a point, the Tool Controller checks nearby existing endpoints in world coordinates. If within snap threshold (e.g., 5 screen pixels converted to world units), it snaps to that point. This is critical for closing shapes without gaps.

**Preview ghost:** During in-progress operations (e.g., while placing second point of a line), the Tool Controller holds a "ghost" — the pending segment — that the Render Engine draws in a distinct style. The ghost is NOT written to the Document Model until the user commits.

**Communicates with:** Document Model (writes completed segments), Viewport State (reads, to convert screen → world), UI Shell (reads active tool mode), Render Engine (provides ghost for preview layer).

---

### 4. Render Engine

Redraws the canvas on every state change. Two canvas elements stacked in z-order via CSS `position: absolute`.

**Canvas stack (bottom to top):**

| Layer | Canvas | Content | Invalidation |
|-------|--------|---------|--------------|
| Background | `<canvas id="bg">` | Photo image | Only on image load or viewport change |
| Drawing | `<canvas id="draw">` | Committed geometry + ghost preview + snap indicators | Every mouse move while tool is active |

**Render loop (drawing canvas):**

```
function render() {
  ctx.clearRect(0, 0, w, h)
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY)
  // draw committed segments from Document Model
  for each segment in document.segments: drawSegment(ctx, segment)
  // draw ghost from Tool Controller if pending
  if (toolController.ghost): drawGhost(ctx, toolController.ghost)
  // draw calibration points if set
  // draw snap indicator dot if active
  ctx.resetTransform()
}
```

**Background canvas render (separate function, called only on viewport change or image load):**

```
function renderBackground() {
  bgCtx.clearRect(0, 0, w, h)
  bgCtx.setTransform(scale, 0, 0, scale, offsetX, offsetY)
  bgCtx.drawImage(photo, 0, 0, photoWidthInWorld, photoHeightInWorld)
  bgCtx.resetTransform()
}
```

**Important:** Both canvases always apply the same viewport transform. The photo is positioned in world coordinates (e.g., its top-left is world origin (0,0)), so the photo and geometry stay aligned under all pan/zoom states.

**Communicates with:** Document Model (reads segments), Viewport State (reads transform), Tool Controller (reads ghost preview).

---

### 5. DXF Exporter

A pure function. Takes the Document Model's geometry array plus calibration (for the scale factor already baked into world coordinates) and produces a DXF string.

**Inputs:** `segments: Array<Line | Arc>` (already in real-world units), `units: 'mm' | 'inches'`

**Outputs:** DXF file string → `Blob` → `URL.createObjectURL` → programmatic anchor click → file download

**DXF mapping:**

| Document Model | DXF Entity | Key fields |
|---------------|-----------|-----------|
| `Line` | `LINE` | `start` (x1,y1,0), `end` (x2,y2,0) |
| `Arc` | `ARC` | `center` (cx,cy,0), `radius`, `start_angle` (deg), `end_angle` (deg) |

**Angle convention:** Canvas arcs use radians measured from 3 o'clock, counterclockwise positive. DXF ARC uses degrees measured from 3 o'clock (positive X axis), counterclockwise positive. Conversion: `dxfDeg = radians * (180 / Math.PI)`.

**Recommended library:** `dxf-writer` (npm) for simplicity; it supports LINE and ARC entities and runs in the browser. Fallback: write raw DXF text (the DXF format for LINE and ARC is simple enough to template by hand without a library — each entity is ~10 lines of group-code text).

**Communicates with:** Document Model (reads only, no writes).

---

### 6. UI Shell

React (or vanilla JS) components for controls. Thin layer — holds no geometry state.

| Component | Responsibility |
|-----------|---------------|
| Toolbar | Emits tool-change events; reflects active mode visually |
| Scale Dialog | Modal that collects real-world distance after user picks two reference points |
| Export Button | Triggers DXF Exporter |
| Zoom Controls | +/- buttons that delegate to Viewport State; scroll wheel handled on canvas |
| Status Bar | Displays current world cursor position, scale factor, segment count |

**Communicates with:** Tool Controller (activates modes), Viewport State (zoom buttons), DXF Exporter (export trigger), Document Model (reads read-only display info).

---

## Data Flow

### Photo Upload Flow

```
[File input] → FileReader.readAsDataURL → Image element → stored as `photoElement`
→ Render Engine.renderBackground() triggered
→ World coordinate system established: photo top-left = (0, 0) world origin
→ photo dimensions stored in world units (initially pixels; scaled later by calibration)
```

### Calibration Flow

```
[User activates calibrate tool]
→ Tool Controller FSM: click p1 → click p2 (both in screen space)
→ Tool Controller converts p1, p2 to world space (pixel coords, scale=1 initially)
→ Scale Dialog opens: user enters realDistance (e.g., 300mm)
→ Calibration stored: { p1_world, p2_world, realDistance }
→ Scale factor computed: pixelsPerMM = euclidean(p1, p2) / realDistance
→ Document Model: all existing segment world coords rescaled by factor
→ Subsequent Tool Controller placements convert screen → world accounting for pixelsPerMM
```

**Important:** After calibration, "world units" = real-world units (mm or inches). Before calibration, world units = screen pixels. This means calibration can happen at any point in the workflow, including after placing some segments. When calibration changes, all stored geometry must be rescaled.

### Drawing Flow

```
[User clicks while in line/arc tool]
→ Tool Controller: screenPoint → worldPoint (via Viewport State.screenToWorld)
→ Snap check: find nearest existing endpoint within threshold
→ If committing: Document Model.addSegment(segment) + push to undoStack
→ Render Engine notified → requestAnimationFrame → canvas redrawn
```

### Export Flow

```
[User clicks Export DXF]
→ DXF Exporter reads Document Model.segments (world coords = real-world units)
→ Builds DXF string (LINE and ARC entities)
→ Creates Blob with MIME 'application/dxf'
→ Programmatic download via URL.createObjectURL + anchor.click()
→ No server involved
```

---

## Suggested Build Order (Dependencies)

Build from the inside out: data before rendering before interaction before UI chrome.

### Stage 1: Coordinate Foundation
**Build:** Viewport State (transform math) + coordinate conversion functions

**Why first:** Every other component depends on screen ↔ world conversion. This is pure math with no DOM dependencies — easiest to unit test in isolation.

**Deliverable:** `viewport.js` with `screenToWorld`, `worldToScreen`, `applyPanDelta`, `applyZoom` — all pure functions, 100% unit testable.

---

### Stage 2: Document Model
**Build:** Geometry data structures + calibration record + undo/redo stack

**Why second:** Render Engine and Tool Controller both read/write this. Get the shape right before anything renders or interacts.

**Deliverable:** `document.js` with `addSegment`, `removeSegment`, `setCalibration`, `undo`, `redo` — pure data operations, no rendering.

---

### Stage 3: Render Engine (static)
**Build:** Two-canvas setup + background photo rendering + committed geometry rendering (no interactivity yet)

**Why third:** Validates that the coordinate system works end-to-end before tool logic complicates things. Pan/zoom can be wired here using scroll/drag on the canvas.

**Deliverable:** Working canvas that shows an uploaded photo, can pan/zoom, and renders a hardcoded test segment.

---

### Stage 4: Tool Controller (line tool first)
**Build:** FSM for line tool + ghost preview + snap-to-endpoint

**Why fourth:** The line tool is simpler than arc (two clicks vs three clicks + geometry). Getting one tool fully working validates the entire Tool Controller → Document Model → Render Engine pipeline.

**Deliverable:** User can draw connected line segments over the photo. Snap works. Undo works.

---

### Stage 5: Arc Tool
**Build:** Three-click arc FSM + three-point-to-center-radius math

**Why fifth:** Arc tool depends on the same pipeline as line but adds geometric complexity (computing center/radius/angles from three points). Do after line tool is proven.

**Three-point arc algorithm:**
```
Given points P1, P2, P3 on the arc:
1. Compute circumcircle center via perpendicular bisectors of P1P2 and P2P3
2. radius = distance(center, P1)
3. startAngle = atan2(P1.y - cy, P1.x - cx)
4. endAngle   = atan2(P3.y - cy, P3.x - cx)
5. Determine arc direction (CW vs CCW) by checking which side P2 falls on
```

**Deliverable:** User can draw arcs over the photo. Arcs connect to lines at endpoints.

---

### Stage 6: Calibration Tool
**Build:** Two-click reference point picker + distance dialog + rescale logic

**Why sixth:** The coordinate math is already validated by Stage 1-5. Calibration just adds a scale factor to the world coordinate system and must rescale any already-placed geometry.

**Deliverable:** User can set scale reference; all geometry and DXF export reflect real-world dimensions.

---

### Stage 7: DXF Exporter
**Build:** Document Model → DXF string + file download

**Why seventh:** The exporter is a pure read from the model. By Stage 6, the model contains fully calibrated real-world coordinates. The exporter has no dependencies on rendering or tooling.

**Deliverable:** Export button produces a valid `.dxf` file with LINE and ARC entities that opens correctly in CNC software.

---

### Stage 8: UI Shell Polish
**Build:** Toolbar, status bar, keyboard shortcuts, error states (no calibration warning, open shape warning)

**Why last:** Non-blocking for the core workflow. The app is functionally complete after Stage 7.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Geometry in Screen Coordinates

**What:** Saving line endpoints or arc centers as pixel positions on the canvas.

**Why bad:** Pan/zoom invalidates all stored geometry. Calibration changes require recalculating every stored point. DXF export must reverse-transform every point.

**Instead:** Always convert to world coordinates at the point of storage (in the Tool Controller, before writing to the Document Model).

---

### Anti-Pattern 2: Single Canvas for Background + Drawing

**What:** Drawing the photo and the geometry on the same canvas context.

**Why bad:** Every mouse-move while drawing requires clearing and redrawing the full-resolution photo, which is expensive and causes flicker. Changing only drawn geometry is impossible without re-rendering the photo.

**Instead:** Two stacked `<canvas>` elements with `position: absolute`. The background canvas redraws only on image load or viewport change. The drawing canvas redraws freely on every interaction frame.

---

### Anti-Pattern 3: Mutating World Coords on Every Pan/Zoom

**What:** When the user pans or zooms, transforming all stored geometry coordinates to match the new view.

**Why bad:** Floating point error accumulates across many pan/zoom operations. This is unnecessary work — geometry doesn't change when the view changes.

**Instead:** Apply the viewport transform only in the Render Engine's `setTransform()` call. Geometry coordinates never change during pan/zoom.

---

### Anti-Pattern 4: Calibration as a Post-Process Unit Conversion

**What:** Storing geometry in pixels, then multiplying by a scale factor only at DXF export time.

**Why bad:** The Document Model then contains mixed-unit data. Preview rendering that shows dimensions or distances will show wrong numbers. Calibration changes require no migration of stored data — it's implicit and fragile.

**Instead:** On calibration commit, rescale all existing world-coordinate geometry immediately. After that point, world units = real units everywhere, including in the Document Model. The DXF exporter reads world coords and maps them 1:1 to DXF coordinates.

---

### Anti-Pattern 5: Tool State in Component State (if using React)

**What:** Storing the tool FSM's in-progress state (e.g., "waiting for second arc point") in React component `useState`.

**Why bad:** React re-renders are asynchronous and batched. Mouse event handlers need synchronous access to the current tool state. Stale closure bugs are nearly guaranteed.

**Instead:** Keep the Tool Controller FSM in a plain JavaScript class or module-level mutable object. React components read from it only for display purposes (active mode, status text). Use `useRef` if the controller needs to live inside a React component tree.

---

## Scalability Notes

This is a single-user local tool. No scalability concerns. The only performance bottleneck is rendering speed on large photos.

| Concern | Approach |
|---------|----------|
| Large photo (12 MP phone photo) | Downscale to display resolution on load (e.g., max 2000px longest edge). Store original only for display, not for geometry. |
| Many segments (>200 lines) | Unlikely for this use case; if needed, use `requestAnimationFrame` batching on the draw canvas. |
| Undo history depth | Cap at 50 operations. For this scale of app, full document snapshots per operation are fine (geometry records are tiny). |

---

## Sources

- [Canvas Panning and Zooming — Harrison Milbradt](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming) — coordinate transform math
- [Infinite HTML Canvas with Zoom and Pan — Sandro Maglione](https://www.sandromaglione.com/articles/infinite-canvas-html-with-zoom-and-pan) — scale/offset model
- [Two-canvas drawing architecture — Stack Overflow community pattern](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming) — background + foreground canvas separation
- [Konvajs Undo/Redo with React](https://konvajs.org/docs/react/Undo-Redo.html) — undo/redo stack architecture
- [Konvajs vs Fabricjs comparison — DEV Community](https://dev.to/lico/react-comparison-of-js-canvas-libraries-konvajs-vs-fabricjs-1dan)
- [Fabric.js transformation matrix docs](https://fabricjs.com/docs/transformations/) — coordinate space hierarchy
- [dxf-writer npm](https://www.npmjs.com/package/dxf-writer) — LINE and ARC DXF output
- [dxf-doc GitHub (YMSpektor)](https://github.com/YMSpektor/dxf-doc) — alternative DXF library with Arc support
- [MDN Canvas Arc method](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc) — arc angle conventions
- [Drawing interactive graphs with canvas — nyxtom on DEV](https://dev.to/nyxtom/drawing-interactive-graphs-with-canvas-and-javascript-o1j) — event handling and render loop patterns
