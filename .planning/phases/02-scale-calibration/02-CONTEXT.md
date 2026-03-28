# Phase 2: Scale Calibration - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the scale calibration tool. User clicks two points on a photo with a known-size reference, enters the real-world distance, and the app computes a px-to-real-world-unit ratio. After calibration, a ruler overlay shows real-world units. Drawing tools are disabled until calibration is complete.

</domain>

<decisions>
## Implementation Decisions

### Calibration Interaction
- Two-click flow: user clicks first point, then second point on the photo
- Modal dialog appears after second click for entering distance + selecting unit (inches or mm)
- User can re-calibrate by clicking "Calibrate" tool again — resets and starts over
- Visual feedback: dots on clicked points + dashed line between them, highlighted in accent blue (#3b82f6)

### Ruler Overlay
- Position: bottom edge of canvas (standard CAD convention, doesn't obscure photo)
- Tick spacing: auto-scales based on zoom level — major ticks at round intervals (1", 5mm, etc.)
- Unit display: shows the unit the user entered during calibration
- Visibility: always visible after calibration, subtle and semi-transparent

### Scale-First Enforcement
- Clicking a drawing tool before calibrating shows toast warning "Set scale reference first" — tool stays inactive
- Toolbar shows "No scale set" badge next to calibrate button when uncalibrated
- Drawing tools are disabled until scale is set (DXF would be dimensionless pixels without calibration)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/useAppStore.ts` — Zustand store with viewport, photoUrl, photoSize; needs calibration state added
- `src/utils/coordinates.ts` — screenToWorld/worldToScreen utilities for coordinate transforms
- `src/types/index.ts` — Point, Viewport types; needs CalibrationState type
- `src/components/Toolbar.tsx` — floating toolbar; needs calibrate button added
- `src/components/CanvasStage.tsx` — Konva Stage with pan/zoom; calibration clicks need to intercept here

### Established Patterns
- Dark UI theme with accent blue (#3b82f6) for interactive elements
- Konva + react-konva for canvas rendering
- Zustand with getState() for event handlers (avoid stale closures)
- Floating toolbar at top-left

### Integration Points
- Calibration state feeds into Phase 3 drawing tools (tools disabled when uncalibrated)
- Scale ratio feeds into Phase 4 DXF export (px → real-world conversion)

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what's captured above. Research recommends immediate rescale of stored geometry when calibration changes — not deferring conversion to export time.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
