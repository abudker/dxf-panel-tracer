# Phase 3: Drawing Tools - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver line and arc drawing tools for tracing panel cutout shapes over the photo background. User can draw lines (two-click), arcs (three-point), snap endpoints, select and delete segments, and undo/redo actions. All geometry stored in world coordinates.

</domain>

<decisions>
## Implementation Decisions

### Line & Arc Drawing UX
- Line tool: click start point, click end point — line committed on second click
- Arc tool: 3-point interaction — click start, click end, click point-on-arc (most intuitive for tracing existing curves)
- Ghost preview from last click to cursor position while drawing — critical for accuracy
- Toolbar buttons for Line (L), Arc (A), Select (S) with keyboard shortcuts

### Snapping & Segment Management
- Snap threshold: 10 screen pixels — close enough to feel magnetic, far enough to avoid accidental snaps
- Snap visual feedback: endpoint highlights with a ring when cursor is within snap distance
- Segment selection: click near a segment in Select mode to highlight it in a different color
- Delete: select segment + press Delete/Backspace key (standard keyboard shortcut)

### Undo/Redo Model
- Undoable actions: add segment and delete segment (the two user-facing drawing actions)
- Mechanism: snapshot-based — store array of segment-list states (simple, reliable)
- Keyboard shortcuts: Ctrl+Z / Cmd+Z for undo, Ctrl+Shift+Z / Cmd+Shift+Z for redo
- Max undo depth: 50 steps

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/useAppStore.ts` — Zustand store with viewport, photo, calibration; needs segments/history/selection state
- `src/utils/coordinates.ts` — screenToWorld/worldToScreen for coordinate transforms
- `src/types/index.ts` — Point, Viewport, ToolMode types; needs Segment, LineSegment, ArcSegment types
- `src/components/CanvasStage.tsx` — Konva Stage with click handling; needs to route clicks to drawing tool FSM
- `src/components/Toolbar.tsx` — floating toolbar; needs Line, Arc, Select buttons added

### Established Patterns
- Konva + react-konva layers for rendering
- Zustand with getState() for event handlers
- screenToWorld conversion for all click coordinates
- ToolMode state machine pattern (already has 'select', 'calibrate')

### Integration Points
- Drawing tools feed segments to Phase 4 DXF export
- Calibration pxPerMm ratio already computed — segments stored in world pixels, converted to mm at export
- setToolMode guard already blocks drawing tools when uncalibrated (Phase 2)

</code_context>

<specifics>
## Specific Ideas

- Research recommends: arcs must be normalized to counterclockwise (CCW) internally for DXF compatibility
- Three-point arc algorithm: compute circumcircle from 3 points, derive center, radius, start/end angles
- Arc direction ambiguity (short vs long arc): default to minor arc, user can toggle if needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
