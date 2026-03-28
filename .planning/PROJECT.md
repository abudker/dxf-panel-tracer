# DXF Panel Tracer

## What This Is

A simple web app for tracing factory panel cutout shapes from photos of a sprinter van interior and exporting them as properly scaled DXF files. The user takes a phone photo of a van wall cutout with a size reference, traces the shape using line and arc tools, and exports a DXF ready for Shapeoko CNC software to cut plywood replacement panels.

## Core Value

Accurately trace and scale a photographed shape into a clean DXF file that can be cut on a CNC without further cleanup.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can upload a photo from their phone and display it as a tracing background
- [ ] User can set a scale reference by marking two points on the photo and entering the real-world distance
- [ ] User can draw straight lines over the photo to trace edges
- [ ] User can draw arcs over the photo to trace curves and rounded corners
- [ ] User can connect line and arc segments into a closed shape
- [ ] User can pan and zoom the photo for detail work
- [ ] User can export the traced shape as a DXF file at real-world dimensions
- [ ] DXF output uses lines and arcs (entities the Shapeoko software handles cleanly)

### Out of Scope

- Auto edge detection — unreliable with van interior photos (reflections, shadows, uneven lighting); manual tracing is more dependable
- G-code generation — Shapeoko software (Carbide Create/Motion) handles CAM
- Tool offset / material thickness — handled in CAM software
- User accounts / cloud storage — single user, local workflow
- Mobile-optimized UI — photos taken on phone but tracing done on desktop
- Spline/freeform curves — shapes are lines and arcs; splines add complexity without benefit for these geometries

## Context

- The user is building out a sprinter van and has a 4'x4' Shapeoko CNC
- Factory van panels have shaped cutouts in the steel where wall panel inserts clip in
- No good DXF files exist online for these stamping profiles
- Current workflow gap: no easy way to go from "photo of a shape" to "CNC-ready file"
- Photos will be taken on a phone and transferred to a desktop computer for tracing
- A known-size reference object (ruler, tape measure, known-dimension square) will be placed in each photo for scaling

## Constraints

- **Tech stack**: Simple web app — no heavy backend needed, this is a client-side tool
- **DXF format**: Output must be standard DXF with LINE and ARC entities (widely compatible with CNC software)
- **Scale accuracy**: Reference-based scaling must produce dimensionally accurate output (the whole point is cutting panels that fit)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manual tracing over auto edge detection | Photo conditions (reflections, shadows, metal surfaces) make auto-detection unreliable; manual gives user full control | — Pending |
| Lines and arcs only (no splines) | Matches actual shape geometry, cleaner DXF output, simpler tool | — Pending |
| Client-side web app | No backend needed — photo upload, tracing, and DXF export can all happen in the browser | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after initialization*
