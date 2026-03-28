# Project Research Summary

**Project:** DXF Panel Tracer
**Domain:** Browser-based photo-to-DXF tracing tool for CNC fabrication
**Researched:** 2026-03-28
**Confidence:** HIGH (stack, features, architecture, pitfalls all well-sourced)

## Executive Summary

The DXF Panel Tracer is a fully client-side, single-page web application that solves a real gap: no web app currently lets a user upload a photo, calibrate scale from a reference object in the photo, manually trace lines and arcs over it, and export a properly-scaled DXF with clean LINE and ARC entities. The closest existing tool — Logic Trace — is desktop-only software. ShapeScan is a web app in the same spirit but requires printed ArUco markers and uses auto-detection, which fails on shiny metal van interiors. This product is genuinely new in the web space.

The recommended approach is a React + TypeScript single-page app with Konva.js for canvas rendering, Zustand for state management, and @tarikjabiri/dxf for DXF generation. The architecture is a clean five-component model: Document Model (geometry store), Viewport State (pan/zoom transforms), Tool Controller (FSM for drawing modes), Render Engine (dual-canvas), and DXF Exporter (pure function). All geometry is stored in world coordinates (real-world units after calibration), which keeps the DXF exporter trivially simple and eliminates a class of coordinate-space bugs.

The most critical risks are all in the DXF export layer: Y-axis inversion (canvas Y-down vs DXF Y-up), arc angle convention mismatch (canvas clockwise vs DXF always-counterclockwise), missing `$INSUNITS` header (causes 25.4x scale error in Carbide Create), and unclosed shapes (magenta paths in Carbide Create that cannot receive toolpaths). All of these can be caught with a single end-to-end test: draw a known shape, export it, open it in Carbide Create, and measure a known dimension. This test should be the first integration milestone after the DXF exporter exists.

---

## Key Findings

### Recommended Stack

The stack is React 19 + TypeScript 6 + Vite 8 as the baseline — the canonical 2025/2026 frontend combination with no credible alternatives for a project of this scope. Konva.js (v10.2.3) with its official react-konva bindings is the correct canvas library: it provides scene graph abstraction, hit testing, layer management, and React JSX integration, none of which raw Canvas or alternative libraries (Fabric.js, Paper.js) offer cleanly for a precision drawing tool. Zustand 5 handles application state with selector-based subscriptions that prevent over-rendering when drawing state changes frequently. File I/O uses only native browser APIs — no library needed for upload or download.

The one MEDIUM-confidence dependency is @tarikjabiri/dxf: it is TypeScript-native, explicitly supports LINE and ARC entities, and has the cleanest API, but its npm activity is low and the last publish was July 2023. The fallback — writing DXF entities manually — is viable since DXF LINE and ARC entities are only ~10 lines each of group-code text. Validate @tarikjabiri/dxf ARC output against Carbide Create in the first week of development; if it has bugs, switch to manual DXF writing early.

**Core technologies:**
- React 19.2.4 + react-konva 19.2.3: canvas rendering in JSX — official React bindings, concurrent rendering reduces canvas jank
- TypeScript 6.0.2: type safety for geometric math — angle/coordinate errors caught at edit time, not at the CNC machine
- Konva.js 10.2.3: 2D canvas with hit testing and layering — eliminates hit-testing and event delegation boilerplate
- Zustand 5.0.12: application state — selector subscriptions prevent full-tree re-renders on every segment add
- @tarikjabiri/dxf 2.8.9: DXF LINE and ARC output — TypeScript-native, handles DXF angle convention; validate early
- Vite 8.x + Tailwind CSS 4.x: build and UI shell styling — zero-config setup, fast iteration
- Native File API + Blob: photo upload and DXF download — no library needed

### Expected Features

The tool must deliver six features to have any value at all; everything else is a quality-of-life enhancement. The dependency chain is strict: scale calibration requires a photo, drawing tools require a scale, DXF export requires geometry. The UI should enforce or strongly guide this order.

There is no desktop equivalent in the web space. Carbide Create users explicitly requested a two-point scale calibration feature years ago and it was never added. Every photo-to-DXF auto-conversion tool on the web fails for this use case (metal surfaces, physical recesses, angle-of-incidence variations). This tool competes only with Logic Trace (desktop) and the manual workflow of using Inkscape with workarounds.

**Must have (table stakes):**
- Photo upload displayed as canvas background — the entire tool premise depends on this
- Two-point scale reference (click two points, enter real-world distance) — without this, the DXF is dimensionless pixels
- Line drawing tool with endpoint snap — all straight edges; snap is mandatory to close shapes without gaps
- Arc drawing tool (3-point input: start, end, midpoint) — van panel stampings routinely have rounded corners
- Pan and zoom — phone photos are high-resolution; users must zoom to trace small details
- DXF export as LINE and ARC entities at real-world scale — the entire output; must open cleanly in Carbide Create

**Should have (differentiators):**
- Undo/redo (geometry-list based, not pixel snapshots) — essential for error recovery once shapes have 10+ segments
- Segment selection and delete — needed when a placed segment is wrong
- Visual scale/ruler overlay — builds user confidence that calibration is set correctly
- DXF closed-shape validation warning — warns before export if shape is not closed; Carbide Create will also warn, but earlier feedback is better
- Sensible export filename with date — small but polish matters

**Defer (v2+):**
- Auto edge detection / auto-trace — unreliable on metal van interiors; would require computer vision backend
- Splines/Bezier curves — lines and arcs cover all actual panel geometry; splines create non-DXF-clean output
- G-code generation — Carbide Create handles this; duplicating CAM is out of scope
- User accounts / cloud storage — single-user local tool; no backend needed
- Mobile-optimized tracing — precision drawing requires a mouse; defer entirely
- Multiple shape management per session — one shape per session is sufficient for the use case

### Architecture Approach

The architecture is a clean separation of five concerns around a shared Document Model that stores all geometry in world coordinates (real-world units post-calibration). The Viewport State module manages the screen-to-world coordinate transform as pure math with no DOM access. The Tool Controller implements FSMs for each drawing mode (line, arc, calibrate, pan) and is the only component that writes to the Document Model. The Render Engine uses two stacked canvas elements — one for the background photo (only redrawn on viewport change) and one for geometry and preview ghosts (redrawn on every mouse move). The DXF Exporter is a pure function that reads world-coordinate geometry and maps it directly to DXF entities. Build order follows data dependencies: coordinate math first, then document model, then rendering, then tool interactions, then export, then UI polish.

**Major components:**
1. Document Model — single source of truth for all geometry (line/arc segments), calibration record, and undo/redo stacks
2. Viewport State — pure math module for screen-to-world and world-to-screen transforms; pan/zoom state
3. Tool Controller — FSM for each tool mode; converts raw mouse events to document mutations; owns snap logic and ghost previews
4. Render Engine — dual-canvas rendering; background photo layer + drawing layer with ghost preview
5. DXF Exporter — pure function reads world-coordinate geometry, writes LINE/ARC DXF entities, handles Y-axis flip and angle conversion
6. UI Shell — thin React components for toolbar, dialogs, export trigger; holds no geometry state

### Critical Pitfalls

1. **Y-axis inversion on DXF export** — canvas Y increases downward; DXF Y increases upward. All exported coordinates and arc angles must be flipped. Formula: `dxf_y = drawingHeight - canvas_y`. Arc angles: `dxf_start = (360 - canvas_end_deg) % 360`. Write an arc-export unit test for each quadrant before touching any other export logic.

2. **DXF ARC always counterclockwise** — DXF has no clockwise arc entity. Internal arc representation must canonicalize to CCW (center + radius + start_angle + end_angle with CCW assumed) at the time the user commits the arc, not at export time. A CW canvas arc exported as two raw angles will produce the complementary arc (the "other" 300 degrees of the circle) in Carbide Create.

3. **Missing `$INSUNITS` header causes 25.4x scale error** — DXF coordinates are unitless; Carbide Create defaults to inches when `$INSUNITS` is absent. Set `$INSUNITS = 4` (millimeters) explicitly. Verify by importing the first generated DXF into Carbide Create and reading the dimension numerically.

4. **Unclosed shapes fail in Carbide Create** — floating-point gaps between the first and last point cause open paths (magenta in Carbide Create) that cannot receive Contour toolpaths. Implement endpoint snapping that copies first-point coordinates exactly when closing. Add a 0.001mm tolerance check in the DXF writer.

5. **Scale factor not uniformly applied** — if any code path uses raw pixel coordinates at export time, that entity will be off by the pixel-to-mm ratio (typically 5-20x). Store all geometry in world coordinates (real-world units) from the moment calibration is committed. The DXF exporter then reads world coordinates with no further conversion needed.

---

## Implications for Roadmap

Based on the architecture's "build inside-out" principle and the pitfall clustering by phase, the natural structure is eight phases mirroring the ARCHITECTURE.md build order, grouped into three logical milestones: Foundation (coordinate system + document model), Core Drawing Loop (rendering + tools), and Output (export + polish).

### Phase 1: Project Scaffold and Coordinate Foundation
**Rationale:** Every other component depends on the screen-to-world coordinate transform. This is pure math with no DOM dependencies and can be fully unit tested before any canvas code exists. Catching coordinate bugs early prevents rework across all subsequent phases.
**Delivers:** Vite + React + TypeScript + Konva + Zustand project scaffold. `screenToWorld`, `worldToScreen`, `applyPanDelta`, `applyZoom` as pure functions with unit tests. HiDPI canvas initialization (`devicePixelRatio` scaling) done correctly from the start.
**Addresses features:** Foundation for all features
**Avoids pitfalls:** Pitfall 7 (HiDPI coordinate mismatch), Pitfall 9 (pan/zoom inverse transform)

### Phase 2: Document Model and State
**Rationale:** The Render Engine and Tool Controller both depend on the Document Model's data structures. Getting the shape of the data right before anything renders or interacts prevents major refactors later.
**Delivers:** Zustand store with `segments` (Line and Arc records in world coordinates), `calibration`, `undoStack`, `redoStack`. `addSegment`, `removeSegment`, `setCalibration`, `undo`, `redo` operations.
**Addresses features:** Undo/redo foundation
**Avoids pitfalls:** Pitfall 12 (canvas pixel snapshots as undo — geometry-list undo from day one), Pitfall 1 and 3 (world coordinate storage eliminates per-export unit conversion)

### Phase 3: Photo Upload and Render Engine
**Rationale:** Validates the coordinate system end-to-end (photo appears at world origin, viewport transform moves it correctly) before tool interaction complicates debugging. EXIF orientation must be handled here, not retrofitted later.
**Delivers:** File input + `exifr` EXIF correction. Dual canvas (background photo layer + drawing layer). Pan with pointer drag. Zoom with scroll wheel. A hardcoded test segment renders correctly over the photo at all zoom/pan states.
**Addresses features:** Photo upload, pan and zoom
**Avoids pitfalls:** Pitfall 8 (EXIF orientation), Pitfall 10 (passive wheel listener), Pitfall 15 (stuck drag on mouseup outside canvas), Pitfall 2 anti-pattern (two-canvas separation)

### Phase 4: Scale Calibration Tool
**Rationale:** Drawing tools must know world units to store coordinates correctly. Calibration must be implemented before line/arc tools to ensure geometry is stored in real-world units from the first segment placed.
**Delivers:** Two-click calibration tool FSM. Scale dialog (enter real-world distance). Pixel span readout during calibration with a warning if the span is too short. `pixelsPerMM` ratio stored in document model.
**Addresses features:** Two-point scale reference
**Avoids pitfalls:** Pitfall 3 (scale factor uniformity), Pitfall 16 (short reference span error amplification)

### Phase 5: Line Drawing Tool
**Rationale:** The line tool is the simpler primitive (two clicks vs three). Getting one complete tool — FSM, ghost preview, endpoint snap, commit to document, undo — validates the entire Tool Controller pipeline before the more complex arc tool is added.
**Delivers:** Line tool FSM (idle → awaiting second point → commit). Ghost preview while dragging. Endpoint snap in screen-pixel space (8-12px threshold comparing screen positions). Keyboard shortcut to cancel (Escape). Undo/redo working.
**Addresses features:** Line drawing tool, endpoint snap, undo/redo
**Avoids pitfalls:** Pitfall 6 (unclosed shapes — snap copies exact coordinates), Pitfall 11 (snap in screen-space not world-space), Anti-pattern 5 (tool FSM in plain JS not React state)

### Phase 6: Arc Drawing Tool
**Rationale:** Arcs share the same Tool Controller infrastructure as lines but add the geometric complexity of computing center/radius/angles from three user-placed points. This geometric computation is the most error-prone part of the codebase and needs careful implementation.
**Delivers:** Three-click arc FSM (start point, end point, midpoint-on-arc). Circumcircle center computation from three points. Arc stored immediately as center/radius/startAngle/endAngle in CCW convention. Arc ghost preview. Arc connects to existing line endpoints via snap.
**Addresses features:** Arc drawing tool
**Avoids pitfalls:** Pitfall 2 (CCW arc normalization at commit time), Pitfall 14 (three-point major/minor arc ambiguity resolved at input)

### Phase 7: DXF Export
**Rationale:** With calibrated world-coordinate geometry in the Document Model, the exporter is a pure read. This is the riskiest phase for silent errors; multiple DXF-specific issues must be addressed simultaneously and verified against real CNC software before declaring it done.
**Delivers:** DXF export function using @tarikjabiri/dxf (fallback: manual DXF text). Y-axis flip applied to all coordinates and arc angles. `$INSUNITS = 4` (mm) in header. DXF version AC1015 (R2000). Bounding-box origin normalization (shape starts at 0,0). Closure validation (warn if first point != last point within 0.001mm). File download via Blob + anchor.
**Addresses features:** DXF export with LINE and ARC entities, real-world dimensional accuracy, DXF closed-shape validation
**Avoids pitfalls:** Pitfall 1 (Y-axis inversion), Pitfall 2 (CCW arc angles), Pitfall 3 (scale uniformity), Pitfall 5 ($INSUNITS), Pitfall 6 (closure check), Pitfall 13 (origin offset), Pitfall 17 (DXF format version)

**Critical milestone:** After this phase, open the exported DXF in Carbide Create and verify: (a) shape appears at origin, (b) a known dimension matches the entered calibration distance, (c) arcs are convex/concave in the correct direction, (d) the path is not magenta (closed).

### Phase 8: UI Shell Polish
**Rationale:** The app is functionally complete after Phase 7. This phase adds toolbar UX, user guidance, and quality-of-life features that make the tool trustworthy for real use.
**Delivers:** Toolbar with tool mode indicators. Status bar (cursor position in mm, segment count). Calibration guidance text ("photograph perpendicular to surface"). Visual ruler overlay. Sensible export filename with date. Segment selection and delete. Keyboard shortcuts.
**Addresses features:** Visual scale indicator, download with sensible filename, segment highlight/selection, user guidance for perspective distortion
**Avoids pitfalls:** Pitfall 4 (perspective distortion — UI guidance, not code)

---

### Phase Ordering Rationale

- Phases 1-2 build the mathematical and data foundation before any rendering. This allows unit testing coordinate transforms and document operations without a running browser.
- Phase 3 (rendering) comes before tools so that coordinate correctness is visually verifiable before interaction logic is layered on top.
- Phase 4 (calibration) comes before drawing tools so that every segment placed is in world coordinates from day one. Retrofitting calibration after drawing tools exist would require migrating stored coordinates.
- Phase 5 (line) before Phase 6 (arc) because lines are simpler; the arc tool reuses the validated Tool Controller infrastructure.
- Phase 7 (DXF export) after all tools are complete because the exporter requires complete, calibrated, world-coordinate geometry. Exporting partial geometry earlier would produce misleading test results.
- Phase 8 (polish) last because it adds no capability; it improves trustworthiness and usability.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Arc Tool):** The three-point circumcircle algorithm and correct arc direction determination (CW vs CCW from which side of the chord the midpoint falls) may need specific implementation research. The math is well-known but the browser-to-DXF angle conversion has subtle edge cases.
- **Phase 7 (DXF Export):** @tarikjabiri/dxf's specific API for setting `$INSUNITS` and DXF version needs verification against the library's actual docs before implementation. If the library lacks these header controls, the fallback (manual DXF text) requires understanding the DXF group-code format for the HEADER section.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Scaffold):** Vite + React + TypeScript + Konva setup is fully documented; `npm create vite@latest -- --template react-ts` + install commands in STACK.md are sufficient.
- **Phase 3 (Render Engine):** Two-canvas pan/zoom is a thoroughly documented pattern; sources in ARCHITECTURE.md cover it completely.
- **Phase 4 (Calibration):** Two-point scale calibration is straightforward Euclidean distance math; no research needed beyond what is already in the architecture doc.
- **Phase 5 (Line Tool):** FSM-based click-to-click line drawing is well-understood; no research needed.
- **Phase 8 (UI Shell):** Tailwind v4 + React component patterns are standard.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major libraries verified against npm and official docs; versions current as of research date |
| Features | HIGH | Gap analysis is well-supported; existing tools surveyed thoroughly; Carbide Create community confirms the unmet need |
| Architecture | HIGH | Core patterns (dual canvas, world coordinates, FSM tool controller) are established and sourced; library-specific Konva details are MEDIUM |
| Pitfalls | HIGH | DXF pitfalls verified against AutoCAD specification and Carbide Create community threads; browser pitfalls verified against web.dev and Chrome docs |

**Overall confidence:** HIGH

### Gaps to Address

- **@tarikjabiri/dxf ARC output correctness:** The library claims ARC support but low activity means it may have bugs. Validate against Carbide Create in Phase 7, Week 1. If broken, switch to manual DXF writing immediately (not at end of phase).
- **Arc direction determination in three-point arc:** The algorithm for determining which of the two possible arcs the user intended (major vs minor, CW vs CCW) needs a concrete implementation decision. The ARCHITECTURE.md describes the math; a unit test with a known asymmetric arc should be written before the arc tool UI is built.
- **Perspective distortion quantification:** Research confirms the problem exists but does not quantify it for typical van interior photography angles. If early user testing shows systematic shape errors, a future phase might add a four-point homography correction. Not needed for v1.
- **Konva vs raw Canvas 2D for this architecture:** The ARCHITECTURE.md describes a two-canvas raw Canvas 2D approach, while STACK.md recommends Konva/react-konva. These are compatible: Konva can be configured with explicit layers to replicate the two-canvas pattern, or react-konva layers can be used with Konva's built-in scene graph. The implementation choice should be made in Phase 1 and committed to before building the Render Engine.

---

## Sources

### Primary (HIGH confidence)
- [Konva.js docs](https://konvajs.org/docs/) — layer management, custom shapes, undo/redo patterns
- [react-konva npm](https://www.npmjs.com/package/react-konva) — version 19.2.3, official React bindings
- [dxfjs entity docs](https://dxf.vercel.app/guide/entities.html) — LINE and ARC API verified
- [AutoCAD DXF ARC entity spec](https://help.autodesk.com/view/ACD/2022/ENU/?guid=GUID-0B14D8F1-0EBA-44BF-9108-57D8CE614BC8) — CCW angle convention confirmed
- [DXF $INSUNITS spec](https://ezdxf.readthedocs.io/en/stable/concepts/units.html) — unit header values
- [web.dev canvas HiDPI](https://web.dev/articles/canvas-hidipi) — devicePixelRatio initialization
- [Canvas pan/zoom math](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming) — scale/offset coordinate model
- [Carbide Create DXF import issues](https://community.carbide3d.com/t/dxf-files-do-not-import-properly/58879) — real-world CNC import validation
- [Tailwind CSS v4 + Vite](https://tailwindcss.com/blog/tailwindcss-v4) — setup docs

### Secondary (MEDIUM confidence)
- [ShapeScan](https://shapescan.pt/) — competitive analysis; auto-detection limitations on metal surfaces
- [Logic Trace](https://www.logicgroup.com/LogicTraceCncDxf.html) — desktop equivalent workflow confirmed
- [Carbide Create background image thread](https://community.carbide3d.com/t/background-image-scaling-carbide-create/17059) — confirmed missing two-point scale feature
- [Zustand vs Redux 2025](https://www.meerako.com/blogs/react-state-management-zustand-vs-redux-vs-context-2025) — state management choice rationale
- [EXIF orientation and canvas](https://blog.carlojanea.com/tech/exif-orientation/) — EXIF pitfall confirmed

### Tertiary (LOW confidence)
- [@tarikjabiri/dxf 2.8.9](https://www.npmjs.com/package/@tarikjabiri/dxf) — ARC support claimed in docs but not independently verified against Carbide Create; validate early
- [Perspective distortion in single-camera measurement](https://www.qualitymag.com/articles/84252-handling-distortion-and-perspective-errors-in-imaging-systems) — error magnitude estimate (10-15% at 30 degrees) is from imaging systems literature, not van-specific

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
