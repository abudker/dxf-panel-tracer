# Roadmap: DXF Panel Tracer

## Overview

Build a client-side web app that lets a user upload a van interior photo, calibrate scale from a reference object in the image, trace the panel cutout shape using line and arc tools, and export a properly-scaled DXF file ready to open in Carbide Create. The four phases follow the hard dependency chain: the app must show the photo before calibration is possible, calibration must exist before drawing tools can store world-coordinate geometry, and drawing tools must be complete before a meaningful DXF can be exported.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Photo Display** - Project scaffold, coordinate math, document model, photo upload, pan/zoom
- [ ] **Phase 2: Scale Calibration** - Two-point calibration tool, visual ruler overlay, pre-draw warning
- [x] **Phase 3: Drawing Tools** - Line, arc, endpoint snap, select, delete, undo, redo (completed 2026-03-28)
- [ ] **Phase 4: DXF Export and Polish** - DXF export with LINE/ARC entities, closure warning, sensible filename

## Phase Details

### Phase 1: Foundation and Photo Display
**Goal**: User can upload a photo and navigate it as a tracing background, with the coordinate system fully established for downstream tools
**Depends on**: Nothing (first phase)
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03
**Success Criteria** (what must be TRUE):
  1. User can upload an image file from their computer and see it fill the canvas
  2. User can pan the canvas by clicking and dragging
  3. User can zoom in and out with the scroll wheel and the image stays anchored to the cursor position
  4. A high-resolution phone photo displays without orientation errors (EXIF rotation applied correctly)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold, types, Zustand store, coordinate utilities, app shell with toolbar
- [x] 01-02-PLAN.md — Photo upload with EXIF correction, Konva canvas with pan/zoom, drop-zone overlay

**UI hint**: yes

### Phase 2: Scale Calibration
**Goal**: User can set a real-world scale reference so that all subsequent geometry is stored and displayed in millimeters
**Depends on**: Phase 1
**Requirements**: PHOTO-04, PHOTO-05, PHOTO-06
**Success Criteria** (what must be TRUE):
  1. User can click two points on the photo and enter a real-world distance to set the scale
  2. A visual ruler overlay appears on the canvas after calibration, showing real-world units
  3. Attempting to draw before setting a scale reference triggers a visible warning
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Calibration types, Zustand slice, two-click interaction, modal dialog, toolbar button, toast warning
- [x] 02-02-PLAN.md — Ruler overlay with auto-scaling ticks, human verification of full calibration flow

**UI hint**: yes

### Phase 3: Drawing Tools
**Goal**: User can trace a panel shape over the photo using lines and arcs that connect into a closed path, with full edit and undo capability
**Depends on**: Phase 2
**Requirements**: DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06, DRAW-07
**Success Criteria** (what must be TRUE):
  1. User can place straight line segments by clicking start and end points over the photo
  2. User can place arc segments by clicking start point, end point, and a point on the arc
  3. Endpoints snap to nearby existing endpoints so segments connect without gaps
  4. User can click a segment to select it and press delete to remove it
  5. User can undo and redo individual drawing actions
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Types, geometry utilities, Zustand store extension with segments/undo/redo
- [x] 03-02-PLAN.md — DrawingLayer rendering, CanvasStage click routing, Toolbar buttons, keyboard shortcuts

**UI hint**: yes

### Phase 4: DXF Export and Polish
**Goal**: User can export the traced shape as a dimensionally accurate DXF file that opens cleanly in Carbide Create with no further cleanup
**Depends on**: Phase 3
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03
**Success Criteria** (what must be TRUE):
  1. User can trigger an export and receive a DXF file that downloads to their computer
  2. Opening the exported DXF in Carbide Create shows the shape at the correct real-world dimensions (a known calibration distance measures correctly)
  3. Arcs appear convex/concave in the correct direction and the path is not shown as open/magenta in Carbide Create
  4. User is warned before export if the traced shape is not closed
  5. The downloaded file has a sensible default name including the current date
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — TDD: Pure DXF export utility (buildDxfString, isShapeClosed, downloadDxf) with Vitest
- [ ] 04-02-PLAN.md — Export button in Toolbar, ClosureWarningModal, store wiring, human verification

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Photo Display | 2/2 | Planning complete | - |
| 2. Scale Calibration | 0/2 | Planning complete | - |
| 3. Drawing Tools | 2/2 | Complete   | 2026-03-28 |
| 4. DXF Export and Polish | 0/2 | Planning complete | - |
