# Feature Landscape

**Domain:** Photo-to-DXF tracing web app for CNC panel fabrication
**Researched:** 2026-03-28
**Overall confidence:** HIGH — existing tools are well-documented; gap analysis is well-supported

---

## Does This Tool Already Exist?

**Short answer: Nothing matches this exact use case. Close things exist but have disqualifying limitations.**

The closest existing tools and why each falls short:

### ShapeScan (shapescan.pt) — CLOSEST MATCH
**What it does:** Web app. Photo a physical object on a printed ArUco marker sheet, AI auto-traces the outline, exports SVG and DXF. Processed server-side.
**Accuracy claimed:** ±0.5–1mm with good lighting
**Pricing:** Free
**Why it doesn't fully solve the problem:**
- Requires printing and placing the ArUco marker sheet with the object. The van panel stamping is a depression in a steel wall — you cannot lay a reference sheet flat around it. The "object" is the hole itself, not a removable piece.
- Designed for flat physical objects placed on a surface. A factory cutout in a curved metal van wall is not that.
- Auto-detection confirmed to struggle with "shiny metal or heavy shadow" — van interior metal panels are exactly this: shiny, recessed, lit from a single angle.
- No manual line/arc drawing tools. If auto-trace produces a bad edge, you're in a free-form contour editor, not snapping clean lines and arcs onto a dimensional shape.
- Output geometry is a traced outline (likely polylines or Bezier curves). The project needs clean LINE and ARC entities that Carbide Create handles cleanly.

### Logic Trace (logicgroup.com) — DESKTOP ONLY, CLOSEST WORKFLOW
**What it does:** Windows/Mac desktop software. Load a photo, set scale by clicking two points and entering a distance, trace manually using lines, arcs, curves. Export DXF, SVG, PDF.
**Why it doesn't fully solve the problem:**
- Desktop software, not a web app. Requires download, install, possibly purchase.
- Primarily marketed for apparel pattern digitizing and physical digitizing boards.
- Two-point scale reference IS supported — this is the workflow the project needs.
- The web app version of this workflow does not appear to exist as a standalone product.

### Carbide Create (Shapeoko's own CAM software)
**What it does:** Free desktop CAM software for Shapeoko. Supports background image import. Has a basic image tracing feature (version 5.20+).
**Why it doesn't solve the problem:**
- Background image scaling is a documented pain point: requires pre-scaling in Photoshop at 254 DPI, then importing. No two-point calibration. Community explicitly requested this feature and it hasn't been added.
- The tracing feature is monochrome threshold-based, not manual line/arc drawing.
- It's a full CAM application — the DXF file is the *input*, not the output.

### Scan2CAD
**What it does:** Desktop software. Raster-to-vector auto-conversion with manual cleanup tools.
**Why it doesn't solve the problem:**
- Desktop software, paid license.
- Optimized for clean technical drawings/scanned documents, not photos of metal surfaces.
- No two-point photo scale calibration from a reference object in a photo.

### Inkscape (free, desktop)
**What it does:** Vector drawing software. Can import images as background. Manual tracing with Pen tool. DXF export. Auto-trace via "Trace Bitmap."
**Why it doesn't solve the problem:**
- Full desktop application, steep learning curve for non-designers.
- Auto-trace (Trace Bitmap) does not work for photos of metal panels — confirmed: "good representations of actual photographs are not things you want to use vector graphics for."
- Manual tracing works but requires: knowing Inkscape, managing layers, dealing with DXF export that produces splines/Bezier curves instead of LINE and ARC entities.
- No built-in two-point scale reference from a photo — scaling requires a workaround via a reference line entity.

### Auto-conversion tools (Vectorizer.AI, AnyConv, Convertio, VectoSolve, etc.)
**What they do:** Upload JPG, receive DXF with auto-traced outlines.
**Why they don't solve the problem:**
- All rely on edge detection / auto-vectorization. Confirmed to produce poor results on photos (as opposed to clean logos or line drawings).
- No scale reference mechanism — output is not dimensioned.
- Output geometry is likely Bezier splines, not LINE/ARC entities.
- These are file format converters, not precision fabrication tools.

### Shaper Trace ($99 hardware kit)
**What it does:** Physical frame with ArUco markers. Photograph a *hand-drawn sketch* inside the frame. App converts to SVG.
**Why it doesn't solve the problem:**
- Designed for hand-drawn sketches, not photos of existing physical shapes.
- Outputs SVG only (no DXF confirmed).
- Requires printing or drawing the shape first — defeats the purpose.

### FreeCAD / LibreCAD
**What they do:** Full 2D/3D CAD applications. Support image import as background, manual drawing tools, DXF export.
**Why they don't solve the problem:**
- Full desktop CAD applications with significant complexity.
- Scaling an imported photo is non-trivial and underdocumented.
- Overkill for a single-purpose task.

---

## Conclusion: The Gap

**The specific workflow that does not exist as a web app:** Upload a photo, set real-world scale by clicking two points on the photo and typing a distance, then manually draw lines and arcs over the photo and export a properly-scaled DXF with LINE and ARC entities.

Logic Trace (desktop) is the only tool that does this workflow. No web app equivalent exists. ShapeScan comes close in spirit (photo + scale reference + DXF) but uses a fundamentally different mechanism (auto-detection with printed markers, not manual tracing with a reference measurement).

---

## Table Stakes

Features users expect. Missing = product feels broken or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Photo upload and display as canvas background | Core premise of the tool | Low | Must persist through pan/zoom without quality degradation |
| Two-point scale reference | The only reliable way to get dimensional accuracy from a phone photo | Medium | Click two known points, enter real-world distance; must compute and store px/mm ratio |
| Line drawing tool | All straight edges require this | Medium | Click-to-click endpoint; must snap to existing endpoints |
| Arc drawing tool | Rounded corners are common in van panel stampings | High | Most complex primitive — needs 3-point or center+radius+angles interface |
| Pan and zoom | Photo details are small; need to zoom to trace accurately | Medium | Pinch/scroll zoom + drag pan; canvas coordinates must remain stable |
| Connect segments into closed shape | An unclosed shape cannot be cut | Medium | Endpoint snapping so lines/arcs connect exactly |
| DXF export with LINE and ARC entities | The whole point — Shapeoko software needs clean DXF | Medium | Must use actual DXF LINE and ARC entities, not polylines or splines |
| Real-world dimensional accuracy | Scale calibration must produce correct cut dimensions | Medium | The scale px/mm ratio must be applied consistently to all exported geometry |

## Differentiators

Features not expected but valuable if present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Endpoint snap / snap to endpoint | Dramatically reduces closed-shape errors | Medium | Without snap, users leave tiny gaps; gaps break CNC toolpaths |
| Undo/redo history | Error recovery without starting over | Medium | Standard expectation but many simple tools omit it |
| Visual scale indicator (ruler overlay) | Builds confidence that scale is set correctly | Low | Show a ruler tick in real-world units overlaid on the photo |
| Zoom to region (scroll-wheel + cursor) | Precision tracing of small details requires this | Low | Standard web canvas behavior |
| Segment highlight / selection | Allow editing or deleting a specific segment | Medium | Important once there are 10+ segments |
| Segment list / shape preview | See what's in the shape without squinting at the canvas | Low | Simple list of "Line 1: (x1,y1)-(x2,y2)" |
| DXF validation before export | Warn if shape is not closed | Low | A single check: first point == last point within tolerance |
| Download with sensible filename | Small UX polish | Low | e.g., `panel-trace-2026-03-28.dxf` |

## Anti-Features

Features to explicitly NOT build — they add complexity and dilute focus.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto edge detection / auto-trace | Unreliable on metal van interiors (reflections, shadows, recesses, uneven light). Would require AI/computer vision backend, adds cost and complexity, and will produce wrong results in exactly the cases this tool is built for. | Manual tracing — slower but gives the user full control and predictable accuracy |
| Splines / Bezier curves | Shapes being traced are lines and arcs. Splines add a tool mode users must learn, produce curves that look like arcs but are not DXF ARC entities, and create cleanup work in CAM software. | Lines and arcs only — matches actual geometry, simpler tool, cleaner DXF |
| G-code generation | Shapeoko runs Carbide Create/Motion, which converts DXF to G-code. Adding G-code generation duplicates CAM software functionality without providing the toolpath control (feeds, speeds, depth passes) that CAM software provides. | Export DXF; let CAM software handle the rest |
| Tool offset / kerf compensation | Carbide Create/Motion handles this. The DXF should represent the design intent at nominal dimension. | Handled downstream in CAM software |
| User accounts / cloud storage | Single-user tool for a specific van build. Authentication adds complexity (backend, auth provider, sessions) with no benefit. | Keep it client-side; files live on the user's disk |
| Mobile-optimized tracing interface | Photos are taken on phone, but tracing requires precision pointing. Touch targets for line endpoints are too imprecise on small screens. Desktop mouse is the right input. | Optimize for desktop; photo transfer to desktop is already part of the workflow |
| Multiple shape management | Building a library of shapes adds project/file management UI. The immediate need is one shape at a time per session. | One shape per session; user saves the DXF, starts fresh for the next panel |
| Dimension annotations in DXF | The DXF is for cutting, not documentation. Dimension text clutters the toolpath file and must be manually deleted in CAM. | Clean geometry only; no annotations |
| SVG or PDF export | The target is CNC software that wants DXF. SVG and PDF add code and create files users might use in the wrong context. | DXF only; the user already has the photo for reference |

## Feature Dependencies

```
Photo upload
  └─ Scale reference (requires photo to be loaded first)
       └─ Drawing tools (px/mm ratio must be set before drawing has meaning)
            └─ Line tool
            └─ Arc tool
                 └─ Endpoint snapping (requires at least one segment to exist)
                 └─ Closed shape validation (requires 2+ segments forming a loop)
                      └─ DXF export (requires at least one closed or open shape)
```

Critical dependency: **The scale reference must be set before drawing begins.** If a user draws before setting scale, the DXF will be dimensionless pixels. UI should either enforce scale-first ordering or warn prominently if the user attempts to draw with no scale set.

## MVP Recommendation

Prioritize these features in Phase 1:

1. Photo upload and display as canvas background
2. Two-point scale reference (click-click, enter distance)
3. Line drawing tool with endpoint snap
4. Arc drawing tool (3-point: start, end, point-on-arc is the most intuitive for tracing)
5. Pan and zoom
6. DXF export as LINE and ARC entities at real-world scale

Defer to Phase 2 or later:
- Undo/redo (manual workaround: delete last segment)
- Segment selection and editing
- Visual scale/ruler overlay
- DXF closed-shape validation warning

**Rationale:** The six MVP features are the minimal set where the tool has value end-to-end: upload, calibrate, trace, export, cut. Undo is a quality-of-life feature but not a blocker — users can delete the last segment. The closed-shape validation is a safeguard but Carbide Create will complain if the path is open, providing its own feedback.

---

## Existing Sprinter Panel Resources (Context)

- Pre-made Sprinter van interior panel DXF files exist on Etsy for floors and some wall sections, primarily for wheelbase/drivetrain variants. None were found for the specific factory steel panel stamping profiles (the cutouts in the metal wall where clip-in inserts attach).
- Mercedes-Benz provides 2D technical drawings via their Upfitter Portal (mbvans.com), but these are body drawings for upfitter planning, not panel-edge profiles at the detail needed for CNC cutting.
- Physical paper template kits exist (Timber Van Kits, Master Overland) for cutting interior panels from scratch — these do not address tracing the factory steel cutout geometry.

**Conclusion:** The factory steel panel stamping profiles the user needs are not available digitally anywhere. The gap is real.

---

## Sources

- ShapeScan: https://shapescan.pt/ and https://shapescan.pt/blog/cnc
- Logic Trace: https://www.logicgroup.com/LogicTraceCncDxf.html
- Shaper Trace (Maker review): https://makezine.com/article/maker-news/shapers-trace-app-makes-vector-captures-easy/
- Carbide Create background image scaling thread: https://community.carbide3d.com/t/background-image-scaling-carbide-create/17059
- Scan2CAD review: https://www.bricsys.com/blog/scan2cad-review
- Inkscape trace bitmap documentation: https://inkscape-manuals.readthedocs.io/en/latest/tracing-an-image.html
- How to convert image for CNC (Scan2CAD): https://www.scan2cad.com/blog/tips/how-to-convert-an-image-for-cnc/
- Logic Trace (Arclight Dynamics listing): https://arclightcnc.com/product/logic-trace-cnc-dxf-digitizing-system/
- Shaper Trace product page: https://www.shapertools.com/en-us/trace
- Sprinter 144 DXF on Etsy: https://www.etsy.com/listing/1838799400/sprinter-144-floor-dxf-cad-2018-2025
- MB Upfitter 2D drawings: https://www.mbvans.com/en/upfitter/tech-info/drawings/2d
- dxfjs/writer JavaScript library: https://github.com/dxfjs/writer
- dxf-writer npm: https://www.npmjs.com/package/dxf-writer
- Konva.js canvas library: https://konvajs.org/
- Urban CNC Inkscape trace guide: https://urbancnc.com/trace-images-cnc-inkscape/
