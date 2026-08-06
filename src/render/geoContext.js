// Adapts a PIXI.Graphics object to the canvas-2D-like context that
// d3.geoPath expects, shared by links.js and graticule.js (both feed it
// geodesic geometry through the same d3.geoPath + PIXI.Graphics pipeline).
//
// PIXI v8 has a ~65,535-vertex hard cap per accumulated path; exceeding it
// silently truncates. d3-geo's PathContext only ever calls moveTo/lineTo/
// arc/closePath — never beginPath() between top-level geometries (read off
// d3-geo/src/path/context.js, not merely assumed from the canvas-context
// convention), so without an explicit break here, every
// feature drawn in one pass — e.g. every link in the network — accumulates
// into a single continuous path with no natural flush point. Instead this
// tracks the point count itself and flushes (stroke()) whenever it's about
// to start a new subpath (moveTo) with the running total already past
// MAX_POINTS_PER_FLUSH, well under the real cap even accounting for PIXI's
// internal stroke tessellation expanding each point into more vertices.
// The check only ever fires at a moveTo — a subpath (one link's resampled
// arc) is never split mid-curve, so a flush never leaves a visible seam.
const MAX_POINTS_PER_FLUSH = 12000

export class PixiGeoContext {
    constructor() {
        this.g = null
        this._style = null
        this._pending = false
        this._points = 0
    }

    setStyle(graphics, style) {
        this.g = graphics
        this._style = style
        this._pending = false
        this._points = 0
    }

    moveTo(x, y) {
        if (this._points >= MAX_POINTS_PER_FLUSH) this._flush()
        this.g.moveTo(x, y)
        this._pending = true
        this._points++
    }

    lineTo(x, y) {
        this.g.lineTo(x, y)
        this._points++
    }

    arc(x, y, r, a0, a1, ccw) { this.g.arc(x, y, r, a0, a1, ccw) }
    closePath() { this.g.closePath() }

    // Called explicitly by the draw functions after each complete pass
    // (e.g. the sphere outline, then all links) to commit what's left.
    flush() { this._flush() }

    _flush() {
        if (this._pending) { this.g.stroke(this._style); this._pending = false }
        this._points = 0
    }

    // d3-geo's PathContext only ever calls moveTo/lineTo/arc/closePath, so
    // these are never reached today — they exist so that a d3 version which
    // did start calling them couldn't commit a half-built path behind the
    // caller's back. Committing stays driven by flush() and the moveTo
    // threshold above, so the caller controls when a style takes effect.
    beginPath() { }
    stroke() { }
    fill() { }
}
