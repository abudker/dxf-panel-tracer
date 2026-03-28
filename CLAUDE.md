<!-- GSD:project-start source:PROJECT.md -->
## Project

**DXF Panel Tracer**

A simple web app for tracing factory panel cutout shapes from photos of a sprinter van interior and exporting them as properly scaled DXF files. The user takes a phone photo of a van wall cutout with a size reference, traces the shape using line and arc tools, and exports a DXF ready for Shapeoko CNC software to cut plywood replacement panels.

**Core Value:** Accurately trace and scale a photographed shape into a clean DXF file that can be cut on a CNC without further cleanup.

### Constraints

- **Tech stack**: Simple web app — no heavy backend needed, this is a client-side tool
- **DXF format**: Output must be standard DXF with LINE and ARC entities (widely compatible with CNC software)
- **Scale accuracy**: Reference-based scaling must produce dimensionally accurate output (the whole point is cutting panels that fit)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.2.4 | UI component model | Konva has official React bindings (react-konva); React 19's concurrent rendering avoids canvas jank during heavy user interaction |
| TypeScript | 6.0.2 | Type safety | Geometric math (coordinate transforms, scale factors, arc parameters) is where silent type errors cause hard-to-debug output; TS catches them at edit time |
| Vite | 8.x (latest) | Build tool | Standard choice for React/TS projects; `npm create vite@latest -- --template react-ts` bootstraps everything in one command |
### Canvas Drawing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Konva.js | 10.2.3 | 2D canvas rendering and interactivity | Scene graph abstraction over raw Canvas 2D API; handles pointer events, hit testing, and layer management out of the box; actively maintained (877k weekly downloads, released 8 days before research date) |
| react-konva | 19.2.3 | React bindings for Konva | Official React integration; lets you express canvas elements as JSX, which keeps drawing state co-located with React state |
| use-image | 1.x (latest) | Load images into Konva | Official Konva-maintained hook; handles async image loading lifecycle (loading/loaded/failed) cleanly; avoids race conditions when displaying the photo background |
### DXF Generation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @tarikjabiri/dxf | 2.8.9 | Write DXF files in the browser | TypeScript-native; supports LINE and ARC entities explicitly (verified in docs); clean API: `dxf.addLine(point3d(x1,y1), point3d(x2,y2))` and `dxf.addArc(point3d(cx,cy), radius, startAngle, endAngle)`; 48 releases indicates sustained development |
### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | 5.0.12 | Application state (drawing segments, scale calibration, tool mode) | No boilerplate; stores hold drawing state (array of line/arc segments, calibration points, current tool) without ceremony; component subscriptions are precise so canvas re-renders only when relevant state changes |
### Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x (latest) | UI shell styling (toolbar, dialogs, file input) | The canvas itself is styled by Konva; Tailwind covers the thin HTML UI around it. v4 with `@tailwindcss/vite` plugin requires zero config file and works with `@import "tailwindcss"`. Perfect for a small-surface UI. |
### File I/O
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native File API | (browser built-in) | Photo upload from disk | `<input type="file" accept="image/*">` + `URL.createObjectURL()` is the correct pattern for loading a local photo without a server round-trip. No library needed. |
| Native Blob + URL.createObjectURL | (browser built-in) | DXF file download | `new Blob([dxfString], { type: 'application/dxf' })` + programmatic anchor click is the standard client-side download pattern. No library needed. |
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
## Installation
# Scaffold project
# Canvas
# DXF generation
# State management
# Styling (Tailwind v4 via Vite plugin)
# TypeScript (may already be installed by scaffold)
## Version Currency Note
- React 19.2.4 (published ~2 months before research)
- Konva 10.2.3 (published ~8 days before research)
- react-konva 19.2.3 (published ~1 month before research)
- Zustand 5.0.12 (published ~12 days before research)
- TypeScript 6.0.2 (published ~4 days before research)
- Vite 8.x (published ~2 days before research)
- @tarikjabiri/dxf 2.8.9 (last published ~July 2023 — MEDIUM confidence)
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
