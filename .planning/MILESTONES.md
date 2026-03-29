# Milestones

## v1.0 MVP (Shipped: 2026-03-29)

**Phases completed:** 4 phases, 8 plans, 17 tasks

**Key accomplishments:**

- Vite + React + TypeScript scaffold with Zustand state, coordinate utilities, and a floating dark toolbar with Open Photo button — foundation for all subsequent plans
- Konva Stage with EXIF-corrected photo upload, pointer-anchored scroll zoom (10%-1000%), draggable pan, contain-fit initial view, and drag-and-drop empty state
- Two-click pxPerMm calibration with Konva dot/line visual feedback, distance modal, toast warning, and toolbar Calibrate button — fully wired into CanvasStage, Toolbar, and App
- Fixed-position HTML ruler overlay with pickNiceInterval auto-scaling ticks, labeled in calibration unit (mm or inches), scrolling with pan offset via viewport.x
- LineSegment/ArcSegment discriminated union, circumcircle geometry, snap utilities, and Zustand store extended with full segment lifecycle (add/delete/undo/redo FSM)
- Interactive drawing tools: DrawingLayer (segments + ghost preview + snap ring), useDrawingKeys hook, CanvasStage click/mousemove routing with snapping, and Toolbar Line/Arc/Select buttons with active state
- Export DXF button in Toolbar wired to Zustand triggerExport action with ClosureWarningModal for unclosed shape detection

---
