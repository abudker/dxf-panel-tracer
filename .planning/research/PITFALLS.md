# Domain Pitfalls: Photo-to-DXF Tracing Web App

**Domain:** Browser-based photo tracing with DXF export for CNC
**Researched:** 2026-03-28
**Confidence:** HIGH (most pitfalls verified against official DXF documentation, Carbide Create community, and browser platform specs)

---

## Critical Pitfalls

Mistakes that cause wrong output dimensions, broken CNC files, or full rewrites.

---

### Pitfall 1: Y-Axis Inversion Between Canvas and DXF

**What goes wrong:** Canvas (and all browser 2D graphics) places the origin at the top-left with Y increasing downward. DXF uses a standard Cartesian coordinate system with Y increasing upward. If you export canvas coordinates directly to DXF without flipping Y, every shape appears vertically mirrored. Arcs are the worst case: a rounded top-right corner becomes a rounded bottom-right corner, and the direction of the arc reverses.

**Why it happens:** Developers build the canvas coordinate system first and defer the "just negate Y on export" step, then forget the arc angle implications.

**Consequences:**
- All shapes appear vertically mirrored in CAD software
- Arc directions are wrong (a concave curve becomes convex)
- Arc start/end angles are wrong (even after negating Y on center, the angles themselves need adjustment — `dxf_angle = 360 - canvas_angle_degrees` or equivalently negate and normalize)
- CNC cuts the wrong shape

**Prevention:**
- Establish the coordinate transform at the very start of the DXF export pipeline, before writing any entity
- Formula: for a canvas point `(cx, cy)` with canvas height `H`, the DXF point is `(cx, H - cy)` — but `H` here must be the logical coordinate height (the drawing's bounding box), not the canvas pixel height
- For arc angles: canvas angles increase clockwise; DXF angles increase counterclockwise. Convert with `dxf_start = (360 - canvas_end_deg) % 360` and `dxf_end = (360 - canvas_start_deg) % 360`. Verify with a known asymmetric test case (e.g., a quarter arc in only the top-right quadrant)
- Write one arc-export unit test before building any other export logic

**Warning signs:**
- Symmetric shapes export correctly but look fine; asymmetric shapes or single arcs look wrong
- Arcs render correctly on canvas but are flipped/backwards when opened in AutoCAD or Carbide Create

**Phase:** Address in the DXF export phase, before any other entity type is exported.

---

### Pitfall 2: DXF ARC Angle Convention — Always Counterclockwise

**What goes wrong:** The DXF specification defines all arcs as counterclockwise from `start_angle` to `end_angle` around the extrusion vector `(0, 0, 1)` (the positive Z axis pointing toward the viewer). There is no "clockwise arc" entity in DXF. If you use canvas arc semantics (where `arc(x, y, r, startAngle, endAngle, anticlockwise)` has an explicit direction flag) and export angles without accounting for this, the arc direction will be wrong in some quadrants.

**Why it happens:** Canvas `arc()` accepts both CW and CCW arcs via a boolean parameter. DXF does not. A developer who models internal state as "canvas arcs" and then exports the two angle numbers directly will get a mirror of the intended arc whenever the canvas arc was drawn clockwise.

**Consequences:**
- Arc drawn as a CW curve on canvas becomes the complementary CCW arc in DXF (the "other" 300 degrees of the circle instead of the intended 60 degrees)
- CNC cuts the wrong curve, potentially destroying the workpiece

**Prevention:**
- Always normalize arc representation in internal state to a canonical form (e.g., always store center + radius + start_angle + end_angle with CCW assumed) at the moment the user finishes placing the arc, not at export time
- Before exporting, assert that `end_angle != start_angle` and that the arc sweeps less than 360 degrees (full circles should be CIRCLE entities, not ARC entities)
- Test: draw a 90-degree arc in each of the four quadrants; verify each exports and re-imports correctly

**Warning signs:**
- Arcs that look right on canvas but render as the "long way around" in CAD import
- An arc that sweeps ~60 degrees on canvas appearing as ~300 degrees in Carbide Create

**Phase:** Address during arc tool implementation; solidify in the DXF export phase.

---

### Pitfall 3: Scale Factor Applied Incorrectly — Pixel-to-mm Ratio Not Propagated Uniformly

**What goes wrong:** The user marks two calibration points and enters a real-world distance. The app computes a `pixelsPerMM` ratio. When exporting to DXF, every coordinate must be divided by `pixelsPerMM` to get real-world millimeters. If any code path uses raw pixel coordinates — even for a single endpoint — that entity will be off by the ratio factor (typically 5–20x for a typical phone photo).

**Why it happens:** The scale factor lives in app state. If drawing functions, arc math helpers, or the DXF export function each independently access coordinates, it is easy to forget the conversion in one of them. A partial refactor can also leave one entity type (e.g., arcs) unconverted while lines work correctly.

**Consequences:**
- CNC cuts a panel that is the wrong size — could be 5–20x too large or too small
- Error is not obvious in Carbide Create because the software scales the view; you have to check dimensions numerically

**Prevention:**
- Store all internal geometry in a single coordinate space (either always pixels OR always mm) and convert once at a well-defined boundary
- Recommended: store everything in pixel coordinates during tracing; convert to mm as the very first step inside the DXF writer function, applied to all coordinates through a single `toMM(x)` helper
- After export, always verify dimensions: open the DXF in a viewer and check that the scale reference distance matches the entered real-world value

**Warning signs:**
- Exported DXF dimensions are a large round-number multiple of the expected dimensions (e.g., 20x too large)
- Arc radii appear correct relative to each other but wrong in absolute mm

**Phase:** Address at the start of DXF export implementation; include a dimension-verify test with a known calibration.

---

### Pitfall 4: Perspective Distortion From Non-Perpendicular Photos

**What goes wrong:** A single-camera photo taken at an angle to the surface introduces perspective distortion. The reference object and the traced shape must be in the same plane AND the camera must be roughly perpendicular to that plane for a single scale factor to be valid. Van interior photos are often taken at an angle because the wall is vertical and the photographer is standing — the top of the panel is further from the camera than the bottom.

**Why it happens:** The reference-object calibration approach assumes a flat fronto-parallel image (camera axis perpendicular to the surface). If the camera is at 30 degrees off-axis, shapes near the reference object measure correctly but shapes farther away will be proportionally wrong. A 500mm-tall panel photographed at 30 degrees off-axis can have 10-15% dimensional error at the far end.

**Consequences:**
- Panel cuts with one end accurate and the other end off by 10–20mm
- Error is systematic (trapezoid distortion) not random, so it may not be obvious until physical fit-up

**Prevention:**
- In the UI, add explicit guidance: "photograph straight-on, perpendicular to the surface"
- Recommend placing the reference object at the center of the traced area, not the edge
- Document the limitation clearly: this tool assumes a fronto-parallel photograph; it does not correct for camera tilt
- For the van context: instruct the user to photograph from a ladder or stand so the camera is roughly level with the panel center

**Warning signs:**
- The traced shape appears slightly trapezoidal even though the physical panel edge is straight
- Opposite corners of a rectangular reference object are not equidistant from each other in the photo

**Phase:** Document in the UI as a requirement, not a feature to build. Include guidance text in the calibration step.

---

### Pitfall 5: DXF Unit Header ($INSUNITS) Not Set — CNC Software Defaults to Inches

**What goes wrong:** DXF coordinates are unitless numbers. The `$INSUNITS` header variable tells importing software what units to assume. If it is missing or set to `0` (unitless), Carbide Create and many other CNC CAM tools default to inches. A drawing in millimeters imported as inches will be 25.4x too large. This is a silent error: the geometry is correct but the scale is catastrophically wrong.

**Why it happens:** JavaScript DXF writer libraries often omit `$INSUNITS` from their generated output unless explicitly configured. The `dxf-writer` npm package and similar tools may not set it by default.

**Consequences:**
- A 400mm panel is interpreted as 400 inches (over 10 meters) in Carbide Create
- User must scale down by 25.4 manually — error-prone and frustrating
- If user works in inches, the converse is also true

**Prevention:**
- Always write `$INSUNITS` to the DXF header: value `4` for millimeters, `1` for inches
- Decide at project start: output in mm (most CNC work outside the US), and hard-code `$INSUNITS = 4`
- Verify by importing a generated test DXF into Carbide Create and checking the reported dimensions before any user testing

**Warning signs:**
- DXF opens in Carbide Create showing dimensions 25.4x larger or smaller than expected
- User has to manually rescale after import

**Phase:** Address in the DXF export phase, first DXF file generated. This is the first thing to verify after "does any DXF appear at all."

---

### Pitfall 6: Unclosed Shape — DXF Entities Do Not Form a Closed Contour

**What goes wrong:** Carbide Create requires a closed vector path to generate a Contour toolpath (and cannot generate a Pocket at all on an open path). If the traced shape's last endpoint does not exactly match the first endpoint, the imported DXF will appear as disconnected segments. Carbide Create marks open paths in magenta and refuses to assign cut operations to them.

**Why it happens:** Floating point: the first click of the shape is at pixel coordinate `(230.00001, 145.0)` and the last click snaps to `(230.0, 145.0)`. In DXF these are two different points 0.00001 units apart — not touching. Carbide Create's join-vectors tolerance may or may not bridge this gap automatically.

**Consequences:**
- User cannot assign a Contour toolpath in Carbide Create
- User must manually join vectors in Carbide Create, which is time-consuming and error-prone
- If the gap is too large (>0.1mm) the join may fail entirely

**Prevention:**
- Implement endpoint snapping in the drawing tool: when a new point is placed within N pixels of an existing point, snap it exactly to that point's coordinates
- Enforce closure: when the user explicitly closes the shape (clicks the first point), copy the first point's exact coordinates as the final endpoint of the last segment — do not use the snapped-but-slightly-different click position
- In the DXF writer, add a closure validation step: check that the last entity's end equals the first entity's start within 0.001mm tolerance; if not, log a warning

**Warning signs:**
- Imported DXF shows in magenta (open path) in Carbide Create
- "Join Vectors" command is needed after import
- Toolpath assignment fails with an error about open paths

**Phase:** Address during the drawing tool implementation (snapping/closure) and the DXF export phase (validation).

---

## Moderate Pitfalls

Issues that cause user frustration or require debugging but not full rewrites.

---

### Pitfall 7: Mouse Coordinates Wrong on HiDPI / Retina Displays

**What goes wrong:** HTML canvas has two dimensions: the CSS layout size (what the browser uses for layout) and the pixel buffer size (the actual drawing surface). On a Retina / HiDPI display with `window.devicePixelRatio = 2`, clicking at CSS pixel `(100, 100)` corresponds to canvas buffer pixel `(200, 200)`. If mouse coordinates are not scaled by `devicePixelRatio`, click positions are off by 2x — placing points nowhere near where the user clicked.

**Why it happens:** `canvas.getContext('2d')` coordinates are in canvas buffer pixels. Mouse event coordinates (`e.offsetX`, `e.clientX`) are in CSS pixels. These are identical on standard displays but diverge on HiDPI. A naive implementation works on a 1080p monitor and breaks on a MacBook.

**Consequences:**
- Points placed at half the distance from origin (visually correct appearance but wrong internal coordinates on HiDPI)
- Exported DXF is half the expected size on Retina machines
- Works correctly on a budget monitor but fails on the developer's own MacBook

**Prevention:**
- Initialize canvas: `canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.scale(dpr, dpr)` where `dpr = window.devicePixelRatio`
- Convert mouse events: `const x = (e.clientX - rect.left) * dpr / dpr` — or more explicitly, use `e.offsetX` after ensuring the canvas CSS size and buffer size relationship is consistent
- Simplest correct approach: work in CSS pixels for both the canvas logical coordinate space and mouse input; only apply `dpr` scaling to the canvas buffer, not to geometry

**Warning signs:**
- App works on external monitor, breaks on laptop
- Traced points appear in wrong positions on Retina display
- Scale calibration produces wrong pixelsPerMM on HiDPI displays

**Phase:** Address during initial canvas setup, before any drawing functionality.

---

### Pitfall 8: EXIF Orientation — Phone Photos Displayed Sideways or Upside-Down

**What goes wrong:** iPhones and many Android phones store photos in sensor-native orientation and record the physical orientation in EXIF metadata. When loaded into a browser `<img>` or drawn onto a canvas via `drawImage()`, older browsers and all direct canvas operations ignore EXIF orientation. A photo taken in portrait mode with the phone held normally may display rotated 90 degrees on canvas, making tracing impossible.

**Why it happens:** Modern browsers (Chrome 81+, Safari 13+, Firefox 77+) apply EXIF rotation to `<img>` elements via `image-orientation: from-image` CSS. But when an `<img>` is drawn to a canvas via `ctx.drawImage()`, the canvas receives the raw unrotated pixels, not the CSS-rotated display. This is a browser behavior inconsistency that catches developers off-guard.

**Consequences:**
- User traces a sideways photo and exports a DXF that is 90 degrees rotated
- User cannot trace at all on some photos
- Bug only appears with phone photos, not with photos taken on a camera that stores upright

**Prevention:**
- Use the `exifr` library (maintained, lightweight, works in browser) to read EXIF orientation from the uploaded file before drawing
- Apply a canvas rotation transform when drawing the image if orientation != 1
- Test with a portrait-mode photo taken on an iPhone and transferred over USB

**Warning signs:**
- Uploaded photo appears rotated on canvas
- Only happens with phone photos, not all images
- Works correctly when photo is viewed in Finder/Photos app but rotated in the web app

**Phase:** Address in the photo upload/display phase, before any drawing tools.

---

### Pitfall 9: Pan/Zoom State Not Applied to Mouse Coordinate Inverse Transform

**What goes wrong:** When the canvas is panned and zoomed, the visible coordinate space differs from the logical coordinate space. A click at screen position `(300, 400)` corresponds to logical coordinates `((300 - panX) / zoom, (400 - panY) / zoom)`. If the inverse transform is not applied when recording a point, points are recorded in screen space rather than logical space. The shape traces correctly at zoom=1 but diverges at any other zoom level.

**Why it happens:** It is easy to add pan/zoom as a post-render effect (translate/scale the canvas context) without updating the mouse handler. The visual looks correct because the canvas transform is applied to rendering, but the raw `e.offsetX` coordinates are still in screen space.

**Consequences:**
- At zoom level > 1, points appear to "drift" from where the user clicked relative to the photo
- Different zoom levels produce different traced paths for identical user clicks
- Scale calibration done at one zoom level is wrong at another

**Prevention:**
- Define a single `screenToWorld(x, y)` function that applies the inverse transform `(x - panX) / scale, (y - panY) / scale` and use it for every mouse event handler without exception
- Establish this function at the same time as the pan/zoom is implemented
- Unit test: record a point at zoom=1 and zoom=2; the resulting world coordinates should be identical for the same physical photo location

**Warning signs:**
- Traced points look correctly placed at default zoom but drift when zoomed in
- Closing a shape is difficult because the final click never quite snaps to the first point

**Phase:** Address during pan/zoom implementation.

---

### Pitfall 10: Wheel Event Passive Listener Conflict With Page Scroll

**What goes wrong:** Chrome and Firefox treat wheel events on canvas as passive by default (since Chrome 51). Calling `event.preventDefault()` inside a passive listener throws a console error and does nothing — the page scrolls instead of the canvas zooming. The canvas zoom handler is silently ignored.

**Why it happens:** Browsers made wheel listeners passive by default to improve scroll performance. Canvas-based drawing apps need to call `preventDefault()` to capture zoom gestures, but the default listener registration does not allow this.

**Consequences:**
- Scroll wheel causes the page to scroll instead of zooming the canvas
- User cannot zoom the photo for detail tracing
- Console shows "Unable to preventDefault inside passive event listener" — easy to miss

**Prevention:**
- Register the wheel event listener explicitly with `{ passive: false }`: `canvas.addEventListener('wheel', handler, { passive: false })`
- Call `event.preventDefault()` at the top of the wheel handler

**Warning signs:**
- Console warning "Unable to preventDefault inside passive event listener"
- Page scrolls when user tries to zoom the canvas

**Phase:** Address during pan/zoom implementation.

---

### Pitfall 11: Snapping Tolerance in Screen Space, Not World Space

**What goes wrong:** Endpoint snapping (snapping the current point to a nearby existing point) is almost always implemented as a pixel-distance threshold on screen coordinates: "snap if distance < 10 pixels." If the user is zoomed in 4x, 10 screen pixels is only 2.5 world pixels — snapping becomes difficult. If zoomed out 0.5x, 10 screen pixels is 20 world pixels — snapping becomes sloppy and connects points that should not connect.

**Why it happens:** Screen-space snap thresholds are intuitive to implement (compare raw mouse coordinates to stored point positions after transforming both to screen space), but they behave inconsistently across zoom levels.

**Consequences:**
- At high zoom, user cannot close the shape (snap never activates when they need fine control)
- At low zoom, shape accidentally snaps to wrong points
- Shape closure becomes unreliable depending on zoom level

**Prevention:**
- Implement snapping threshold in screen pixels but convert both the candidate point and stored points to screen space before comparison: `screenPos = worldToScreen(storedPoint); dist = distance(mouseScreen, screenPos)`
- This ensures snap behavior is consistent at all zoom levels (10px screen distance feels the same regardless of zoom)
- Snap threshold of 8–12 screen pixels is the conventional range across drawing tools

**Warning signs:**
- Snapping works at one zoom level but not others
- Shape is impossible to close unless user is at a specific zoom level

**Phase:** Address during drawing tool implementation.

---

### Pitfall 12: Undo History Stored as Canvas Pixel Snapshots

**What goes wrong:** A common naive undo implementation stores the canvas as `toDataURL()` or `ImageData` snapshots after each operation. Each snapshot is several megabytes for a large canvas. With 20–30 undo steps, memory usage exceeds 100MB, causing slowdowns or browser tab crashes. Additionally, pixel snapshots cannot be re-exported to DXF (the geometric data is lost).

**Why it happens:** `saveImageData()`/`restoreImageData()` is the simplest path to "make undo work" but it conflates rendering state with application state.

**Consequences:**
- Memory consumption grows unbounded with use
- Cannot re-export DXF from a restored state (no geometry, only pixels)
- Undo of a zoom/pan operation forces re-rendering at wrong scale

**Prevention:**
- Store undo history as an array of geometry state snapshots: the list of line segments and arcs (lightweight JSON-like objects), not pixel buffers
- Undo = pop the last geometry snapshot and re-render everything from scratch
- Re-rendering from geometry is fast for the number of segments this app will have (tens to low hundreds)

**Warning signs:**
- Tab memory usage visible in Chrome Task Manager growing linearly with operations
- Restoring undo state does not allow re-export to DXF

**Phase:** Address at the start of drawing tool state management, before undo is implemented.

---

### Pitfall 13: DXF Entities Outside the Drawing Origin — CNC Origin Offset Problems

**What goes wrong:** The user traces a shape in pixel coordinates starting from, say, pixel `(400, 300)`. After scale conversion this becomes mm coordinates `(100, 75)`. In Carbide Create, the DXF is imported with its origin at the DXF coordinate `(0, 0)`. The shape appears offset 100mm right and 75mm up from the stock origin. The user then has to manually reposition the part on the stock, which is error-prone.

**Why it happens:** There is no normalization step that moves the traced shape to start at `(0, 0)` in DXF space. The DXF coordinates directly reflect where on the photo the shape was drawn.

**Consequences:**
- User must manually drag/reposition the part in Carbide Create before generating toolpaths
- The repositioning adds a manual error opportunity
- CNC cuts in the wrong location if the user forgets to reposition

**Prevention:**
- In the DXF export step, compute the bounding box of all entities and subtract the minimum corner: translate all coordinates by `(-minX, -minY)` so the shape starts at `(0, 0)` in DXF space
- This is a single-line offset applied during export, not requiring any change to internal geometry

**Warning signs:**
- Imported DXF appears far from origin in Carbide Create
- User has to drag the shape to the stock corner after every import

**Phase:** Address in the DXF export phase.

---

## Minor Pitfalls

Issues that are annoying but straightforward to fix once identified.

---

### Pitfall 14: Arc Represented as Three Points Internally — Major/Minor Arc Ambiguity

**What goes wrong:** If the internal arc representation stores "start point, control point, end point" (a three-point arc), there is an inherent ambiguity: the three points define a circle, but two arcs exist on that circle. When converting to DXF (which requires center + radius + start_angle + end_angle), the wrong arc may be selected if the algorithm always picks the minor arc or always picks the CCW arc.

**Prevention:**
- Internally, represent arcs as center + radius + start_angle + end_angle + direction from the moment the user finishes drawing the arc — not as three points
- If using a three-point input UI, convert to center/radius/angles at input-time, not export-time

**Phase:** Address during arc tool design.

---

### Pitfall 15: Mouse "Stuck Drag" When Pointer Leaves Canvas

**What goes wrong:** If the user presses the mouse button inside the canvas, drags outside the canvas, and releases the button, the `mouseup` event fires on the document (not on the canvas). The canvas event handler never sees the `mouseup`, leaving the app in a permanent "mouse is down" state. Subsequent mouse moves pan or place points unintentionally.

**Prevention:**
- Register `mouseup` on `document` (not the canvas): `document.addEventListener('mouseup', handleMouseUp)`
- Alternatively, use `setPointerCapture()` on the canvas for drag operations

**Phase:** Address during pan/zoom and drawing tool implementation.

---

### Pitfall 16: Reference Calibration Points at Photo Edges — Click Precision Error Amplified

**What goes wrong:** The accuracy of the scale factor depends on how many pixels span the reference object. A reference object that spans 50 pixels gives a `pixelsPerMM` ratio with 2% error for each 1-pixel click imprecision. The same object spanning 500 pixels reduces that error to 0.2%. Users tend to place reference objects small or near image edges where they think it will not interfere with the tracing.

**Prevention:**
- In the calibration UI, show a live readout of the pixel span between the two calibration points
- Warn the user if the span is less than, say, 100 pixels: "For better accuracy, use a larger reference or zoom in before calibrating"
- Recommend placing the reference object in the center of the tracing area and spanning at least 20% of the image width

**Phase:** Address during calibration UI implementation.

---

### Pitfall 17: DXF Format Version — Default to AC1015 (R2000) Not R12

**What goes wrong:** Some JavaScript DXF writers default to R12 (AC1009) which is maximally compatible but has limitations. R12 does not support certain header variables that Carbide Create relies on. Conversely, very new DXF versions (R2018+) may not parse correctly in older CNC CAM software.

**Prevention:**
- Target AC1015 (R2000) as the output DXF version: broadly supported by all CNC software including Carbide Create, and supports the necessary `$INSUNITS` and `$EXTMIN`/`$EXTMAX` header variables
- Verify by importing a test file into Carbide Create immediately

**Phase:** Address in the DXF export phase during initial setup.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Canvas setup | HiDPI coordinate mismatch (Pitfall 7) | Set up `devicePixelRatio` scaling before any drawing code |
| Photo upload/display | EXIF orientation (Pitfall 8) | Use `exifr` library; test with iPhone portrait photo |
| Scale calibration UI | Click precision / short reference (Pitfall 16) | Show pixel-span readout; warn if too short |
| Pan/zoom implementation | Passive wheel listener (Pitfall 10), mouse coordinate inverse transform (Pitfall 9), stuck drag (Pitfall 15) | All three must be addressed together |
| Arc tool | Three-point ambiguity (Pitfall 14), CCW convention (Pitfall 2) | Use center/radius/angle representation from the start |
| Drawing tool (closure/snapping) | Unclosed shape (Pitfall 6), screen-space snap (Pitfall 11) | Snap in screen space; copy first point exactly on close |
| Undo history | Memory explosion (Pitfall 12) | Geometry-list undo from day one |
| DXF export — first version | Y-axis flip (Pitfall 1), INSUNITS missing (Pitfall 5), scale factor not uniform (Pitfall 3), origin offset (Pitfall 13), format version (Pitfall 17) | Write one DXF, open it in Carbide Create, measure a known distance |
| DXF export — arc entities | CCW angle convention (Pitfall 2), Y-axis angle conversion (Pitfall 1) | Test each quadrant with a known arc |
| User acceptance | Perspective distortion (Pitfall 4) | Document photo requirements; not a software fix |

---

## Sources

- AutoCAD DXF ARC entity specification: [documentation.help/AutoCAD-DXF](https://documentation.help/AutoCAD-DXF/WS1a9193826455f5ff18cb41610ec0a2e719-7a35.htm)
- DXF arc angle correction bug analysis: [dxf2gcode ticket #117](https://sourceforge.net/p/dxf2gcode/tickets/117/)
- Carbide Create DXF import issues community thread: [community.carbide3d.com](https://community.carbide3d.com/t/dxf-files-do-not-import-properly/58879)
- Carbide Create DXF unit problems: [community.carbide3d.com INSUNITS](https://community.carbide3d.com/t/carbide-create-dxf-import-units/39828)
- DXF $INSUNITS specification: [ezdxf units documentation](https://ezdxf.readthedocs.io/en/stable/concepts/units.html)
- HiDPI canvas handling: [web.dev canvas HiDPI](https://web.dev/articles/canvas-hidipi)
- Mouse coordinate transform on HiDPI: [roblouie.com](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/)
- Canvas wheel passive listener issue: [Chrome Developers blog](https://developer.chrome.com/blog/scrolling-intervention-2)
- Stuck mouseup outside canvas: [tutorialpedia.org](https://www.tutorialpedia.org/blog/how-to-catch-mouse-up-event-outside-of-element/)
- EXIF orientation and canvas: [blog.carlojanea.com](https://blog.carlojanea.com/tech/exif-orientation/)
- Perspective distortion in single-camera measurement: [qualitymag.com](https://www.qualitymag.com/articles/84252-handling-distortion-and-perspective-errors-in-imaging-systems)
- Scale calibration click precision: [serc.carleton.edu](https://serc.carleton.edu/earth_analysis/image_analysis/introduction/day_3_part_1.html)
- DXF origin offset in CNC imports: [github.com/Snapmaker/Luban issue #313](https://github.com/Snapmaker/Luban/issues/313)
- DXF format version for CNC: [bococustom.com CNC DXF preparation](https://bococustom.com/blogs/news/precision-fabrication-essential-steps-for-preparing-dxf-files-for-cnc-cutting)
