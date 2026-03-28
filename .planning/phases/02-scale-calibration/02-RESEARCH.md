# Phase 2: Scale Calibration - Research

**Researched:** 2026-03-28
**Domain:** Konva.js click-point calibration, pixel-to-real-world scale math, ruler overlay, modal dialog, toast notifications
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Calibration Interaction**
- Two-click flow: user clicks first point, then second point on the photo
- Modal dialog appears after second click for entering distance + selecting unit (inches or mm)
- User can re-calibrate by clicking "Calibrate" tool again — resets and starts over
- Visual feedback: dots on clicked points + dashed line between them, highlighted in accent blue (#3b82f6)

**Ruler Overlay**
- Position: bottom edge of canvas (standard CAD convention, doesn't obscure photo)
- Tick spacing: auto-scales based on zoom level — major ticks at round intervals (1", 5mm, etc.)
- Unit display: shows the unit the user entered during calibration
- Visibility: always visible after calibration, subtle and semi-transparent

**Scale-First Enforcement**
- Clicking a drawing tool before calibrating shows toast warning "Set scale reference first" — tool stays inactive
- Toolbar shows "No scale set" badge next to calibrate button when uncalibrated
- Drawing tools are disabled until scale is set (DXF would be dimensionless pixels without calibration)

### Claude's Discretion

None specified beyond the above.

CONTEXT.md note: Research recommends immediate rescale of stored geometry when calibration changes — not deferring conversion to export time.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHOTO-04 | User can set scale by clicking two points and entering the real-world distance | Two-click Konva Stage onClick handler; world-coordinate distance formula; modal dialog for distance input; `pxPerMm` ratio stored in Zustand |
| PHOTO-05 | A visual ruler overlay shows real-world units after calibration | Konva Layer rendered AFTER photo layer; inverse-scale technique keeps ruler pixel-size constant across zoom; tick interval computed from `pxPerMm * viewport.scale` |
| PHOTO-06 | User is warned if they attempt to draw before setting a scale reference | Zustand `calibration` guard in tool-selection handler; auto-dismiss toast component rendered in App.tsx |
</phase_requirements>

---

## Summary

Phase 2 delivers the calibration system that unlocks all subsequent drawing. The user clicks two points on the photo, enters a real-world distance, and the app stores a `pxPerMm` ratio. This ratio feeds Phase 3 drawing tools and Phase 4 DXF export.

The implementation is pure in-app computation — no external calibration library needed. The core math is a Euclidean distance in world-pixel space divided by the entered real-world distance (converted to mm). Everything else (modal dialog, ruler overlay, toast warning) is standard React + Konva + Tailwind.

The one non-trivial problem is the ruler overlay: it must maintain a stable pixel size regardless of viewport zoom. The correct technique is rendering the ruler on a separate Konva Layer that is NOT subject to the stage's pan/zoom transform, or rendering it with an inverse scale applied to the Layer. The inverse-scale approach — `layer.scale({ x: 1/viewport.scale, y: 1/viewport.scale })` — is the established Konva pattern and keeps the ruler in world-coordinate space for positioning while appearing at constant screen size.

**Primary recommendation:** Implement calibration as a dedicated Zustand slice (`calibration: CalibrationState | null`), intercept Stage clicks only when `toolMode === 'calibrate'`, and render the ruler on a screen-fixed HTML overlay (not a Konva layer) to sidestep all transform complexity.

---

## Standard Stack

### Core (all already installed in Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-konva | 19.2.3 | Canvas click handling, calibration dot/line rendering, ruler tick marks | Already in use; Stage onClick + Layer primitives handle everything needed |
| Zustand | 5.0.12 | Calibration state (`pxPerMm`, points, `isCalibrated`) | Already in use; getState() pattern in event handlers prevents stale closures |
| Tailwind CSS | 4.x | Modal dialog styling, toast notification, toolbar badge | Already in use; no new utility setup needed |

### No New Dependencies Required

All functionality in this phase is achievable with the existing stack. Specifically:

- **Modal dialog:** Plain React state (`useState`) + Tailwind classes — no Headless UI or Radix needed for a single-purpose two-field dialog.
- **Toast:** Plain React `useState` + `useEffect` auto-dismiss timer — no react-toastify needed for a single message type.
- **Ruler overlay:** Rendered as a fixed-positioned `<div>` HTML overlay over the canvas — avoids Konva transform complexity entirely (see Architecture Patterns).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain React modal | Headless UI `<Dialog>` | Headless UI adds focus trap + accessibility; overkill for a single-user tool with a two-field form; adds a dependency |
| Plain React toast | react-toastify | react-toastify is excellent but heavy for a single toast type; custom is ~20 lines |
| HTML ruler overlay | Konva Layer ruler | Konva ruler requires inverse-scale math and redraws on every zoom; HTML ruler using CSS transforms is simpler and more performant |

---

## Architecture Patterns

### Recommended Project Structure additions

```
src/
├── store/
│   └── useAppStore.ts        # Add calibration slice here (no separate file needed)
├── types/
│   └── index.ts              # Add CalibrationState, CalibrationUnit types
├── components/
│   ├── CalibrationLayer.tsx  # Konva Layer: dots + dashed line during calibration flow
│   ├── RulerOverlay.tsx      # HTML <div> fixed at canvas bottom — ruler ticks
│   ├── CalibrationModal.tsx  # Modal: distance input + unit select
│   └── Toast.tsx             # Auto-dismiss warning toast
├── utils/
│   └── coordinates.ts        # Add: pixelDistance(), worldDistanceToMm()
└── hooks/
    └── useCalibration.ts     # Orchestrates two-click state machine
```

### Pattern 1: World-Coordinate Click Capture

**What:** Get a click position in photo-pixel (world) coordinates regardless of pan/zoom state.
**When to use:** Every Stage click during calibration tool mode.

The existing codebase already does this in `useViewport.ts`. The same formula applies for click capture:

```typescript
// Source: Konva docs sandbox/Relative_Pointer_Position.html + useViewport.ts existing pattern
function handleStageClick(e: KonvaEventObject<MouseEvent>) {
  // Only intercept in calibrate mode
  if (useAppStore.getState().toolMode !== 'calibrate') return;

  const stage = e.target.getStage();
  if (!stage) return;

  // getPointerPosition() returns absolute screen px (top-left of canvas)
  // Manually convert to world coords using current viewport transform
  const pointer = stage.getPointerPosition();
  if (!pointer) return;
  const viewport = useAppStore.getState().viewport;
  const worldPoint: Point = {
    x: (pointer.x - viewport.x) / viewport.scale,
    y: (pointer.y - viewport.y) / viewport.scale,
  };

  useAppStore.getState().addCalibrationPoint(worldPoint);
}
```

Alternatively, call `layer.getRelativePointerPosition()` on a reference to the drawing layer — Konva automatically applies the inverse transform and returns world coordinates directly. Both approaches are equivalent; the manual formula matches the existing codebase style.

### Pattern 2: Scale Ratio Computation

**What:** Compute `pxPerMm` from two world-coordinate points and a user-entered real-world distance.
**When to use:** After user confirms the calibration modal.

```typescript
// Source: standard Euclidean distance + unit normalization
function computePxPerMm(
  p1: Point,
  p2: Point,
  realWorldDistance: number,
  unit: 'mm' | 'in'
): number {
  const pixelDist = Math.sqrt(
    Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
  );
  const distanceMm = unit === 'in' ? realWorldDistance * 25.4 : realWorldDistance;
  return pixelDist / distanceMm; // px per mm
}
```

**Key invariant:** All stored geometry is in world pixels. Converting to mm at any point: `mm = worldPx / pxPerMm`. Converting to inches: `inches = worldPx / pxPerMm / 25.4`. This feeds Phase 4 DXF export unchanged.

### Pattern 3: HTML Ruler Overlay

**What:** A fixed-positioned `<div>` rendered over the canvas, showing ruler ticks in real-world units.
**When to use:** Always visible after calibration is set. Re-renders on viewport zoom change.

```typescript
// Source: Pattern derived from CAD ruler convention + Konva inverse-scale docs
// RulerOverlay.tsx — rendered as a sibling to <CanvasStage /> in App.tsx

function RulerOverlay() {
  const viewport = useAppStore((s) => s.viewport);
  const calibration = useAppStore((s) => s.calibration);
  if (!calibration) return null;

  const { pxPerMm, unit } = calibration;
  // How many screen pixels per mm at current zoom?
  const screenPxPerMm = pxPerMm * viewport.scale;

  // Pick a "nice" major tick interval that keeps ticks 40-120px apart on screen
  const majorTickMm = pickNiceInterval(screenPxPerMm); // see below
  const majorTickPx = majorTickMm * screenPxPerMm;

  // Render ticks as absolutely-positioned marks inside a fixed strip
  // ...
}

function pickNiceInterval(screenPxPerMm: number): number {
  // Nice intervals in mm: 1, 2, 5, 10, 20, 50, 100, 200, 500...
  // In inches: convert target to mm first
  const TARGET_MIN_PX = 50; // minimum screen px between major ticks
  const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  for (const step of niceSteps) {
    if (step * screenPxPerMm >= TARGET_MIN_PX) return step;
  }
  return 1000;
}
```

The ruler strip itself is a `fixed` div at the bottom of the viewport, `height: 32px`, `overflow: hidden`. Tick marks are absolute-positioned `<div>` or `<span>` elements computed from the current `viewport.x` (pan offset) and `majorTickPx`.

**Why HTML over Konva Layer:** The ruler does not need hit testing, dragging, or Konva event handling. A Konva ruler requires redrawing on every `onWheel` event and needs inverse-scale math to stay pixel-fixed. An HTML overlay auto-reflows from React state changes and uses CSS for rendering — significantly simpler.

### Pattern 4: Calibration Two-Click State Machine

**What:** Track which click the user is on (0 = waiting for first, 1 = waiting for second, 2 = modal open).
**When to use:** During `toolMode === 'calibrate'`.

```typescript
// In Zustand store — CalibrationState slice
interface CalibrationState {
  // Persistent after calibration is complete
  pxPerMm: number;
  unit: 'mm' | 'in';
  // Transient click-collection state (cleared after modal confirm)
  clickPoints: Point[];   // length 0, 1, or 2
  isModalOpen: boolean;
}

// Actions:
// addCalibrationPoint(p: Point) — appends to clickPoints, opens modal when length === 2
// confirmCalibration(distance: number, unit: 'mm' | 'in') — computes pxPerMm, clears clickPoints
// resetCalibration() — clears everything, starts fresh
```

Store holds both the **transient** click-collection state and the **persistent** calibration result. The persistent fields (`pxPerMm`, `unit`) must survive tool mode changes — they are the phase output that Phase 3 and Phase 4 read.

### Pattern 5: Disabling Stage Drag During Calibration

**What:** Stage must not pan while user is clicking calibration points.
**When to use:** When `toolMode === 'calibrate'`.

```typescript
// In CanvasStage.tsx — conditional draggable prop
<Stage
  draggable={toolMode !== 'calibrate'}
  // ...
>
```

This is the correct Konva approach: set `draggable={false}` declaratively when you need to prevent pan. Do NOT call `stage.draggable(false)` imperatively in an event handler — it causes state desync with React. Source: react-konva drag docs + community patterns.

### Pattern 6: Toast Warning (PHOTO-06)

**What:** An auto-dismiss toast that appears when a drawing tool is clicked while uncalibrated.
**When to use:** `toolMode` setter called with a drawing tool while `calibration === null`.

```typescript
// Toast.tsx — simple fixed overlay
interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-[64px] left-1/2 -translate-x-1/2 z-50
                    bg-[#2a2a2a] border border-[#3b82f6] text-white
                    text-sm px-4 py-2 rounded-lg shadow-lg">
      {message}
    </div>
  );
}
```

The toast state lives in App.tsx (or a thin `useToast` hook). The drawing tool guard lives in `setToolMode` — or in a wrapper action `trySetDrawingTool` that checks calibration first.

### Anti-Patterns to Avoid

- **Storing calibration points in screen pixels:** After a zoom, those screen pixel coordinates become wrong. Always convert to world coordinates immediately on click using the viewport transform at click time.
- **Computing pxPerMm using screen-pixel distance:** Screen pixels include zoom scale. Use world-pixel distance (after transform) so `pxPerMm` is viewport-independent.
- **Rendering the ruler on a scaled Konva Layer without inverse scale:** Ruler marks will shrink/grow with zoom, making them unreadable. Use HTML overlay or apply `layer.scale({ x: 1/scale, y: 1/scale })`.
- **Opening the modal on first click:** The modal must wait for both points so it can show a preview of the calibration line length.
- **Calling `stage.draggable(false)` inside an event handler:** Causes React/Konva state desync. Use the `draggable` prop instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible focus-trap modal | Custom modal with focus management | Just use `autoFocus` on the first input in a `<dialog>`-like div; or accept that this is a single-user tool | Full focus trap is ~100 lines of DOM traversal; overkill here |
| Euclidean distance | Custom sqrt formula | `Math.sqrt(dx*dx + dy*dy)` IS the formula — no library needed | It's 1 line |
| "Nice number" tick intervals | Custom adaptive tick algorithm | The `pickNiceInterval` function above with a static lookup table | Full adaptive tick algorithms (d3-scale `nice()`) are overkill; the static table covers all real-world cases |

**Key insight:** This phase is geometric math on two points — it's genuinely simple once you have the coordinate transform right. Don't reach for libraries.

---

## Common Pitfalls

### Pitfall 1: Screen-Pixel vs World-Pixel Confusion

**What goes wrong:** Developer stores click coordinates from `e.evt.clientX/clientY` or `stage.getPointerPosition()` directly. When the user then pans/zooms, the calibration points don't match the photo anymore.
**Why it happens:** `stage.getPointerPosition()` returns absolute screen coordinates. The photo is rendered at world coordinates (0,0) in Konva stage space. Screen ≠ world when viewport.scale ≠ 1 or viewport.x/y ≠ 0.
**How to avoid:** Apply the existing `screenToWorld(pointer, viewport)` transform immediately on click. Verify in `coordinates.ts`: `x: (pointer.x - v.x) / v.scale`.
**Warning signs:** Calibration dots drift from clicked location after zooming.

### Pitfall 2: Ruler Redraws on Every Wheel Event

**What goes wrong:** Ruler is a Konva Layer. Every scroll event triggers a re-render of all tick mark shapes.
**Why it happens:** Konva re-renders layers when their children change. If `onWheel` updates viewport state, and the ruler reads viewport, it rerenders every tick.
**How to avoid:** Use the HTML overlay approach (see Pattern 3). HTML re-renders are DOM-diff'd by React, not full canvas redraws.
**Warning signs:** FPS drop during zoom when the ruler has many tick marks.

### Pitfall 3: Stage Drag Interfering with Click Collection

**What goes wrong:** User tries to click a calibration point but accidentally starts a drag, which fires `onDragEnd` but not `onClick`.
**Why it happens:** Konva fires drag events when pointer moves > `dragDistance` pixels. Default `dragDistance` is 0 (any movement = drag).
**How to avoid:** Set `draggable={toolMode !== 'calibrate'}` on Stage (Pattern 5). Also acceptable: set `dragDistance={3}` on Stage so small wobbles don't trigger drag.
**Warning signs:** Calibration clicks are intermittently ignored.

### Pitfall 4: pxPerMm of Zero or NaN

**What goes wrong:** User enters distance 0 or clicks the same point twice — `computePxPerMm` returns `Infinity` or `NaN`.
**Why it happens:** Division by zero in both cases.
**How to avoid:** Validate in the modal: disable the Confirm button if distance ≤ 0. Also guard: if `pixelDist < 5` world pixels, show "Points are too close — try again" and reset.
**Warning signs:** Ruler shows no ticks or incorrect dimensions; DXF export produces zero-size geometry.

### Pitfall 5: Calibration Points Retained Across Re-Calibration

**What goes wrong:** User triggers "Calibrate" a second time. The old click points are still in state. The second click (intended as first point of new calibration) triggers the modal immediately.
**Why it happens:** `clickPoints` array not cleared on `resetCalibration()`.
**How to avoid:** `resetCalibration()` sets `clickPoints: []`, `isModalOpen: false`, and optionally preserves the previous `pxPerMm` until the new one is confirmed (so the ruler stays visible during re-calibration).
**Warning signs:** Modal appears after only one click during re-calibration.

---

## Code Examples

### Coordinate Transform for Calibration Click

```typescript
// Source: Konva docs + existing useViewport.ts pattern in codebase
import type { KonvaEventObject } from 'konva/lib/Node';
import { useAppStore } from '../store/useAppStore';

function handleCalibrationClick(e: KonvaEventObject<MouseEvent>) {
  const stage = e.target.getStage();
  if (!stage) return;
  const pointer = stage.getPointerPosition();
  if (!pointer) return;
  const { viewport } = useAppStore.getState();
  const worldPoint = {
    x: (pointer.x - viewport.x) / viewport.scale,
    y: (pointer.y - viewport.y) / viewport.scale,
  };
  useAppStore.getState().addCalibrationPoint(worldPoint);
}
```

### CalibrationState Type

```typescript
// src/types/index.ts additions
export type CalibrationUnit = 'mm' | 'in';

export interface CalibrationState {
  pxPerMm: number;
  unit: CalibrationUnit;
}

export interface CalibrationClickState {
  clickPoints: Point[];    // world coords; length 0, 1, or 2
  isModalOpen: boolean;
}
```

### Zustand Store Additions

```typescript
// src/store/useAppStore.ts additions
interface AppState {
  // ...existing fields...

  // Persistent calibration result (null = not calibrated yet)
  calibration: CalibrationState | null;

  // Transient calibration click state
  calibrationClick: CalibrationClickState;

  // Actions
  addCalibrationPoint: (p: Point) => void;
  confirmCalibration: (distance: number, unit: CalibrationUnit) => void;
  cancelCalibration: () => void;
  resetCalibration: () => void;
}
```

### Calibration Visual: Dots + Dashed Line

```typescript
// CalibrationLayer.tsx — Konva shapes for in-progress calibration
import { Layer, Circle, Line } from 'react-konva';

export function CalibrationLayer() {
  const { clickPoints, isModalOpen } = useAppStore((s) => s.calibrationClick);
  if (clickPoints.length === 0) return null;

  return (
    <Layer>
      {/* First point dot */}
      <Circle
        x={clickPoints[0].x}
        y={clickPoints[0].y}
        radius={5}          // world px — appears ~5*viewport.scale screen px
        fill="#3b82f6"
        strokeWidth={0}
      />
      {/* Second point dot + dashed line */}
      {clickPoints.length === 2 && !isModalOpen && (
        <>
          <Circle x={clickPoints[1].x} y={clickPoints[1].y} radius={5} fill="#3b82f6" />
          <Line
            points={[clickPoints[0].x, clickPoints[0].y, clickPoints[1].x, clickPoints[1].y]}
            stroke="#3b82f6"
            strokeWidth={1.5}
            dash={[6, 4]}    // world-px dash pattern
          />
        </>
      )}
    </Layer>
  );
}
```

Note: dot radius and stroke width are in world pixels. At zoom=1 they appear as specified. At zoom=2 they appear twice as large on screen — this is correct behavior for calibration reference dots since they should scale with the photo.

### ToolMode Type Update

```typescript
// src/types/index.ts — expand ToolMode
export type ToolMode = 'select' | 'calibrate';
// Phase 3 will add: | 'line' | 'arc'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix Dialog / Headless UI for modals | Plain React useState + portal-less div for simple single-purpose modals | 2023+ (accessibility matured in browsers) | Acceptable for single-user tools without a11y requirements; reduces dependencies |
| Canvas-based ruler (Konva/Fabric) | HTML overlay ruler with CSS positioning | ~2022 (HTML-over-canvas hybrid pattern) | Simpler React mental model; CSS handles pixel-accuracy; no inverse-scale math |
| DPI-based px-to-mm conversion | Reference-object calibration | N/A (these are different problems) | DPI conversion assumes known screen DPI — useless for photos. Reference calibration is the only correct approach for photographed objects. |

---

## Open Questions

1. **Ruler tick labels at high zoom**
   - What we know: At very high zoom (>500%), millimeter intervals will be very close together and labels will overlap.
   - What's unclear: Whether the label culling logic (skip label if it would overlap the previous one) is needed in Phase 2 or can wait.
   - Recommendation: Implement basic label culling from the start using `pickNiceInterval` — it naturally avoids overlap by choosing larger intervals.

2. **Calibration dot size in world vs screen space**
   - What we know: Dots rendered on Konva Layer scale with viewport. At low zoom, dots may be too small to see; at high zoom, too large.
   - What's unclear: Whether the project wants constant-screen-size dots (requires inverse scaling on the calibration layer) or photo-proportional dots.
   - Recommendation: Start with photo-proportional dots (no inverse scale). They are visible when the user is zoomed in enough to click precisely, which is the expected use case.

3. **Ruler position during canvas pan**
   - What we know: The ruler bottom edge of canvas is fixed to screen position. The ticks must scroll to reflect pan offset (`viewport.x`) so they stay aligned with photo content.
   - What's unclear: Whether the ruler origin (0 mm) should be the photo left edge or the current viewport left edge.
   - Recommendation: Ruler origin = photo world origin (0,0). Ticks scroll as the user pans. This matches CAD convention and makes "0" always mean "left edge of photo."

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2 is purely in-app code changes. No external services, databases, CLI tools, or runtimes beyond the existing Node/npm/browser environment required.

---

## Validation Architecture

Step skipped — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

---

## Sources

### Primary (HIGH confidence)
- Konva docs — `getPointerPosition()` API: https://konvajs.org/api/Konva.Stage.html
- Konva sandbox — `getRelativePointerPosition()` pattern: https://konvajs.org/docs/sandbox/Relative_Pointer_Position.html
- Konva GitHub issue #797 — ruler overlay discussion: https://github.com/konvajs/konva/issues/797
- Konva CodePen infinite rulers: https://codepen.io/JEE42/pen/rNbLoxb
- Existing `src/utils/coordinates.ts` — `screenToWorld` formula confirmed in Phase 1
- Existing `src/hooks/useViewport.ts` — `getPointerPosition()` + viewport transform already in use

### Secondary (MEDIUM confidence)
- WebSearch: Konva ruler inverse-scale technique (`layer.scale({ x: 1/stage.scaleX() })`) — multiple community sources agree; verified against Konva scale/transform docs
- WebSearch: Reference-object px-to-mm calibration formula — confirmed by multiple scientific/vision sources; formula is elementary geometry

### Tertiary (LOW confidence)
- LogRocket toast library comparison 2025 — used to confirm that a hand-rolled ~20-line toast is viable for this use case

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing Phase 1 stack handles all requirements
- Architecture: HIGH — coordinate transform pattern confirmed in existing code; state machine is straightforward
- Ruler overlay: MEDIUM — HTML overlay approach is solid; exact tick label culling details are implementation-level decisions
- Pitfalls: HIGH — pitfalls are grounded in the specific Konva coordinate system behavior already observed in Phase 1

**Research date:** 2026-03-28
**Valid until:** 2026-09-28 (stable libraries; Konva API unlikely to change)
