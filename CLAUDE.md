# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm start          # dev server at http://localhost:8000 (Vite, hot reload)
npm run build      # production bundle → dist/ (gitignored; CI publishes it)
```

No test suite or linter is configured.

## Architecture

The app is a single-page WebGL visualization. The entry point is `src/index.js`, which owns global state and wires all modules together. There are no frameworks — just vanilla JS modules bundled by Vite.

Modules are split by role: `src/core/` holds non-visual logic (simulation, projection maths, data fetching, caching, selection state, export), `src/render/` holds everything that draws to a canvas.

### Global state (`window.s`)

All modules share a single mutable global object `window.s`:

- `s.nodes` / `s.links` — the loaded network (nodes mutated in place each tick)
- `s.projection` — the current d3-geo projection function `[lon, lat] → [x, y]`
- `s.pixi` — the `pixi-viewport` Viewport instance (used to add child Graphics objects and convert screen → world coords)
- `s.canvas` — the raw HTMLCanvasElement

### Simulation pipeline (two-thread)

The force-directed layout runs entirely in a Web Worker (`src/core/simulation.worker.js`) to keep the main thread free for rendering:

1. Worker receives `init` with stripped node/link copies (no circular refs) and runs `d3-force-3d` in 3D space.
2. Custom `surfaceForce` projects nodes onto a sphere of radius `R = 15√N` and constrains velocity to the tangent plane. It works purely in Cartesian x/y/z — `node.spherical = [lon, lat]` (degrees) is derived on the main thread instead, see step 5.
3. Custom `centroidForce` counteracts hemispheric drift from link forces.
4. Nodes start on a Fibonacci sphere for uniform seeding (`αDecay = 0.0035` → ~2 000 ticks to cool below `alphaMin`, about 30s at the worker's measured ~15.6ms/tick, see below).
5. On every tick, positions are packed into a `Float32Array` (3 floats/node: x, y, z) and **transferred** (zero-copy) back to the main thread via `postMessage`. lon/lat is deliberately *not* shipped: the main thread interpolates between two ticks in Cartesian space and derives `node.spherical` from the blended xyz, so anything the worker computed would be discarded.
6. **d3-force's own animation timer is never used.** `sim.stop()` is called immediately after construction; every step from then on is driven by `runLoop()`, a manual `sim.tick()` + `emitTick()` self-rescheduled via zero-delay `setTimeout`. This exists because d3-timer's fallback for environments without `requestAnimationFrame` (every Worker) is a hardcoded `setTimeout(f, 17)` applied *after* each step completes regardless of how fast that step actually ran — measured, that capped this network at ~30 ticks/s despite each step costing only ~8ms of real compute. Stepping manually removed the floor (measured mean interval ~30ms → ~15.6ms). `runLoop()` also owns the alphaMin stop-check that d3-force's own ticker would otherwise handle.
7. Ticks land at whatever rate the worker's loop achieves, not vsync-locked and not always faster than the display refresh. Rather than draw on message arrival, `src/core/simulation.js` keeps the last two received ticks and interpolates node positions between them on every `requestAnimationFrame` callback, then calls `drawLinks()` / `drawNodes()` — so the sphere animates at the display's full rate regardless of the worker's tick cadence. `drawGraticule()` is not part of this loop — see Rendering below.

After a drag-to-rotate, `syncPositions()` converts `node.spherical` back to Cartesian and sends a `setPositions` message so the worker resumes from the rotated state. This happens whenever the drag actually rotated, even with the simulation paused or cooled — otherwise the next Resume / Add time / Restart would snap back to the worker's pre-drag layout. `syncPositions()` also drops both interpolation buffers so the next tick starts flat from the rotated positions instead of blending through the old ones.

**Tick epochs.** Ticks the worker posted before it handled a `pause` or `setPositions` are still in flight when those calls return. Every main→worker message carries an `epoch`, the worker stamps each tick with the last epoch it saw, and `pause()` / `syncPositions()` bump it — so the main thread drops any tick older than its current epoch. Without this, a stale tick resets `lastAlpha` after a pause (`isRunning()` reads true while the worker is idle) or paints the pre-drag layout over a rotation. The Pause/Resume button label is driven by `onRunningChange()`, which fires whenever `isRunning()` flips — controls, a new network, or the simulation cooling down on its own.

### Rendering (PixiJS v8 + d3-geo)

- `src/render/pixi.js` — initialises a PixiJS `Application` (WebGL, resolution matched to `window.devicePixelRatio` and capped at 3× to avoid pixelated thin link strokes without blowing up fill cost on unusually dense displays, `preserveDrawingBuffer` for canvas readback) and a `pixi-viewport` Viewport. Drag is intentionally disabled on the viewport — sphere rotation hijacks it.
- `src/render/geoContext.js` — `PixiGeoContext`, shared by `links.js` and `graticule.js`: makes a PIXI `Graphics` object look like a Canvas 2D context so `d3.geoPath` can write into it. d3.geoPath does not call `beginPath()` between top-level geometries, so it tracks the accumulated point count itself and flushes (`stroke()`) whenever a new subpath is about to start with the running total past its threshold — keeping every draw within PIXI v8's ~65 535-vertex hard cap regardless of network size, without ever splitting a single link's arc mid-curve.
- `src/render/links.js` — draws links as great-circle geodesics through `PixiGeoContext`.
- `src/render/nodes.js` — draws nodes as small circles via PIXI `Graphics`. Selected node gets a larger dot + ring; its neighbors get a medium dot; both in `HIGHLIGHT` red (`0xd62828`).
- `src/render/graticule.js` — draws the geographic grid using the same `d3.geoPath` + PixiGeoContext approach. Deliberately outside the per-tick animation loop: the grid depends only on the projection, never on node positions, so `drawGraticule()` is called explicitly wherever the projection changes or visibility toggles (`selectProjection()`, `relayout()`, `setGraticuleVisible()`, `loadNetwork()`) rather than every frame — measured at ~0.75ms/call, that would otherwise cost ~4.5% of the 16.6ms/60fps frame budget for a grid that never changes between ticks.
- `src/render/background.js` — fills the separate `canvas#background` (a plain 2D canvas sitting behind the PixiJS one) with solid white.

### Projections

`src/core/projection.js` **auto-discovers** every `geo*` function in `d3` and `d3-geo-projection` at startup by probing for `fitExtent()` and `scale()`. The resulting ~90 projections are sorted alphabetically into the `PROJECTIONS` map. `buildProjection(name)` fits the chosen projection to the window with a UI-aware margin (clearing the projection menu at top and the controls panel at bottom), and coarsens `.precision()` to 2px — d3.geoPath's default resamples great-circle links far finer than their 0.2–0.6px stroke width can show, and the coarser threshold measurably cuts the vertex count `links.js` has to push through PIXI every frame.

Every built projection then goes through `clipToOutline()` (`src/core/outlineClip.js`): its `stream` is wrapped so every line (links, graticule, SVG export) is clipped in screen space to the projection's own Sphere outline. d3 never cuts lines at the interruptions of Berghaus, the polyhedral and `interrupted*` projections, Gingery, Healpix, etc. — without this, a link crossing a cut is drawn straight across the gap, and Armadillo draws its cut-away southern cap far below the map. Nodes use `projectVisible()` for the same outline test, so hidden nodes are neither drawn nor clickable.

### Data / API

`src/core/fetcher.js` queries the [OpenAlex API](https://api.openalex.org) live:
- `searchTopics(query)` — autocomplete, returns up to 8 matching topics.
- `fetchNetwork(topic, onProgress, signal)` — fetches up to 1 000 top-cited authors, then builds a co-authorship graph by batching works requests (25 authors/batch) through a pool of 10 workers, each pulling the next batch as soon as its current one finishes. Returns `{ nodes, links }` with **every** author kept, including those with no co-authors in the set (typically ~8% of nodes) — they render as free-floating dots.

**Paging.** OpenAlex returns 401 ("API key required for cursor paging") for keyless `cursor=` paging past the first page, and no key is sent, so every paged query goes through `pages()`, which uses plain `page=` paging. That works keyless but only reaches the first 10 000 records (`MAX_RECORDS`) of any one query. `pages()` throws `TooManyRecords` on a query over that cap unless called with `truncate` (the authors query, which only wants the top 1 000). A works batch that throws is split in half and both halves re-queued, so no co-authorships are lost; only a single author with more than 10 000 works in the topic is truncated, with a console warning.

**Cancellation.** The first failed batch aborts every other worker's in-flight request and stops the pool. `runQuery()` in `index.js` passes an `AbortSignal` and aborts the previous load when a new one starts (or the title returns to search), so a superseded load stops issuing requests, stops reporting progress, and never lands over the new network.

Without a key, requests run against OpenAlex's shared daily quota; one uncached network costs roughly 50–100 requests. When the quota is exhausted, `get()` surfaces the reset time from `Retry-After` rather than retrying.

Results are cached in `localStorage` for one week (`src/core/cache.js`, key prefix `sp:`).

### Build output

Vite writes everything to `dist/`, which is gitignored — `.github/workflows/deploy.yml` builds it on every push to `main` and publishes it to GitHub Pages, so no build output is committed. `codeSplitting: false` in `vite.config.js` forces a single `main.js` — this works around PixiJS v8 dynamic imports that would otherwise produce extra numbered chunks. The worker is emitted as `dist/simulation.worker.js`; its URL is rewritten automatically at build time.

Vite 8 bundles with Rolldown rather than Rollup, so the config uses `build.rolldownOptions` / `worker.rolldownOptions`. `package.json` sets `"type": "module"` so `vite.config.js` is loaded as ESM.

`base: './'` emits relative asset URLs, so one build serves both the dev server at `localhost:8000/` and GitHub Pages at `/spherical-projection/`. Don't hard-code an absolute base — it breaks whichever of the two it isn't set for.
