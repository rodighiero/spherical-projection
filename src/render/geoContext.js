// Adapts a PIXI.Graphics object to the canvas-2D-like context that
// d3.geoPath expects, shared by links.js and graticule.js (both feed it
// geodesic geometry through the same d3.geoPath + PIXI.Graphics pipeline).
//
// PIXI v8 has a ~65,535-vertex hard cap per accumulated path; exceeding it
// silently truncates. d3.geoPath does not call context.beginPath() between
// top-level geometries (confirmed empirically, not merely assumed from the
// canvas-context convention), so without an explicit break here, every
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

    beginPath() {
        if (this._pending) this._flush()
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

    // d3.geoPath calls context.stroke()/fill() too, but committing is
    // driven by flush()/beginPath() above so the caller controls exactly
    // when a style change takes effect — these are no-ops.
    stroke() { }
    fill() { }
}
