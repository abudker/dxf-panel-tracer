# Phase 3: Drawing Tools - Research

**Researched:** 2026-03-28
**Domain:** Konva/react-konva interactive drawing, geometric algorithms (line/arc), Zustand state FSM, undo/redo
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Line & Arc Drawing UX**
- Line tool: click start point, click end point — line committed on second click
- Arc tool: 3-point interaction — click start, click end, click point-on-arc (most intuitive for tracing existing curves)
- Ghost preview from last click to cursor position while drawing — critical for accuracy
- Toolbar buttons for Line (L), Arc (A), Select (S) with keyboard shortcuts

**Snapping & Segment Management**
- Snap threshold: 10 screen pixels — close enough to feel magnetic, far enough to avoid accidental snaps
- Snap visual feedback: endpoint highlights with a ring when cursor is within snap distance
- Segment selection: click near a segment in Select mode to highlight it in a different color
- Delete: select segment + press Delete/Backspace key (standard keyboard shortcut)

**Undo/Redo Model**
- Undoable actions: add segment and delete segment (the two user-facing drawing actions)
- Mechanism: snapshot-based — store array of segment-list states (simple, reliable)
- Keyboard shortcuts: Ctrl+Z / Cmd+Z for undo, Ctrl+Shift+Z / Cmd+Shift+Z for redo
- Max undo depth: 50 steps

### Claude's Discretion

None explicitly listed — all decisions were locked.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAW-01 | User can draw straight lines by clicking start and end points | Two-click FSM in CanvasStage; Line stored as `{type:'line', start, end}` in Zustand |
| DRAW-02 | User can draw arcs by clicking start point, end point, and a point on the arc | Three-click FSM; circumcircle algorithm derives center/radius/angles |
| DRAW-03 | Endpoints snap to nearby existing endpoints within a threshold | Screen-space proximity check (10px threshold) on each click before commit |
| DRAW-04 | User can select a segment by clicking it | Konva `hitStrokeWidth` property + `onClick` handler on each segment shape |
| DRAW-05 | User can delete a selected segment | `keydown` Delete/Backspace listener in React; calls `deleteSegment(id)` on store |
| DRAW-06 | User can undo the last action | Snapshot array in store; `undo()` pops past stack, pushes to future |
| DRAW-07 | User can redo an undone action | `redo()` pops future stack, pushes to past |
</phase_requirements>

---

## Summary

Phase 3 adds interactive line and arc drawing on top of the existing Konva/Zustand architecture. The core challenge is implementing two separate finite state machines (line tool: 2-click; arc tool: 3-click), both with ghost preview on `mousemove`, endpoint snapping, and a snapshot-based undo/redo stack — all wired into the existing `ToolMode` pattern already in place.

The geometry work is straightforward but precise: lines need no derivation beyond storing two points; arcs require a three-point circumcircle computation to extract center, radius, and angles. A critical pitfall is the **DXF angle convention** — DXF ARC entities always store angles counterclockwise from the +X axis, while the HTML5 Canvas `context.arc()` function defaults clockwise. Internal arc storage must be normalized to the DXF CCW convention to make Phase 4 export correct.

Segment selection uses Konva's built-in `hitStrokeWidth` property to give thin visible lines a wide (20px) invisible hit region. No external geometry library is needed for click-on-segment detection — Konva handles it. Point-to-arc proximity for selection uses a simple distance-from-circumcircle-perimeter formula implemented inline.

**Primary recommendation:** Build a `DrawingLayer` component and a `useDrawing` hook that own all drawing FSM logic, keeping CanvasStage clean. Extend the Zustand store with `segments`, `drawHistory`, `selectedSegmentId`, and drawing transient state. No new dependencies needed.

---

## Project Constraints (from CLAUDE.md)

| Directive | Detail |
|-----------|--------|
| Tech stack | React 19, TypeScript, Vite, Konva/react-konva, Zustand — already installed |
| DXF format | Output must be standard DXF LINE + ARC entities (Phase 4 concern but angles must be stored correctly in Phase 3) |
| Scale accuracy | All geometry stored in world coordinates (pixels); converted to mm at export using `pxPerMm` |
| Pattern: getState() in handlers | Use `useAppStore.getState()` inside Konva event handlers to avoid stale closure captures |
| Pattern: named exports | `export function X` pattern used throughout |
| Pattern: Partial<T> setters | Store setters accept `Partial<T>` for partial updates |
| Tailwind v4 | `@import "tailwindcss"` — no config file, no `@tailwind` directives; inline styles for runtime-computed pixel values |
| Konva layers | Separate `<Layer>` per concern (Photo, Calibration, Drawing) |

---

## Standard Stack

### Core (all already installed)

| Library | Installed Version | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| react-konva | ^19.2.3 | Canvas rendering, event handling | Official React bindings; handles hit testing, event delegation per layer |
| konva | ^10.2.3 | Scene graph, Shape/Line/Circle primitives | `hitStrokeWidth` makes thin-line click detection trivial |
| zustand | ^5.0.12 | Drawing state, FSM transient state, undo history | Already used; getState() pattern solves stale closure problem in event handlers |
| lucide-react | ^1.7.0 | Toolbar icons (Minus for Line, GitCommit/Spline for Arc, MousePointer for Select) | Already used in Toolbar |

### No New Dependencies Required

All required functionality is achievable with existing dependencies. The circumcircle algorithm and point-to-segment distance check are simple math — implementing inline in `src/utils/geometry.ts` is cleaner than adding a library.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline geometry math | `circumcircle` npm package | Package adds a dependency for ~10 lines of math; not worth it |
| Manual snapshot undo | `zundo` middleware | zundo tracks ALL store changes by default; needs careful configuration to track only segment changes; manual snapshot is simpler and more controlled for this use case |
| Konva hitStrokeWidth | Custom hitFunc | hitStrokeWidth is the Konva-recommended approach for lines specifically |

---

## Architecture Patterns

### Recommended File Changes

```
src/
├── types/
│   └── index.ts              # Add: LineSegment, ArcSegment, Segment union, DrawingTransient
├── utils/
│   ├── coordinates.ts        # Existing (no changes needed)
│   └── geometry.ts           # NEW: circumcircle(), pointToSegmentDist(), snapToEndpoint()
├── store/
│   └── useAppStore.ts        # Extend: segments, drawHistory, selectedSegmentId, transient draw state
├── components/
│   ├── CanvasStage.tsx        # Extend: route mouse events to drawing FSM; add mousemove handler
│   ├── DrawingLayer.tsx       # NEW: renders committed segments + ghost preview
│   └── Toolbar.tsx            # Extend: Line, Arc, Select buttons
└── hooks/
    └── useDrawingKeys.ts      # NEW: keyboard shortcuts (L/A/S, Ctrl+Z, Del)
```

### Pattern 1: Type Definitions

**What:** Discriminated union for segments; separate transient state from committed state.
**When to use:** Everywhere segments are read or written.

```typescript
// src/types/index.ts additions

export type ToolMode = 'select' | 'calibrate' | 'line' | 'arc';

export interface LineSegment {
  id: string;
  type: 'line';
  start: Point;  // world coordinates
  end: Point;    // world coordinates
}

export interface ArcSegment {
  id: string;
  type: 'arc';
  center: Point;    // world coordinates
  radius: number;   // world pixels
  startAngle: number;  // radians, CCW from +X (DXF convention)
  endAngle: number;    // radians, CCW from +X (DXF convention)
  // Store the three original clicked points for re-deriving if needed
  p1: Point;  // start endpoint
  p2: Point;  // end endpoint
  p3: Point;  // point-on-arc
}

export type Segment = LineSegment | ArcSegment;

// Transient state during active drawing (not part of undo history)
export interface DrawingState {
  // For line tool: 0 or 1 points clicked so far
  // For arc tool: 0, 1, or 2 points clicked so far
  clickPoints: Point[];
  // Current cursor position in world coords (for ghost preview)
  cursorWorld: Point | null;
}
```

### Pattern 2: Zustand Store Extension

**What:** Add segments, undo history, selection, and drawing transient state to the store.
**When to use:** All drawing-related reads and writes.

```typescript
// Additions to AppState interface in useAppStore.ts

// Committed geometry
segments: Segment[];
selectedSegmentId: string | null;

// Snapshot-based undo/redo
drawHistory: Segment[][];  // past snapshots (index 0 = oldest)
drawFuture: Segment[][];   // future snapshots for redo

// Transient drawing state (not undoable — cleared on tool switch)
drawing: DrawingState;

// Actions
addSegment: (seg: Segment) => void;      // pushes snapshot, clears future
deleteSegment: (id: string) => void;     // pushes snapshot, clears future
selectSegment: (id: string | null) => void;
setDrawingClick: (p: Point) => void;     // accumulate click points in FSM
setCursorWorld: (p: Point | null) => void;
clearDrawing: () => void;                // reset transient state
undoDraw: () => void;
redoDraw: () => void;
```

Key implementation notes for the store:
- `addSegment` and `deleteSegment` both push the current `segments` to `drawHistory` (capped at 50), clear `drawFuture`, then apply the change.
- `undoDraw` moves `segments` → `drawFuture[0]`, pops `drawHistory` → `segments`.
- `redoDraw` moves `segments` → `drawHistory[-1]`, shifts `drawFuture` → `segments`.
- Use `crypto.randomUUID()` or a simple counter for segment IDs.

### Pattern 3: Click FSM in CanvasStage

**What:** Route Stage `onClick` and `onMouseMove` through tool mode to drawing handlers.
**When to use:** Replaces the existing `handleStageClick` which only handles calibrate mode.

```typescript
// In CanvasStage.tsx handleStageClick

const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
  const state = useAppStore.getState();
  const pointer = e.target.getStage()?.getPointerPosition();
  if (!pointer) return;
  const worldPoint = screenToWorld(pointer, state.viewport);

  if (state.toolMode === 'calibrate') {
    state.addCalibrationPoint(worldPoint);
    return;
  }
  if (state.toolMode === 'line' || state.toolMode === 'arc') {
    // Apply snapping before recording the click
    const snapped = snapToEndpoint(worldPoint, state.segments, state.viewport, 10);
    state.setDrawingClick(snapped);
    return;
  }
  // Select mode: segment clicks are handled by segment onClick handlers
};

const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
  const state = useAppStore.getState();
  if (state.toolMode !== 'line' && state.toolMode !== 'arc') return;
  const pointer = e.target.getStage()?.getPointerPosition();
  if (!pointer) return;
  const worldPoint = screenToWorld(pointer, state.viewport);
  state.setCursorWorld(worldPoint);
};
```

The FSM completion logic lives in the store's `setDrawingClick`:
- Line tool: on 2nd click → call `addSegment(LineSegment)`, `clearDrawing()`
- Arc tool: on 3rd click → compute circumcircle, call `addSegment(ArcSegment)`, `clearDrawing()`

### Pattern 4: DrawingLayer Rendering

**What:** Konva Layer that renders committed segments and live ghost preview.
**When to use:** Replaces the `{/* Drawing layer — Phase 3 */}` placeholder in CanvasStage.

```typescript
// src/components/DrawingLayer.tsx (sketch)
import { Layer, Line, Shape, Circle } from 'react-konva';

export function DrawingLayer() {
  const segments = useAppStore(s => s.segments);
  const selectedId = useAppStore(s => s.selectedSegmentId);
  const drawing = useAppStore(s => s.drawing);
  const toolMode = useAppStore(s => s.toolMode);
  const viewport = useAppStore(s => s.viewport);

  return (
    <Layer>
      {/* Committed segments */}
      {segments.map(seg => seg.type === 'line'
        ? <LineShape key={seg.id} seg={seg} selected={seg.id === selectedId} />
        : <ArcShape key={seg.id} seg={seg} selected={seg.id === selectedId} />
      )}
      {/* Ghost preview during active drawing */}
      {toolMode === 'line' && <LineGhost drawing={drawing} />}
      {toolMode === 'arc' && <ArcGhost drawing={drawing} />}
      {/* Snap ring indicator */}
      <SnapIndicator ... />
    </Layer>
  );
}
```

**Line segments** use `<Line>` with `hitStrokeWidth={20}` for wide click target:
```typescript
<Line
  points={[seg.start.x, seg.start.y, seg.end.x, seg.end.y]}
  stroke={selected ? '#f59e0b' : '#22d3ee'}
  strokeWidth={2}
  hitStrokeWidth={20}
  onClick={() => useAppStore.getState().selectSegment(seg.id)}
/>
```

**Arc segments** use `<Shape sceneFunc>` since Konva's built-in `Arc` is a ring/donut shape, not a path arc. Use `context.arc()` directly:
```typescript
<Shape
  sceneFunc={(ctx, shape) => {
    ctx.beginPath();
    // DXF stores CCW; canvas.arc() clockwise by default
    // Pass anticlockwise=false here since we normalized to CCW on store, but
    // canvas Y-axis is flipped: CCW in math = CW in canvas pixels
    // See Pitfall 1 for the full explanation
    ctx.arc(seg.center.x, seg.center.y, seg.radius, seg.startAngle, seg.endAngle, false);
    ctx.fillStrokeShape(shape);
  }}
  stroke={selected ? '#f59e0b' : '#22d3ee'}
  strokeWidth={2}
  hitStrokeWidth={20}
  onClick={() => useAppStore.getState().selectSegment(seg.id)}
/>
```

### Pattern 5: Ghost Preview

**What:** A preview line/arc from last-clicked point to cursor, rendered only during active drawing.
**When to use:** Any time `drawing.clickPoints.length > 0 && drawing.cursorWorld !== null`.

For line: preview from `clickPoints[0]` to `cursorWorld`.
For arc with 1 point: preview line from `clickPoints[0]` to `cursorWorld`.
For arc with 2 points: attempt to draw arc preview if circumcircle is non-degenerate, else show straight line.

### Pattern 6: Snap Logic

**What:** Before recording each click, check if the world-space click is within 10 screen pixels of any existing endpoint.
**When to use:** Inside `snapToEndpoint()` utility.

```typescript
// src/utils/geometry.ts
export function snapToEndpoint(
  worldClick: Point,
  segments: Segment[],
  viewport: Viewport,
  thresholdScreen: number
): Point {
  // Convert threshold from screen pixels to world pixels
  const thresholdWorld = thresholdScreen / viewport.scale;

  const endpoints = getEndpoints(segments); // extract all endpoints
  for (const ep of endpoints) {
    const dx = ep.x - worldClick.x;
    const dy = ep.y - worldClick.y;
    if (Math.sqrt(dx * dx + dy * dy) < thresholdWorld) {
      return ep; // snapped
    }
  }
  return worldClick; // no snap
}
```

The snap ring indicator is a separate `<Circle>` rendered on the `DrawingLayer` when `cursorWorld` is within snap threshold of any endpoint.

### Pattern 7: Circumcircle (Three-Point Arc) Algorithm

**What:** Derive arc center and radius from three clicked points.
**When to use:** When arc tool receives its 3rd click.

```typescript
// src/utils/geometry.ts
export interface CircumcircleResult {
  center: Point;
  radius: number;
  collinear: boolean;
}

export function circumcircle(p1: Point, p2: Point, p3: Point): CircumcircleResult {
  const A = p2.x - p1.x, B = p2.y - p1.y;
  const C = p3.x - p1.x, D = p3.y - p1.y;
  const E = A * (p1.x + p2.x) + B * (p1.y + p2.y);
  const F = C * (p1.x + p3.x) + D * (p1.y + p3.y);
  const G = 2 * (A * (p3.y - p2.y) - B * (p3.x - p2.x));

  if (Math.abs(G) < 1e-6) {
    // Points are collinear — degenerate arc, treat as straight line or reject
    return { center: { x: 0, y: 0 }, radius: 0, collinear: true };
  }

  const cx = (D * E - B * F) / G;
  const cy = (A * F - C * E) / G;
  const dx = cx - p1.x, dy = cy - p1.y;
  const radius = Math.sqrt(dx * dx + dy * dy);

  return { center: { x: cx, y: cy }, radius, collinear: false };
}
```

After computing center, derive angles:
```typescript
const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
const endAngle   = Math.atan2(p2.y - center.y, p2.x - center.x);
// p3 (point-on-arc) determines which arc direction — see Pitfall 2
```

### Anti-Patterns to Avoid

- **Using Konva's built-in `<Arc>` component for path arcs:** Konva's `Arc` renders a ring/donut sector with `innerRadius`/`outerRadius`/`angle`. It is NOT a path arc. Use `<Shape sceneFunc>` with `context.arc()` for curve segments.
- **Storing angles in DXF CCW convention but drawing CCW in canvas:** Canvas Y-axis is inverted relative to math Y-axis. CCW in math space is CW in canvas pixel space. See Pitfall 1.
- **Running FSM completion logic inside the React render cycle:** All FSM state changes go through Zustand actions, never computed during render.
- **Attaching keydown listeners to the canvas element:** Konva canvas doesn't receive keyboard focus. Attach `keydown` listeners to `window` (in a `useDrawingKeys` hook with proper cleanup).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wide click area on thin lines | Manual pixel-distance check to segment | `hitStrokeWidth={20}` on `<Line>` | Konva's built-in hit detection handles scale-aware hit testing automatically |
| Canvas hit testing | Own pixel-buffer hit map | Konva's built-in hit canvas | Konva maintains a separate hit canvas; click events fire correctly per shape |
| Arc rendering | Custom canvas path loop | `context.arc()` in `<Shape sceneFunc>` | One-line call; handles clipping, stroke, fill |
| Keyboard shortcut registration | Global document listener inline in component | Dedicated `useDrawingKeys` hook | Proper cleanup on unmount; single place for all keyboard handling |

**Key insight:** Konva already abstracts the hard parts of canvas hit detection (per-shape event delegation, hit region scaling). The only custom geometry needed is the circumcircle algorithm and the endpoint snap check — both are under 30 lines of math.

---

## Common Pitfalls

### Pitfall 1: Canvas Y-Axis Inversion vs. DXF Angle Convention

**What goes wrong:** DXF ARC angles are measured counterclockwise from +X axis in standard math coordinates (Y-up). HTML5 Canvas (and Konva) use a Y-down pixel coordinate system. When you compute `Math.atan2(dy, dx)` in canvas coordinates and store that angle as a DXF startAngle, the arc will render correctly in the canvas but export incorrectly to DXF — the arc will appear mirrored vertically in CNC software.

**Why it happens:** In canvas coords, Y increases downward. `Math.atan2` returns angles measured clockwise from +X. In DXF, angles are counterclockwise from +X (Y-up). A 45° canvas angle is a -45° (or 315°) DXF angle.

**How to avoid:** Negate the Y component when computing DXF angles:
```typescript
// For DXF export (Phase 4), convert canvas angle to DXF angle:
const dxfAngleDeg = (-canvasAngleRad * 180 / Math.PI + 360) % 360;
```
Internally (for canvas rendering), store angles as canvas-convention (`Math.atan2(dy, dx)` with canvas coords). Document the convention clearly in the type definition. Do the DXF conversion at export time in Phase 4, not at store time.

**Warning signs:** Arc looks correct in the canvas but appears upside-down or mirrored in Carbide Create.

### Pitfall 2: Arc Direction Ambiguity (Short vs. Long Arc)

**What goes wrong:** Given three points on a circle, there are two arcs connecting p1 to p2 — the one that passes through p3 (the intended arc) and the one that doesn't. A naive `context.arc(cx, cy, r, startAngle, endAngle, false)` may draw the wrong arc (the reflex arc).

**Why it happens:** `context.arc()` always draws from `startAngle` to `endAngle` in the specified direction. Whether the arc through p3 goes clockwise or counterclockwise depends on the geometry.

**How to avoid:** After computing startAngle and endAngle from p1 and p2, determine which direction (CW or CCW) passes through p3:
```typescript
// Check if p3 lies on the arc drawn CCW from startAngle to endAngle
function isOnArc(center: Point, r: number, startAngle: number, endAngle: number,
                 p3: Point, ccw: boolean): boolean {
  const a3 = Math.atan2(p3.y - center.y, p3.x - center.x);
  // normalise and check if a3 falls between startAngle and endAngle in the given direction
  ...
}
const useCCW = isOnArc(center, radius, startAngle, endAngle, p3, true);
// Store `anticlockwise` flag alongside the segment
```
Store the `anticlockwise: boolean` on the `ArcSegment` type so `DrawingLayer` can pass it to `context.arc()`.

**Warning signs:** Arc draws the "wrong side" of the circle — user picks a gentle curve but gets a sweeping reflex arc.

### Pitfall 3: Stale Closures in Konva Event Handlers

**What goes wrong:** A `useCallback` or `useEffect` handler captures `segments` or `drawing` from the React render closure. By the time the user clicks, the captured state is stale.

**Why it happens:** Konva event handlers are registered once and not re-registered on every render.

**How to avoid:** Already established in this project — always use `useAppStore.getState()` inside Konva event handlers. Do not read state from props or hook subscriptions inside handlers.

**Warning signs:** Undo removes the wrong segment; snap check sees empty segment list even though segments exist.

### Pitfall 4: Snap Threshold Scaling

**What goes wrong:** The snap threshold is defined in screen pixels (10px) but endpoint positions are stored in world coordinates. A direct comparison of world-space distances against 10 fails at high zoom (snaps too eagerly) or low zoom (never snaps).

**Why it happens:** Forgetting to convert the threshold from screen pixels to world pixels using `viewport.scale`.

**How to avoid:** Convert threshold before comparison:
```typescript
const thresholdWorld = thresholdScreen / viewport.scale;
```

**Warning signs:** Snap stops working or becomes too aggressive when zoomed in/out.

### Pitfall 5: Konva Arc Component vs. Custom Shape

**What goes wrong:** Using `<Arc>` from react-konva expecting it to render a curved line between two endpoints. Instead it renders a filled/stroked ring sector.

**Why it happens:** Konva's `Arc` is designed for pie charts and progress rings, not geometric arcs. The API is `innerRadius`, `outerRadius`, `angle` (sweep) — not `startAngle`/`endAngle`/`center`/`radius` for a path arc.

**How to avoid:** Use `<Shape sceneFunc={(ctx, shape) => { ctx.arc(...); ctx.fillStrokeShape(shape); }}>` for all arc segments.

### Pitfall 6: Keyboard Events Require Window Listener, Not Canvas Focus

**What goes wrong:** Adding `onKeyDown` to the Konva `<Stage>` or the container `<div>` without `tabIndex`. The element never receives keyboard focus so shortcuts never fire.

**Why it happens:** HTML elements don't receive keyboard events unless they have focus (and `<div>`s aren't naturally focusable).

**How to avoid:** Register `keydown` on `window` in a `useDrawingKeys` hook:
```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => { ... };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []); // empty deps — read state via getState() inside handler
```

---

## Code Examples

Verified patterns from official Konva sources and the existing codebase.

### Line Segment with Wide Hit Area

```typescript
// Source: https://konvajs.org/docs/events/Custom_Hit_Region.html
<Line
  points={[start.x, start.y, end.x, end.y]}
  stroke="#22d3ee"
  strokeWidth={2}
  hitStrokeWidth={20}
  onClick={() => useAppStore.getState().selectSegment(seg.id)}
/>
```

### Arc Segment via Custom Shape sceneFunc

```typescript
// Source: https://konvajs.org/docs/react/Custom_Shape.html + MDN context.arc()
<Shape
  sceneFunc={(ctx, shape) => {
    ctx.beginPath();
    ctx.arc(
      seg.center.x,
      seg.center.y,
      seg.radius,
      seg.startAngle,
      seg.endAngle,
      seg.anticlockwise   // determines short vs long arc direction
    );
    ctx.fillStrokeShape(shape);
  }}
  stroke="#22d3ee"
  strokeWidth={2}
  hitStrokeWidth={20}
  fill="transparent"
  onClick={() => useAppStore.getState().selectSegment(seg.id)}
/>
```

### Ghost Preview Line

```typescript
// Pattern: render only when drawing is active and cursor is known
{toolMode === 'line' && drawing.clickPoints.length === 1 && drawing.cursorWorld && (
  <Line
    points={[
      drawing.clickPoints[0].x, drawing.clickPoints[0].y,
      drawing.cursorWorld.x,    drawing.cursorWorld.y,
    ]}
    stroke="#22d3ee"
    strokeWidth={1.5}
    dash={[6, 4]}
    listening={false}   // ghost must not intercept clicks
  />
)}
```

### Snap Ring Indicator

```typescript
// Render a ring highlight when cursor is near an endpoint
{snapTarget && (
  <Circle
    x={snapTarget.x}
    y={snapTarget.y}
    radius={8}
    stroke="#f59e0b"
    strokeWidth={2}
    fill="transparent"
    listening={false}
  />
)}
```

### Keyboard Shortcuts Hook Skeleton

```typescript
// src/hooks/useDrawingKeys.ts
export function useDrawingKeys() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const state = useAppStore.getState();

      // Undo
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        state.undoDraw();
        return;
      }
      // Redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        state.redoDraw();
        return;
      }
      // Delete selected segment
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedSegmentId) {
        e.preventDefault();
        state.deleteSegment(state.selectedSegmentId);
        return;
      }
      // Tool shortcuts
      if (e.key === 'l' || e.key === 'L') state.setToolMode('line');
      if (e.key === 'a' || e.key === 'A') state.setToolMode('arc');
      if (e.key === 's' || e.key === 'S') state.setToolMode('select');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

### Snapshot Undo/Redo in Zustand

```typescript
// Pattern: push before mutation, cap at 50, clear future on new action
addSegment: (seg) => {
  const { segments, drawHistory } = get();
  const newHistory = [...drawHistory, segments].slice(-50);
  set({
    segments: [...segments, seg],
    drawHistory: newHistory,
    drawFuture: [],    // new action clears the redo stack
    drawing: { clickPoints: [], cursorWorld: null },
  });
},

undoDraw: () => {
  const { segments, drawHistory, drawFuture } = get();
  if (drawHistory.length === 0) return;
  const previous = drawHistory[drawHistory.length - 1];
  set({
    segments: previous,
    drawHistory: drawHistory.slice(0, -1),
    drawFuture: [segments, ...drawFuture],
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
  });
},
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Konva.Arc for arcs | `<Shape sceneFunc>` with `context.arc()` | Arc is a ring/donut; sceneFunc gives full canvas API access |
| hitFunc custom shapes | `hitStrokeWidth` for lines | Simpler, Konva-idiomatic, no custom canvas code |
| Redux for canvas state | Zustand with `getState()` | No stale closure problem; direct access in event handlers |
| Command pattern undo | Snapshot array undo | Simpler for limited action types; no inverse-operation logic |

---

## Open Questions

1. **Arc direction determination algorithm**
   - What we know: After computing circumcircle, we have `startAngle` and `endAngle`. We need to determine if the arc through `p3` goes clockwise or counterclockwise.
   - What's unclear: The exact angle-range membership check for the CCW/CW case — angle normalization can be fiddly.
   - Recommendation: Implement as a helper `arcDirectionFromThreePoints(p1, p2, p3, center)` that returns `anticlockwise: boolean`. Use cross-product sign of vectors (center→p1) × (center→p3) to determine which half-plane p3 is in relative to the chord p1→p2.

2. **Collinear arc handling**
   - What we know: If the three arc points are collinear, `G ≈ 0` in the circumcircle formula, and no valid circle exists.
   - What's unclear: Should we silently convert to a line segment, show an error toast, or reject the third click?
   - Recommendation: Show a brief toast ("Points are collinear — place the arc point off the line") and reset the arc click state to 0 without committing anything.

3. **`setToolMode` guard and drawing tool modes**
   - What we know: The existing guard is `mode !== 'select' && mode !== 'calibrate'` — future drawing tools require calibration.
   - What's confirmed: `'line'` and `'arc'` will be blocked by this guard when uncalibrated. The guard does not need changes.
   - No action needed — confirmed by reading `useAppStore.ts`.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is purely code additions with no new external tools, services, or runtimes beyond the project's already-installed npm packages.

---

## Sources

### Primary (HIGH confidence)

- Konva docs — `hitStrokeWidth` for line hit detection: https://konvajs.org/docs/events/Custom_Hit_Region.html
- Konva docs — `<Shape sceneFunc>` for custom paths: https://konvajs.org/docs/react/Custom_Shape.html
- MDN — `CanvasRenderingContext2D.arc()` angle convention: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc
- AutoCAD DXF ARC entity — CCW angle convention: https://help.autodesk.com/view/ACD/2022/ENU/?guid=GUID-0B14D8F1-0EBA-44BF-9108-57D8CE614BC8
- Circumcircle algorithm: https://gist.github.com/mutoo/5617691
- Existing codebase — `useAppStore.ts`, `CanvasStage.tsx`, `coordinates.ts`, `types/index.ts` (read directly)

### Secondary (MEDIUM confidence)

- Konva Free Drawing pattern (mousemove + getPointerPosition): https://konvajs.org/docs/react/Free_Drawing.html
- ezdxf ARC docs — CCW convention confirmed: https://ezdxf.readthedocs.io/en/stable/dxfentities/arc.html
- Autodesk Community — arc clockwise/CCW in DXF: https://forums.autodesk.com/t5/autocad-forum/how-to-find-whether-an-arc-is-clockwise-or-counter-clockwise-in/td-p/7657875

### Tertiary (LOW confidence)

None — all key claims were verified against primary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and confirmed in package.json; no new dependencies
- Architecture: HIGH — patterns derived directly from existing codebase files and official Konva docs
- Pitfalls: HIGH — canvas Y-axis inversion and DXF CCW convention verified against MDN and AutoCAD docs; Konva Arc misuse verified against Konva API docs
- Circumcircle algorithm: HIGH — classical geometry, verified against published implementation

**Research date:** 2026-03-28
**Valid until:** 2026-05-28 (stable libraries, established geometry — no fast-moving dependencies)
