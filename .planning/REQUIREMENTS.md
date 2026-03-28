# Requirements: DXF Panel Tracer

**Defined:** 2026-03-28
**Core Value:** Accurately trace and scale a photographed shape into a clean DXF file that can be cut on a CNC without further cleanup.

## v1 Requirements

### Drawing Tools

- [ ] **DRAW-01**: User can draw straight lines by clicking start and end points
- [ ] **DRAW-02**: User can draw arcs by clicking start point, end point, and a point on the arc
- [ ] **DRAW-03**: Endpoints snap to nearby existing endpoints within a threshold
- [ ] **DRAW-04**: User can select a segment by clicking it
- [ ] **DRAW-05**: User can delete a selected segment
- [ ] **DRAW-06**: User can undo the last action
- [ ] **DRAW-07**: User can redo an undone action

### Photo & Calibration

- [ ] **PHOTO-01**: User can upload a photo and display it as the canvas background
- [ ] **PHOTO-02**: User can pan the canvas by dragging
- [ ] **PHOTO-03**: User can zoom in/out with scroll wheel
- [ ] **PHOTO-04**: User can set scale by clicking two points and entering the real-world distance
- [ ] **PHOTO-05**: A visual ruler overlay shows real-world units after calibration
- [ ] **PHOTO-06**: User is warned if they attempt to draw before setting a scale reference

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
| DRAW-01 | — | Pending |
| DRAW-02 | — | Pending |
| DRAW-03 | — | Pending |
| DRAW-04 | — | Pending |
| DRAW-05 | — | Pending |
| DRAW-06 | — | Pending |
| DRAW-07 | — | Pending |
| PHOTO-01 | — | Pending |
| PHOTO-02 | — | Pending |
| PHOTO-03 | — | Pending |
| PHOTO-04 | — | Pending |
| PHOTO-05 | — | Pending |
| PHOTO-06 | — | Pending |
| EXPORT-01 | — | Pending |
| EXPORT-02 | — | Pending |
| EXPORT-03 | — | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16 ⚠️

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after initial definition*
