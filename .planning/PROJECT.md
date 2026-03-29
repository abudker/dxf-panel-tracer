# DXF Panel Tracer

## What This Is

A client-side web app for tracing factory panel cutout shapes from photos of a sprinter van interior and exporting them as properly scaled DXF files. The user uploads a phone photo, calibrates scale with a two-point reference, traces the shape using line and arc tools with snapping and undo/redo, and exports a DXF that opens cleanly in Carbide Create for CNC cutting.

## Core Value

Accurately trace and scale a photographed shape into a clean DXF file that can be cut on a CNC without further cleanup.

## Requirements

### Validated

- ✓ Photo upload with EXIF correction and pan/zoom navigation — v1.0
- ✓ Two-point scale calibration with ruler overlay — v1.0
- ✓ Line drawing tool with endpoint snapping — v1.0
- ✓ Arc drawing tool (3-point: start, end, point-on-arc) — v1.0
- ✓ Segment selection and deletion — v1.0
- ✓ Undo/redo (snapshot-based, 50-step history) — v1.0
- ✓ Scale-first enforcement (tools disabled until calibrated) — v1.0
- ✓ DXF export with LINE and ARC entities, Y-flip, origin normalization, $INSUNITS — v1.0
- ✓ Closure warning before export — v1.0
- ✓ Date-stamped filename (panel-trace-YYYY-MM-DD.dxf) — v1.0

### Active

(None — next milestone TBD)

### Out of Scope

- Auto edge detection — unreliable with van interior photos (reflections, shadows, uneven lighting)
- G-code generation — Shapeoko software (Carbide Create/Motion) handles CAM
- Tool offset / material thickness — handled in CAM software
- User accounts / cloud storage — single user, local workflow
- Mobile-optimized UI — photos taken on phone but tracing done on desktop
- Spline/freeform curves — shapes are lines and arcs; splines add complexity without benefit

## Context

- Shipped v1.0 with ~2,290 LOC TypeScript/React
- Tech stack: Vite 8, React 19, TypeScript, Konva.js, Zustand, Tailwind v4
- 36 unit tests for DXF export math (Vitest)
- No existing tool fills this niche — confirmed by research (closest is Logic Trace, desktop-only for apparel)
- Deferred UAT: EXIF orientation, pointer-anchored zoom feel, arc direction in Carbide Create, dimensional accuracy in Carbide Create

## Constraints

- **Tech stack**: Client-side only — Vite + React + Konva + Zustand, no backend
- **DXF format**: Standard DXF with LINE and ARC entities, $INSUNITS header
- **Scale accuracy**: pxPerMm-based conversion must produce dimensionally accurate output

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manual tracing over auto edge detection | Photo conditions make auto-detection unreliable; manual gives user full control | ✓ Good |
| Lines and arcs only (no splines) | Matches actual shape geometry, cleaner DXF output, simpler tool | ✓ Good |
| Client-side web app | No backend needed — everything happens in the browser | ✓ Good |
| Konva.js + react-konva for canvas | Scene graph, hit testing, layer management built in | ✓ Good |
| Manual DXF writing over @tarikjabiri/dxf | Library stale (last publish July 2023); only need LINE and ARC entities | ✓ Good |
| HTML ruler overlay (not Konva layer) | Avoids inverse-scale complexity, simpler React mental model | ✓ Good |
| Snapshot-based undo/redo | Simple and reliable for single-shape tracing sessions | ✓ Good |
| 3-point arc tool (start, end, point-on-arc) | Most intuitive for tracing existing curves on photos | ✓ Good |

---
*Last updated: 2026-03-29 after v1.0 milestone*
