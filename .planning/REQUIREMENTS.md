# Requirements: DXF Panel Tracer

**Defined:** 2026-03-28
**Core Value:** Accurately trace and scale a photographed shape into a clean DXF file that can be cut on a CNC without further cleanup.

## v1 Requirements

### Drawing Tools

- [x] **DRAW-01**: User can draw straight lines by clicking start and end points
- [x] **DRAW-02**: User can draw arcs by clicking start point, end point, and a point on the arc
- [x] **DRAW-03**: Endpoints snap to nearby existing endpoints within a threshold
- [ ] **DRAW-04**: User can select a segment by clicking it
- [ ] **DRAW-05**: User can delete a selected segment
- [x] **DRAW-06**: User can undo the last action
- [x] **DRAW-07**: User can redo an undone action

### Photo & Calibration

- [x] **PHOTO-01**: User can upload a photo and display it as the canvas background
- [x] **PHOTO-02**: User can pan the canvas by dragging
- [x] **PHOTO-03**: User can zoom in/out with scroll wheel
- [x] **PHOTO-04**: User can set scale by clicking two points and entering the real-world distance
- [x] **PHOTO-05**: A visual ruler overlay shows real-world units after calibration
- [x] **PHOTO-06**: User is warned if they attempt to draw before setting a scale reference

### Export

- [ ] **EXPORT-01**: User can export traced shape as a DXF file with LINE and ARC entities at real-world dimensions
- [ ] **EXPORT-02**: User is warned if the shape is not closed before export
- [ ] **EXPORT-03**: Exported file has a sensible default filename (e.g., panel-trace-2026-03-28.dxf)

## v2 Requirements

### Drawing Enhancements

- **DRAW-08**: User can edit an existing segment's endpoints by dragging
- **DRAW-09**: User can see a live preview/ghost of the segment being drawn

### Photo Enhancements

- **PHOTO-07**: User can adjust photo opacity to see traced lines more clearly
- **PHOTO-08**: User can re-calibrate scale without losing existing geometry

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto edge detection / auto-trace | Unreliable on metal van interiors (reflections, shadows, recesses) |
| Splines / Bezier curves | Shapes are lines and arcs; splines produce non-LINE/ARC DXF entities |
| G-code generation | Shapeoko CAM software (Carbide Create/Motion) handles this |
| Tool offset / kerf compensation | Handled downstream in CAM software |
| User accounts / cloud storage | Single-user tool, no backend needed |
| Mobile-optimized tracing UI | Tracing requires precision mouse input on desktop |
| Multiple shape management | One shape per session; save DXF and start fresh |
| Dimension annotations in DXF | DXF is for cutting, not documentation |
| SVG or PDF export | Target is CNC software that wants DXF |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PHOTO-01 | Phase 1 | Complete |
| PHOTO-02 | Phase 1 | Complete |
| PHOTO-03 | Phase 1 | Complete |
| PHOTO-04 | Phase 2 | Complete |
| PHOTO-05 | Phase 2 | Complete |
| PHOTO-06 | Phase 2 | Complete |
| DRAW-01 | Phase 3 | Complete |
| DRAW-02 | Phase 3 | Complete |
| DRAW-03 | Phase 3 | Complete |
| DRAW-04 | Phase 3 | Pending |
| DRAW-05 | Phase 3 | Pending |
| DRAW-06 | Phase 3 | Complete |
| DRAW-07 | Phase 3 | Complete |
| EXPORT-01 | Phase 4 | Pending |
| EXPORT-02 | Phase 4 | Pending |
| EXPORT-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation*
