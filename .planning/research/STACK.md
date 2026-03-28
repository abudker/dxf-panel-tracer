# Technology Stack

**Project:** DXF Panel Tracer
**Researched:** 2026-03-28

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.2.4 | UI component model | Konva has official React bindings (react-konva); React 19's concurrent rendering avoids canvas jank during heavy user interaction |
| TypeScript | 6.0.2 | Type safety | Geometric math (coordinate transforms, scale factors, arc parameters) is where silent type errors cause hard-to-debug output; TS catches them at edit time |
| Vite | 8.x (latest) | Build tool | Standard choice for React/TS projects; `npm create vite@latest -- --template react-ts` bootstraps everything in one command |

**Confidence: HIGH** — all three are the canonical 2025/2026 frontend baseline. No credible alternative exists for this project size.

---

### Canvas Drawing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Konva.js | 10.2.3 | 2D canvas rendering and interactivity | Scene graph abstraction over raw Canvas 2D API; handles pointer events, hit testing, and layer management out of the box; actively maintained (877k weekly downloads, released 8 days before research date) |
| react-konva | 19.2.3 | React bindings for Konva | Official React integration; lets you express canvas elements as JSX, which keeps drawing state co-located with React state |
| use-image | 1.x (latest) | Load images into Konva | Official Konva-maintained hook; handles async image loading lifecycle (loading/loaded/failed) cleanly; avoids race conditions when displaying the photo background |

**Why Konva over Fabric.js:**
Fabric.js is designed for photo-editor-style object manipulation (drag, resize, filter). This project needs precise geometric drawing (click to place point, click to end segment) with no drag-to-resize handles on individual segments. Konva's scene graph is lighter and its event model is cleaner for custom interaction modes (line tool, arc tool, pan mode). Fabric.js SVG export is irrelevant since DXF output is the goal.

**Why Konva over raw Canvas 2D API:**
Hit testing, layer separation (background photo layer vs. drawing layer vs. UI overlay layer), and event delegation all require significant boilerplate with raw Canvas. Konva handles all of this and adds essentially zero overhead for a project of this scale.

**Why not Paper.js or Two.js:**
Paper.js is a solid vector library but React integration is unofficial/fragile. Two.js abstracts over canvas/SVG/WebGL — the abstraction adds complexity without benefit since we only need canvas output, never SVG.

**Confidence: HIGH** — Konva is the clear leader for interactive canvas drawing in React (1099 dependent packages on npm, official React bindings, active maintenance).

---

### DXF Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @tarikjabiri/dxf | 2.8.9 | Write DXF files in the browser | TypeScript-native; supports LINE and ARC entities explicitly (verified in docs); clean API: `dxf.addLine(point3d(x1,y1), point3d(x2,y2))` and `dxf.addArc(point3d(cx,cy), radius, startAngle, endAngle)`; 48 releases indicates sustained development |

**Why not dxf-writer:**
Version 1.18.4 was last published 3 years ago (circa 2021). Abandoned. Its API is simpler but the maintenance gap is a risk for a build-critical dependency.

**Why not Maker.js:**
Maker.js is a parametric-first library for constructing shapes programmatically. This project's output geometry is already defined by user-placed points — Maker.js adds unnecessary abstraction. It also has a heavy API surface (path boolean operations, layout algorithms) that is irrelevant here.

**Why not writing DXF manually (no library):**
DXF is a well-specified text format. Writing LINE and ARC entities manually is feasible (~50 lines of code). The main risk is getting the arc angle convention wrong (DXF arcs are counter-clockwise from start to end angle in the XY plane). Using @tarikjabiri/dxf delegates that specification detail to a tested library and reduces debugging surface area.

**Critical note on arc angles:** The browser Canvas 2D API and Konva measure angles clockwise from the positive X axis. The DXF ARC entity measures angles counter-clockwise from positive X axis. These conventions are opposite. The arc tool must convert between them explicitly when writing DXF output. @tarikjabiri/dxf accepts angles in the DXF convention, so the conversion belongs in the export layer, not the drawing layer.

**Confidence: MEDIUM** — @tarikjabiri/dxf is the best available option, but it has low download volume and the last npm publish was 2 years ago. If it has bugs with ARC entity output, the fallback is writing the DXF manually (the format is simple enough). Verify ARC output against a real CNC tool (Carbide Create) early in development.

---

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | 5.0.12 | Application state (drawing segments, scale calibration, tool mode) | No boilerplate; stores hold drawing state (array of line/arc segments, calibration points, current tool) without ceremony; component subscriptions are precise so canvas re-renders only when relevant state changes |

**Why not React Context + useState:**
Drawing state will be read by the Konva canvas layer, the toolbar, the export button, and scale calibration UI — all disparate subtree locations. Prop-drilling this through Context causes the entire subtree to re-render on every segment add. Zustand's selector-based subscriptions avoid this.

**Why not Redux Toolkit:**
Overkill. This app has one user, no server state, no async action chaining, no time-travel debugging need. Redux's DevTools are helpful but not worth the boilerplate tax.

**Confidence: HIGH** — Zustand 5 is the 2025 community standard for medium-complexity React apps.

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x (latest) | UI shell styling (toolbar, dialogs, file input) | The canvas itself is styled by Konva; Tailwind covers the thin HTML UI around it. v4 with `@tailwindcss/vite` plugin requires zero config file and works with `@import "tailwindcss"`. Perfect for a small-surface UI. |

**Why not CSS Modules or plain CSS:**
Fine alternatives. Tailwind is faster for one-off utility classes on toolbar buttons and modal overlays. The UI surface is small enough that either approach works, but Tailwind eliminates class-naming decisions.

**Confidence: HIGH** — Tailwind v4 + Vite is the documented standard setup as of 2025.

---

### File I/O

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native File API | (browser built-in) | Photo upload from disk | `<input type="file" accept="image/*">` + `URL.createObjectURL()` is the correct pattern for loading a local photo without a server round-trip. No library needed. |
| Native Blob + URL.createObjectURL | (browser built-in) | DXF file download | `new Blob([dxfString], { type: 'application/dxf' })` + programmatic anchor click is the standard client-side download pattern. No library needed. |

**Confidence: HIGH** — standard browser APIs, well-documented, no polyfill needed for desktop Chrome/Firefox/Safari targets.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Canvas library | Konva.js + react-konva | Fabric.js | Fabric designed for photo editors, not precision drawing tools; heavier; object-manipulation paradigm conflicts with segment-based drawing model |
| Canvas library | Konva.js + react-konva | Paper.js | No official React integration; angle/coordinate API not well-suited to the React mental model |
| Canvas library | Konva.js + react-konva | Raw Canvas 2D API | Eliminates hit testing, layering, event delegation — too much manual plumbing for marginal benefit |
| DXF library | @tarikjabiri/dxf | dxf-writer | Abandoned (3 years since last publish) |
| DXF library | @tarikjabiri/dxf | Manual DXF writing | Viable fallback but error-prone on arc angle conventions; @tarikjabiri/dxf is worth the dependency |
| State management | Zustand | Redux Toolkit | Boilerplate overhead unjustified for single-user local tool |
| State management | Zustand | React Context | Re-render scope too broad when drawing state changes frequently |
| Build tool | Vite | Next.js | No server needed; Next.js routing and SSR are pure overhead for a pure client-side tool |
| Build tool | Vite | Create React App | Deprecated; not recommended since 2023 |

---

## Installation

```bash
# Scaffold project
npm create vite@latest dxf-tracer -- --template react-ts
cd dxf-tracer

# Canvas
npm install konva react-konva use-image

# DXF generation
npm install @tarikjabiri/dxf

# State management
npm install zustand

# Styling (Tailwind v4 via Vite plugin)
npm install tailwindcss @tailwindcss/vite

# TypeScript (may already be installed by scaffold)
npm install -D typescript
```

In `vite.config.ts`, add the Tailwind plugin:
```typescript
import tailwindcss from '@tailwindcss/vite'
// add to plugins: [react(), tailwindcss()]
```

In `src/index.css`, replace contents with:
```css
@import "tailwindcss";
```

---

## Version Currency Note

Versions listed were current as of 2026-03-28 research date:
- React 19.2.4 (published ~2 months before research)
- Konva 10.2.3 (published ~8 days before research)
- react-konva 19.2.3 (published ~1 month before research)
- Zustand 5.0.12 (published ~12 days before research)
- TypeScript 6.0.2 (published ~4 days before research)
- Vite 8.x (published ~2 days before research)
- @tarikjabiri/dxf 2.8.9 (last published ~July 2023 — MEDIUM confidence)

Pin versions in `package.json` at project start. Re-evaluate @tarikjabiri/dxf if ARC entity output is incorrect in early testing.

---

## Sources

- [Konva.js npm](https://www.npmjs.com/package/konva) — version 10.2.3, 877k weekly downloads
- [react-konva npm](https://www.npmjs.com/package/react-konva) — version 19.2.3
- [use-image GitHub](https://github.com/konvajs/use-image) — official Konva React image hook
- [Konva pan/zoom docs](https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html)
- [Konva custom shapes](https://konvajs.org/docs/react/Custom_Shape.html)
- [dxfjs/writer GitHub](https://github.com/dxfjs/writer) — @tarikjabiri/dxf source
- [dxfjs entity docs](https://dxf.vercel.app/guide/entities.html) — LINE and ARC API verified
- [@tarikjabiri/dxf npm](https://www.npmjs.com/package/@tarikjabiri/dxf) — version 2.8.9
- [dxf-writer npm](https://www.npmjs.com/package/dxf-writer) — v1.18.4, last published 3 years ago
- [AutoCAD DXF ARC entity](https://help.autodesk.com/view/ACD/2022/ENU/?guid=GUID-0B14D8F1-0EBA-44BF-9108-57D8CE614BC8) — angle convention (CCW from +X axis)
- [Zustand npm](https://www.npmjs.com/package/zustand) — version 5.0.12
- [Vite 8 releases](https://vite.dev/releases) — version 8.x current
- [Tailwind CSS v4 + Vite](https://tailwindcss.com/blog/tailwindcss-v4) — @tailwindcss/vite plugin, no config file
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2) — version 19.2.4
- [TypeScript 5.9/6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/) — version 6.0.2
- [Konva.js vs Fabric.js comparison](https://dev.to/lico/react-comparison-of-js-canvas-libraries-konvajs-vs-fabricjs-1dan)
- [Zustand vs Redux 2025](https://www.meerako.com/blogs/react-state-management-zustand-vs-redux-vs-context-2025)
