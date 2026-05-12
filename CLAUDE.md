# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm start          # dev server at http://localhost:5173 (Vite, hot reload)
npm run build      # production bundle → docs/ (served as GitHub Pages)
```

No test suite or linter is configured.

## Architecture

The app is a single-page WebGL visualization. The entry point is `src/index.js`, which owns global state and wires all modules together. There are no frameworks — just vanilla JS modules bundled by Vite.

### Global state (`window.s`)

All modules share a single mutable global object `window.s`:

- `s.nodes` / `s.links` — the loaded network (nodes mutated in place each tick)
- `s.projection` — the current d3-geo projection function `[lon, lat] → [x, y]`
- `s.pixi` — the `pixi-viewport` Viewport instance (used to add child Graphics objects and convert screen → world coords)
- `s.canvas` — the raw HTMLCanvasElement

### Simulation pipeline (two-thread)

The force-directed layout runs entirely in a Web Worker (`src/js/simulation.worker.js`) to keep the main thread free for rendering:

1. Worker receives `init` with stripped node/link copies (no circular refs) and runs `d3-force-3d` in 3D space.
2. Custom `surfaceForce` projects nodes onto a sphere of radius `R = 15√N` and constrains velocity to the tangent plane. Each node gets `node.spherical = [lon, lat]` in degrees.
3. Custom `centroidForce` counteracts hemispheric drift from link forces.
4. Nodes start on a Fibonacci sphere for uniform seeding (`αDecay = 0.007` → slow ~20s cool-down).
5. On every tick, positions are packed into a `Float32Array` (5 floats/node: x, y, z, lon, lat) and **transferred** (zero-copy) back to the main thread via `postMessage`.
6. Main thread (`src/js/simulation.js`) unpacks positions into `s.nodes` and calls `drawLinks()` / `drawNodes()` / `drawGraticule()`.

After a drag-to-rotate, `syncPositions()` converts `node.spherical` back to Cartesian and sends a `setPositions` message so the worker resumes from the rotated state.

### Rendering (PixiJS v8 + d3-geo)

- `src/js/pixi.js` — initialises a PixiJS `Application` (WebGL, 2× resolution, `preserveDrawingBuffer` for PNG export) and a `pixi-viewport` Viewport. Drag is intentionally disabled on the viewport — sphere rotation hijacks it.
- `src/js/links.js` — draws links as great-circle geodesics. A `PixiGeoContext` adapter makes a PIXI `Graphics` object look like a Canvas 2D context so `d3.geoPath` can write into it. `beginPath()` flushes the previous path immediately to avoid PIXI v8's 65 535-vertex hard cap per batch.
- `src/js/nodes.js` — draws nodes as small circles via PIXI `Graphics`. Selected node gets a larger dot + ring; its neighbors get a medium dot; both in `HIGHLIGHT` red (`0xd62828`).
- `src/js/graticule.js` — draws the geographic grid using the same `d3.geoPath` + PixiGeoContext approach.
- `src/js/background.js` — clears the SVG layer with a solid background rectangle.

### Projections

`src/js/projection.js` **auto-discovers** every `geo*` function in `d3` and `d3-geo-projection` at startup by probing for `fitExtent()` and `scale()`. The resulting ~90 projections are sorted alphabetically into the `PROJECTIONS` map. `buildProjection(name)` fits the chosen projection to the window with a UI-aware margin (clearing the projection menu at top and the controls panel at bottom).

### Data / API

`src/js/fetcher.js` queries the [OpenAlex API](https://api.openalex.org) live:
- `searchTopics(query)` — autocomplete, returns up to 8 matching topics.
- `fetchNetwork(topic, onProgress)` — fetches up to 1 000 top-cited authors, then builds a co-authorship graph by batching works requests (25 authors/batch, 10 concurrent). Returns `{ nodes, links }` after trimming isolated nodes.

Results are cached in `localStorage` for one week (`src/js/cache.js`, key prefix `sp:`).

### Build output

Vite writes everything to `docs/` (the GitHub Pages source). `inlineDynamicImports: true` in `vite.config.js` forces a single `main.js` — this works around PixiJS v8 dynamic imports that would otherwise produce extra numbered chunks. The worker is emitted as a separate file in `docs/assets/`; its URL is rewritten automatically at build time.
