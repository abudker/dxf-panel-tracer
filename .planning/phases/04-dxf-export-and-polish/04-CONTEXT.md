# Phase 4: DXF Export and Polish - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver DXF export functionality. User clicks Export, gets a dimensionally accurate DXF file that opens in Carbide Create with correct dimensions, correct arc directions, and no toolpath issues. Includes closure validation and sensible filename.

</domain>

<decisions>
## Implementation Decisions

### DXF Generation
- Manual DXF writing (~50-100 lines) — only LINE and ARC entities needed, avoids stale @tarikjabiri/dxf dependency
- Set $INSUNITS header based on calibration unit (inches=1, mm=4) — prevents 25.4x size errors in Carbide Create
- Y-axis flip at export time: negate Y coordinates, adjust arc angles (canvas Y↓, DXF Y↑)
- Origin normalization: translate all geometry so bounding box starts at (0,0) for cleaner CAM import

### Export UX
- Export DXF button in toolbar, enabled only when segments exist
- Closure warning: modal dialog "Shape is not closed. Export anyway?" with Continue/Cancel
- Closure detection tolerance: 0.5 world pixels
- Filename format: `panel-trace-YYYY-MM-DD.dxf`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/useAppStore.ts` — Zustand store with segments array, calibration state (pxPerMm, unit)
- `src/types/index.ts` — LineSegment, ArcSegment types with all needed fields (center, radius, startAngle, endAngle, anticlockwise)
- `src/utils/geometry.ts` — getEndpoints utility for closure detection
- `src/components/Toolbar.tsx` — floating toolbar for Export button placement
- `src/components/Toast.tsx` — reusable for export feedback

### Established Patterns
- Modal dialog pattern from CalibrationModal (Phase 2)
- Zustand getState() for non-reactive reads in export logic
- World coordinate system — all segments already in world pixels

### Integration Points
- Export reads segments from store, converts world pixels → real units using pxPerMm
- Y-axis flip and arc angle conversion happen only in the export function
- Downloaded file via browser Blob + URL.createObjectURL pattern

</code_context>

<specifics>
## Specific Ideas

- Research warns: DXF ARC entities are always counterclockwise. If a segment has `anticlockwise: false`, swap start/end angles at export.
- Research warns: arc angles must be in degrees (not radians) in DXF format.
- Closure check: first endpoint of first segment == last endpoint of last segment within tolerance.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
