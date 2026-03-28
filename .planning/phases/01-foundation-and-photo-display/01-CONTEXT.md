# Phase 1: Foundation and Photo Display - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the app scaffold and photo display canvas. User can upload a phone photo, see it displayed correctly (EXIF-aware), and navigate it with pan and zoom. The coordinate system must be fully established for downstream calibration and drawing tools.

</domain>

<decisions>
## Implementation Decisions

### App Layout & Shell
- Full-viewport canvas with floating toolbar — maximizes tracing area
- Top-left floating overlay toolbar — out of the way, easy to reach
- Initial empty state shows a drop zone with "Upload a photo to start" prompt
- Dark UI (dark gray toolbar/bg) with light canvas — reduces eye strain when tracing over photos

### Canvas & Rendering
- Use Konva.js + react-konva for canvas rendering — scene graph, hit testing, layer management built in
- Single Konva Stage with Image layer + Drawing layer — Konva handles layering natively
- Use Konva's built-in pixelRatio support for HiDPI/Retina displays
- Zustand for state management — selector subscriptions prevent unnecessary canvas re-renders

### Photo Upload & Navigation
- Drag-and-drop on canvas + file picker button for upload
- Support JPG, PNG, WebP formats — covers all phone camera outputs
- Initial photo fit: contain (fit entire photo in viewport so user sees the whole panel first)
- Scroll wheel zoom anchored to cursor position, with min/max limits (10%-1000%)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing codebase

### Established Patterns
- None yet — this phase establishes the patterns (Vite + React + TypeScript + Konva + Zustand)

### Integration Points
- This phase creates the app shell that all subsequent phases build on

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Research recommends world-coordinate system from day one so all geometry is stored in world units, not pixels.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
