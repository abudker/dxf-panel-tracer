# Phase 4: DXF Export and Polish - Research

**Researched:** 2026-03-28
**Domain:** DXF file format, browser file download, arc angle coordinate conversion
**Confidence:** HIGH

## Summary

Phase 4 delivers DXF export. All decisions are already locked in CONTEXT.md: manual DXF string construction (~50-100 lines), browser Blob download, Y-axis flip at export time, and closure-warning modal. No new dependencies are required — the existing project stack covers everything.

The most technically subtle part is arc angle conversion. Canvas stores arc angles in the Y-down convention (radians, with an `anticlockwise` flag). DXF requires angles in degrees in the Y-up math convention, always CCW from the positive X axis. The conversion is a Y-negate of all coordinates plus a conditional start/end angle swap for arcs whose `anticlockwise: true` flag indicates they sweep CCW in screen space (which becomes CW after Y-flip).

The entire export surface is a single pure function — no React state mutations, no async work, no new components beyond an Export button in Toolbar and a ClosureWarning modal.

**Primary recommendation:** Implement export as a single `exportToDxf(segments, calibration)` utility function in `src/utils/dxfExport.ts`. Keep all coordinate math self-contained there. Wire Toolbar button + ClosureWarningModal in a thin layer on top.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**DXF Generation**
- Manual DXF writing (~50-100 lines) — only LINE and ARC entities needed, avoids stale @tarikjabiri/dxf dependency
- Set $INSUNITS header based on calibration unit (inches=1, mm=4) — prevents 25.4x size errors in Carbide Create
- Y-axis flip at export time: negate Y coordinates, adjust arc angles (canvas Y↓, DXF Y↑)
- Origin normalization: translate all geometry so bounding box starts at (0,0) for cleaner CAM import

**Export UX**
- Export DXF button in toolbar, enabled only when segments exist
- Closure warning: modal dialog "Shape is not closed. Export anyway?" with Continue/Cancel
- Closure detection tolerance: 0.5 world pixels
- Filename format: `panel-trace-YYYY-MM-DD.dxf`

### Claude's Discretion

None specified — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXPORT-01 | User can export traced shape as a DXF file with LINE and ARC entities at real-world dimensions | Manual DXF string construction; `pxPerMm` from calibration for coordinate scaling; $INSUNITS header for unit declaration |
| EXPORT-02 | User is warned if the shape is not closed before export | Closure detection: compare first-segment start endpoint vs last-segment end endpoint within 0.5px tolerance; existing `getEndpoints()` utility; modal pattern from CalibrationModal |
| EXPORT-03 | Exported file has a sensible default filename (e.g., panel-trace-2026-03-28.dxf) | `new Date().toISOString().slice(0,10)` gives `YYYY-MM-DD`; Blob download with `a.download = filename` attribute |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native browser Blob | built-in | DXF string → downloadable file | Standard pattern; no library needed |
| Native URL.createObjectURL | built-in | Generate temp URL for Blob | Standard download trigger |
| Zustand `getState()` | 5.0.12 | Non-reactive read in export handler | Established pattern in this codebase |
| TypeScript | 5.9.3 | Type safety for export math | Already used throughout |

### No New Dependencies Required

The DXF format is simple enough (~50-100 lines) that no library is needed. The decision to avoid `@tarikjabiri/dxf` was locked in CONTEXT.md (stale dependency, last published ~July 2023).

**Verification:** `npm view @tarikjabiri/dxf version` → `2.8.9`, last published July 2023. Confirmed stale.

### Installation

No `npm install` step required for this phase.

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── utils/
│   └── dxfExport.ts      # NEW: pure export function, all math here
├── components/
│   ├── Toolbar.tsx        # MODIFIED: add Export button
│   └── ClosureWarningModal.tsx  # NEW: modal for unclosed shape warning
└── store/
    └── useAppStore.ts     # POSSIBLY MODIFIED: add isClosureWarningOpen state
```

### Pattern 1: Pure Export Function

**What:** All DXF generation logic lives in `src/utils/dxfExport.ts` as a pure function.
**When to use:** Export is triggered from Toolbar; no React state is mutated during the math.
**Signature:**
```typescript
// src/utils/dxfExport.ts
export function buildDxfString(
  segments: Segment[],
  pxPerMm: number,
  unit: CalibrationUnit
): string
```

The function:
1. Computes bounding box of all endpoints
2. Applies origin normalization (subtract `minX`, `minY` after Y-flip)
3. Scales world pixels → real units using `pxPerMm` (and divides by 25.4 if `unit === 'in'`)
4. Writes DXF header + entities + EOF
5. Returns the DXF string

### Pattern 2: Closure Detection

**What:** Compare first endpoint of first segment to last endpoint of last segment.
**When to use:** Called before export; if not closed, show modal.

```typescript
// Uses existing getEndpoints() from src/utils/geometry.ts
export function isShapeClosed(segments: Segment[], tolerancePx = 0.5): boolean {
  if (segments.length === 0) return false;
  const first = segments[0];
  const last = segments[segments.length - 1];
  const p1 = first.type === 'line' ? first.start : first.p1;
  const p2 = last.type === 'line' ? last.end : last.p2;
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy) <= tolerancePx;
}
```

### Pattern 3: Toolbar Export Button

**What:** Add Export button to existing Toolbar component.
**Enabled condition:** `segments.length > 0`
**Disabled condition:** `segments.length === 0` — same pattern as draw tool buttons with `opacity-40 cursor-not-allowed`.
**On click:** Check closure → show modal or trigger download.

```typescript
// Toolbar.tsx addition (follows existing button pattern)
const segments = useAppStore((s) => s.segments);
const hasSegments = segments.length > 0;
// onClick: useAppStore.getState().triggerExport()
// or: call exportHandler() inline
```

### Pattern 4: ClosureWarningModal

**What:** Modal matching CalibrationModal visual pattern (same dark styling, same backdrop).
**Props/behavior:** Shown when user clicks Export and shape is not closed.

```typescript
// src/components/ClosureWarningModal.tsx
// Pattern mirrors CalibrationModal.tsx:
// - Fixed overlay z-[60] bg-black/50
// - Inner div: bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl
// - Two buttons: Cancel (abort export) and Continue (proceed anyway)
```

### Pattern 5: Browser File Download

```typescript
// Established pattern (referenced in CLAUDE.md and CONTEXT.md)
function downloadDxf(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Anti-Patterns to Avoid

- **Performing coordinate math in the React component:** Keep it in `dxfExport.ts`. Components only call `buildDxfString` and `downloadDxf`.
- **Forgetting `URL.revokeObjectURL`:** Causes memory leaks. Always revoke immediately after `.click()`.
- **Reading store inside `buildDxfString`:** Pass `segments`, `pxPerMm`, and `unit` as parameters — keep the function pure for testability.
- **Storing `isModalOpen` in component state:** Use Zustand for modal visibility so the export flow is inspectable. (CalibrationModal precedent uses store for `isModalOpen`.)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File download | Custom server endpoint | Native Blob + URL.createObjectURL | Browser built-in; no server needed |
| Date formatting | Custom date formatter | `new Date().toISOString().slice(0, 10)` | Returns `YYYY-MM-DD` reliably in local time when used with `toLocaleDateString` or ISO string |
| Closure check | Graph traversal | Simple endpoint distance check | Shape is a linear chain; closure = first endpoint matches last endpoint |

**Key insight:** DXF for 2D LINE and ARC is ~50 lines of string template literals. The format is a simple group-code pair per line (an integer code, then a value on the next line). No parser, no library, no AST.

---

## DXF Format Specification (Verified)

### Minimal File Structure

A valid DXF file that Carbide Create will accept has this structure:

```
0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
9
$INSUNITS
70
{1 for inches | 4 for millimeters}
0
ENDSEC
0
SECTION
2
ENTITIES
{entity records go here}
0
ENDSEC
0
EOF
```

**$INSUNITS values** (verified against AutoCAD DXF spec):
- `1` = Inches
- `4` = Millimeters

**Mapping from calibration:** `unit === 'in' ? 1 : 4`

The TABLES and BLOCKS sections are optional for a file containing only primitive entities on the default layer (verified: ezdxf documentation and AutoCAD DXF reference confirm HEADER + ENTITIES + EOF is sufficient for basic geometry).

### LINE Entity Group Codes

```
0
LINE
8
0
10
{x1}
20
{y1}
30
0.0
11
{x2}
21
{y2}
31
0.0
```

Group codes (verified):
- `0` = entity type name
- `8` = layer (use `0` for default layer)
- `10/20/30` = start point X/Y/Z
- `11/21/31` = end point X/Y/Z
- Z values are always `0.0` for 2D

### ARC Entity Group Codes

```
0
ARC
8
0
10
{cx}
20
{cy}
30
0.0
40
{radius}
50
{start_angle_degrees}
51
{end_angle_degrees}
```

Group codes (verified):
- `10/20/30` = center point X/Y/Z
- `40` = radius
- `50` = start angle in **degrees** (CCW from +X axis)
- `51` = end angle in **degrees** (CCW from +X axis)
- Arc always sweeps **CCW** from start_angle to end_angle (DXF invariant)

**Important:** DXF angles are in degrees, NOT radians. Canvas stores them in radians. Conversion is required.

---

## Coordinate Conversion Math (Critical)

### Y-Axis Flip

Canvas uses Y-down convention (Y increases downward). DXF uses Y-up convention (Y increases upward, standard math orientation).

For all points: `y_dxf = -y_canvas`

This applies to:
- Line start/end Y values
- Arc center Y value

After Y-flip, all angles must also be negated.

### Arc Angle Conversion

Canvas stores: `startAngle` and `endAngle` in radians, computed via `Math.atan2(p.y - cy, p.x - cx)` with `anticlockwise` flag.

Step 1 — Negate angles (because Y was negated):
```
dxfStartAngle_rad = -canvasStartAngle_rad
dxfEndAngle_rad   = -canvasEndAngle_rad
```

Step 2 — Convert to degrees:
```
dxfStartAngle_deg = dxfStartAngle_rad * (180 / Math.PI)
dxfEndAngle_deg   = dxfEndAngle_rad   * (180 / Math.PI)
```

Step 3 — Normalize to [0, 360):
```
function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}
```

Step 4 — Handle arc direction (DXF always CCW):

DXF ARC sweeps CCW from `start_angle` to `end_angle`. After the Y-flip:
- Canvas `anticlockwise: false` (CW in screen) → becomes CCW in Y-up math → DXF: emit as-is (no swap)
- Canvas `anticlockwise: true` (CCW in screen) → becomes CW in Y-up math → must swap start/end so DXF sweeps CCW over the same physical arc

```typescript
let dxfStart = normDeg(-seg.startAngle * 180 / Math.PI);
let dxfEnd   = normDeg(-seg.endAngle   * 180 / Math.PI);

if (seg.anticlockwise) {
  // Canvas CCW → after Y-flip = CW → swap so DXF sweeps CCW over the correct arc
  [dxfStart, dxfEnd] = [dxfEnd, dxfStart];
}
```

### Origin Normalization

After flipping Y but before scaling, compute the bounding box of all entity coordinates and translate so the minimum is at (0, 0).

```typescript
// Collect all X values: line.start.x, line.end.x, arc.center.x
// Collect all Y values: -line.start.y, -line.end.y, -(arc.center.y)
// (also subtract arc.radius from minY and add to maxY for arc bounds)
const minX = Math.min(...allX);
const minY = Math.min(...allY);
// then: finalX = rawX - minX, finalY = rawY - minY
```

### Scaling World Pixels to Real Units

```typescript
// pxPerMm from calibration state
// unit: 'mm' | 'in'

const mmValue = worldPixels / pxPerMm;                   // always convert to mm first
const realValue = unit === 'in' ? mmValue / 25.4 : mmValue;  // then to target unit
```

This matches `$INSUNITS`: if unit is 'in', scale to inches AND set `$INSUNITS=1`. If 'mm', scale to mm AND set `$INSUNITS=4`.

---

## Common Pitfalls

### Pitfall 1: 25.4x Size Error in Carbide Create
**What goes wrong:** DXF opens at 25.4× the correct size (e.g., 12-inch panel appears as 304 mm).
**Why it happens:** Carbide Create reads `$INSUNITS`. If omitted or wrong, it defaults to one unit system while the coordinates are in the other. Missing $INSUNITS defaults to unitless (0), causing incorrect scaling.
**How to avoid:** Always set `$INSUNITS` in the HEADER section. Map `unit === 'in' ? 1 : 4`.
**Warning signs:** Importing panel and Carbide Create shows wildly wrong dimensions.

### Pitfall 2: Arc Going the Wrong Way (Mirror Image)
**What goes wrong:** A concave arc imports as convex, or vice versa.
**Why it happens:** The Y-axis flip reverses the "handedness" of arcs. An arc drawn CCW on screen is actually CW in DXF Y-up coordinates. Not swapping start/end angles means DXF sweeps the wrong half of the circle.
**How to avoid:** Apply the conditional swap: if `seg.anticlockwise === true`, swap `dxfStart` and `dxfEnd`.
**Warning signs:** Checking exported arcs in a viewer — the arc bulges the opposite direction from what was traced.

### Pitfall 3: Angles in Radians instead of Degrees
**What goes wrong:** All arcs import as tiny slivers or have obviously wrong spans.
**Why it happens:** DXF group codes 50/51 expect degrees. Canvas stores in radians (~0–6.28). A 90-degree arc stored as `Math.PI/2 ≈ 1.57` degrees would appear as a 1.57-degree arc.
**How to avoid:** Always multiply by `(180 / Math.PI)` before writing to DXF.
**Warning signs:** All arcs appear nearly collapsed to points in Carbide Create.

### Pitfall 4: Open Path (Magenta) in Carbide Create
**What goes wrong:** Shape imports as an open path, shown in magenta, and CNC toolpaths cannot be cleanly assigned.
**Why it happens:** Either (a) the user's shape is genuinely not closed, or (b) a floating-point gap exists between connected segments even when they look connected visually.
**How to avoid:** The closure warning modal addresses case (a). For case (b), snapping (Phase 3) ensures endpoints match exactly when they were drawn snapped. No additional epsilon-join is needed at export time — export coordinates as-is.
**Warning signs:** Carbide Create highlights the path in magenta; "Join" operation in Carbide Create is required.

### Pitfall 5: Forgetting to Revoke Object URL
**What goes wrong:** Memory leak; each export call retains a blob in memory.
**Why it happens:** `URL.createObjectURL` creates a persistent reference until revoked.
**How to avoid:** Call `URL.revokeObjectURL(url)` immediately after `a.click()`.
**Warning signs:** Memory usage grows with each export in a long session (rare in practice but still correct to fix).

### Pitfall 6: Arc Bounding Box Ignoring Radius
**What goes wrong:** Origin normalization shifts geometry but arcs extend beyond the bounding box computed from center points alone, potentially producing negative coordinates.
**Why it happens:** Arc center at (10, 10) with radius 15 extends to x = -5, which after subtracting minX = 10 gives x = -15.
**How to avoid:** When computing `minX` and `minY`, subtract the arc radius from each arc center's bounds: `arcMinX = cx - radius`, `arcMaxX = cx + radius`, same for Y. Use these extended bounds for normalization.
**Warning signs:** Arcs near the left or bottom edge of the drawing have negative coordinates in the DXF.

---

## Code Examples

### Minimal DXF String Template

```typescript
// Source: AutoCAD DXF Reference, ezdxf documentation
function buildDxfString(
  segments: Segment[],
  pxPerMm: number,
  unit: CalibrationUnit
): string {
  const insunits = unit === 'in' ? 1 : 4;
  const lines: string[] = [];

  // HEADER
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1009');
  lines.push('9', '$INSUNITS', '70', String(insunits));
  lines.push('0', 'ENDSEC');

  // ENTITIES
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // ... entity records ...

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\n') + '\n';
}
```

### LINE Entity Record

```typescript
// Group code pairs for a LINE entity
function lineRecord(x1: number, y1: number, x2: number, y2: number): string[] {
  return [
    '0', 'LINE',
    '8', '0',        // layer 0
    '10', fmt(x1),
    '20', fmt(y1),
    '30', '0.0',
    '11', fmt(x2),
    '21', fmt(y2),
    '31', '0.0',
  ];
}
```

### ARC Entity Record

```typescript
// Group code pairs for an ARC entity (angles already converted to DXF degrees)
function arcRecord(
  cx: number, cy: number, radius: number,
  startDeg: number, endDeg: number
): string[] {
  return [
    '0', 'ARC',
    '8', '0',        // layer 0
    '10', fmt(cx),
    '20', fmt(cy),
    '30', '0.0',
    '40', fmt(radius),
    '50', fmt(startDeg),
    '51', fmt(endDeg),
  ];
}
```

### Arc Angle Conversion (Canvas Y-down → DXF Y-up)

```typescript
function canvasArcToDxfAngles(
  startAngle: number,   // radians, canvas Y-down
  endAngle: number,     // radians, canvas Y-down
  anticlockwise: boolean
): { startDeg: number; endDeg: number } {
  const normDeg = (d: number) => ((d % 360) + 360) % 360;

  let startDeg = normDeg(-startAngle * (180 / Math.PI));
  let endDeg   = normDeg(-endAngle   * (180 / Math.PI));

  // Canvas CCW (anticlockwise=true) becomes CW after Y-flip; swap to restore CCW sweep
  if (anticlockwise) {
    [startDeg, endDeg] = [endDeg, startDeg];
  }

  return { startDeg, endDeg };
}
```

### Coordinate Scaling

```typescript
function toRealUnits(worldPx: number, pxPerMm: number, unit: CalibrationUnit): number {
  const mm = worldPx / pxPerMm;
  return unit === 'in' ? mm / 25.4 : mm;
}
```

### Radius Scaling

Arc radius is also a world pixel value; scale the same way:
```typescript
const dxfRadius = toRealUnits(seg.radius, pxPerMm, unit);
```

### Filename Generation

```typescript
// Produces: panel-trace-2026-03-28.dxf
const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
const filename = `panel-trace-${today}.dxf`;
```

**Note:** `toISOString()` returns UTC date. For local date, use:
```typescript
const d = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
```
Local date is preferable so the filename matches the user's calendar day.

### Browser Download

```typescript
function downloadDxf(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);  // immediate revocation is fine — click is synchronous
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DXF library (`@tarikjabiri/dxf`) | Manual string building | Phase 4 decision (CONTEXT.md) | No dependency, full control over output |
| Anonymous anchor element | Same — still best practice | n/a | Standard pattern, no change |

**Deprecated/outdated:**
- `@tarikjabiri/dxf`: Last published July 2023. Not installed in this project. Decision is to avoid it.

---

## Open Questions

1. **Number formatting precision for DXF coordinates**
   - What we know: DXF floats are written as decimal strings (e.g., `12.5000`)
   - What's unclear: How many decimal places? Too few → rounding errors in tight fits; too many → unnecessarily large files
   - Recommendation: Use 6 decimal places (`toFixed(6)`). This provides sub-micron precision for any realistic panel size, and Carbide Create handles it correctly.

2. **Extrusion vector (group codes 210/220/230)**
   - What we know: 2D arcs in the XY plane do not need explicit extrusion vector group codes
   - What's unclear: Whether Carbide Create requires them or silently defaults to (0,0,1)
   - Recommendation: Omit them. The AutoCAD DXF spec states the default extrusion vector is (0,0,1) when absent, which is correct for 2D. All known Carbide Create examples omit them.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 4 is purely code changes (a utility function + two UI components). No external CLIs, services, databases, or runtimes beyond the existing browser + Node/Vite build environment.

---

## Validation Architecture

`workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. Section skipped.

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Applies To |
|-----------|--------|------------|
| Named component exports (`export function X`) | CLAUDE.md conventions | `ClosureWarningModal.tsx`, Export button wiring |
| `useAppStore.getState()` in event handlers (avoid stale closures) | CLAUDE.md / accumulated decisions | Export button `onClick`, modal Continue/Cancel handlers |
| Tailwind v4 with `@import "tailwindcss"` — no config file, no `@tailwind` directives | CLAUDE.md stack | Any new component styling |
| Dark UI palette: `#1a1a1a` bg, `#2a2a2a` surface, `#3a3a3a` border, `#3b82f6` active, `#999` muted text | Established from existing components | `ClosureWarningModal`, Export button |
| GSD workflow — no direct repo edits outside a GSD command | CLAUDE.md workflow | n/a (planner is GSD) |

---

## Sources

### Primary (HIGH confidence)

- [AutoCAD DXF ARC entity reference](https://help.autodesk.com/view/ACD/2022/ENU/?guid=GUID-0B14D8F1-0EBA-44BF-9108-57D8CE614BC8) — group codes 10/20/30/40/50/51, CCW convention, degrees
- [AfraLISP DXF Group Codes](https://www.afralisp.net/archive/lispa/dxf.htm) — confirmed: "Angles: output in degrees to DXF files"
- [AutoCAD 2012 DXF Reference PDF](https://images.autodesk.com/adsk/files/autocad_2012_pdf_dxf-reference_enu.pdf) — $INSUNITS values 1=inches, 4=mm
- [MDN URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) — browser download pattern
- ezdxf docs (verified content) — $INSUNITS value table, ARC entity CCW direction invariant

### Secondary (MEDIUM confidence)

- [Carbide Create DXF community threads](https://community.carbide3d.com/t/opening-dxf-file-in-carbide-create/64272) — confirmed: open paths shown in magenta; standard DXF LINE/ARC entities supported
- [Rhino forum — DXF arc direction](https://discourse.mcneel.com/t/dxf-export-arc-direction/8577) — confirmed: "AutoCAD arcs are always counter-clockwise"
- [AutoCAD community — CW/CCW arc determination](https://forums.autodesk.com/t5/autocad-forum/how-to-find-whether-an-arc-is-clockwise-or-counter-clockwise-in/td-p/7657875) — confirmed: arc-curve goes CCW from start_angle to end_angle around extrusion vector (0,0,1)

### Tertiary (LOW confidence)

None — all critical claims verified by PRIMARY sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing browser APIs
- DXF format (group codes, angles, $INSUNITS): HIGH — verified from AutoCAD DXF reference and multiple corroborating sources
- Arc angle conversion math: HIGH — derived from verified coordinate geometry principles; corroborated by community sources
- Carbide Create compatibility: MEDIUM — verified from community forums, not official Carbide 3D documentation

**Research date:** 2026-03-28
**Valid until:** 2026-09-28 (DXF format is stable; Carbide Create import behavior is stable)
