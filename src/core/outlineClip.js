// Clips projected lines to the projection's own Sphere outline, in screen
// space, right before they reach the drawing context.
//
// d3-geo only clips lines against the antimeridian or a small circle
// (preclip) and the viewport rectangle (postclip). Interrupted projections
// from d3-geo-projection — Berghaus, the polyhedral family, the
// interrupted* lobed ones — route each point to whichever lobe it belongs
// to but never cut a line at the interruption, so a link whose ends land in
// different lobes became one straight segment drawn across the gap.
// Armadillo is worse: it only *draws* its outline with the southern cap
// cut away, and points in that cap still project, far below the map. The
// outline d3 draws for {type: 'Sphere'} is the one true boundary for every
// projection, so every line segment is clipped to it here: pieces outside
// are dropped and the line restarts (lineStart → moveTo) on re-entry.
//
// Polygons (the Sphere outline itself) pass through untouched.

import { geoStream } from 'd3'

const ROW  = 16   // px — height of the row bands the inside test scans
const CELL = 16   // px — side of the grid cells the crossing test scans

export function outlineClip(projection) {
    const edges = collectEdges(projection)
    if (!edges.length) return null

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const e of edges) {
        minX = Math.min(minX, e[0], e[2]); maxX = Math.max(maxX, e[0], e[2])
        minY = Math.min(minY, e[1], e[3]); maxY = Math.max(maxY, e[1], e[3])
    }

    // Row bands for the inside test: a ray cast only needs the edges that
    // span its own y.
    const nRows = Math.ceil((maxY - minY) / ROW) + 1
    const rows  = Array.from({ length: nRows }, () => [])
    const rowOf = y => Math.min(nRows - 1, Math.max(0, Math.floor((y - minY) / ROW)))

    // A 2D grid for the crossing test, run on every segment of every line:
    // almost all segments lie in cells the outline never enters, so they
    // test no edges at all. Row bands alone would still hand every segment
    // the outline's left and right flanks.
    const nx = Math.ceil((maxX - minX) / CELL) + 1
    const ny = Math.ceil((maxY - minY) / CELL) + 1
    const cells = new Array(nx * ny).fill(null)
    const colOf  = x => Math.min(nx - 1, Math.max(0, Math.floor((x - minX) / CELL)))
    const cellOf = y => Math.min(ny - 1, Math.max(0, Math.floor((y - minY) / CELL)))

    edges.forEach((e, i) => {
        const r0 = rowOf(Math.min(e[1], e[3])), r1 = rowOf(Math.max(e[1], e[3]))
        for (let r = r0; r <= r1; r++) rows[r].push(i)
        const c0 = colOf(Math.min(e[0], e[2])), c1 = colOf(Math.max(e[0], e[2]))
        const k0 = cellOf(Math.min(e[1], e[3])), k1 = cellOf(Math.max(e[1], e[3]))
        for (let k = k0; k <= k1; k++) {
            for (let c = c0; c <= c1; c++) (cells[k * nx + c] ??= []).push(i)
        }
    })

    // Even-odd ray cast towards +x, against the edges in y's row only.
    function contains(x, y) {
        if (!(y >= minY && y <= maxY)) return false
        let inside = false
        for (const i of rows[rowOf(y)]) {
            const [x0, y0, x1, y1] = edges[i]
            if ((y0 > y) !== (y1 > y) && x < x0 + (y - y0) / (y1 - y0) * (x1 - x0)) inside = !inside
        }
        return inside
    }

    // Stamp per edge so an edge spanning several cells is tested once.
    const stamp = new Uint32Array(edges.length)
    let stampId = 0
    const ts = []

    // Parameters t ∈ (0, 1) where a→b crosses the outline, sorted.
    function crossings(ax, ay, bx, by) {
        ts.length = 0
        const loX = Math.min(ax, bx), hiX = Math.max(ax, bx)
        const loY = Math.min(ay, by), hiY = Math.max(ay, by)
        if (hiX < minX || loX > maxX || hiY < minY || loY > maxY) return ts
        if (++stampId === 0xffffffff) { stamp.fill(0); stampId = 1 }
        const dx = bx - ax, dy = by - ay
        const c0 = colOf(loX), c1 = colOf(hiX), k1 = cellOf(hiY)
        for (let k = cellOf(loY); k <= k1; k++) {
            for (let c = c0; c <= c1; c++) {
                const list = cells[k * nx + c]
                if (!list) continue
                for (const i of list) {
                    if (stamp[i] === stampId) continue
                    stamp[i] = stampId
                    const [x0, y0, x1, y1] = edges[i]
                    const ex = x1 - x0, ey = y1 - y0
                    const den = dx * ey - dy * ex
                    if (!den) continue   // parallel — collinear runs along the edge count as no crossing
                    const t = ((x0 - ax) * ey - (y0 - ay) * ex) / den
                    const u = ((x0 - ax) * dy - (y0 - ay) * dx) / den
                    if (t > 1e-9 && t < 1 - 1e-9 && u >= 0 && u <= 1) ts.push(t)
                }
            }
        }
        if (ts.length > 1) ts.sort((p, q) => p - q)
        return ts
    }

    const cache = new WeakMap()

    function wrap(sink) {
        let clipped = cache.get(sink)
        if (!clipped) cache.set(sink, clipped = clipStream(sink))
        return clipped
    }

    function clipStream(sink) {
        let inPolygon = false
        let inLine = false     // between lineStart/lineEnd upstream
        let open = false       // a line is open downstream
        let px, py, first      // previous upstream point
        let prevInside = null  // inside state at (px, py), once known

        function emitStart(x, y) {
            if (open) sink.lineEnd()
            sink.lineStart()
            sink.point(x, y)
            open = true
        }

        function close() {
            if (open) { sink.lineEnd(); open = false }
        }

        function segment(x, y) {
            const cuts = crossings(px, py, x, y)
            if (!cuts.length) {
                // Wholly inside or wholly outside. Decided by the midpoint
                // rather than an endpoint — endpoints routinely sit exactly
                // on the outline (d3's own antimeridian cuts end there).
                const inside = prevInside ?? contains((px + x) / 2, (py + y) / 2)
                if (inside) { if (!open) emitStart(px, py); sink.point(x, y) }
                else close()
                prevInside = inside
                return
            }
            let t0 = 0
            const dx = x - px, dy = y - py
            for (let k = 0; k <= cuts.length; k++) {
                const t1 = k < cuts.length ? cuts[k] : 1
                const inside = contains(px + dx * (t0 + t1) / 2, py + dy * (t0 + t1) / 2)
                if (inside) {
                    if (!open || t0 > 0) emitStart(px + dx * t0, py + dy * t0)
                    sink.point(px + dx * t1, py + dy * t1)
                } else close()
                prevInside = inside
                t0 = t1
            }
        }

        return {
            point(x, y) {
                if (inPolygon || !inLine) { sink.point(x, y); return }
                if (first) { first = false; px = x; py = y; return }
                if (x === px && y === py) return
                segment(x, y)
                px = x; py = y
            },
            lineStart() {
                if (inPolygon) { sink.lineStart(); return }
                inLine = true; first = true; open = false; prevInside = null
            },
            lineEnd() {
                if (inPolygon) { sink.lineEnd(); return }
                // A lone point (zero-length line) never reached segment().
                if (!first && !open && prevInside === null && contains(px, py)) {
                    sink.lineStart(); sink.point(px, py); sink.lineEnd()
                }
                close()
                inLine = false
            },
            polygonStart() { inPolygon = true; sink.polygonStart() },
            polygonEnd()   { inPolygon = false; sink.polygonEnd() },
            sphere()       { sink.sphere && sink.sphere() },
        }
    }

    return { wrap, contains }
}

// The outline as a flat list of [x0, y0, x1, y1] edges, read by streaming
// {type: 'Sphere'} through the projection itself — so it is exactly the
// frame geoPath draws, whatever each projection's own sphere() does.
//
// Traced at a finer precision than the lines themselves: resampled at the
// lines' 2px, the outline's chords cut inside its true curve, and every
// link ending on the frame (d3's antimeridian cuts end exactly there) lost
// its last pixel or two to the gap.
const OUTLINE_PRECISION = 0.1

function collectEdges(projection) {
    const edges = []
    const precision = projection.precision && projection.precision()
    if (precision != null) projection.precision(OUTLINE_PRECISION)
    let ring = null
    const closeRing = () => {
        if (!ring || ring.length < 2) return
        for (let i = 0; i < ring.length; i++) {
            const a = ring[i], b = ring[(i + 1) % ring.length]
            if (a[0] !== b[0] || a[1] !== b[1]) edges.push([a[0], a[1], b[0], b[1]])
        }
    }
    geoStream({ type: 'Sphere' }, projection.stream({
        point(x, y) { if (ring && Number.isFinite(x) && Number.isFinite(y)) ring.push([x, y]) },
        lineStart() { ring = [] },
        lineEnd()   { closeRing(); ring = null },
        polygonStart() {}, polygonEnd() {},
    }))
    if (precision != null) projection.precision(precision)
    return edges
}
