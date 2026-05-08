import { Graphics } from 'pixi.js'
import * as d3 from 'd3'
import { hasSelection, isLinkActive } from './selection'

// Adapts PIXI.Graphics to the canvas 2D context interface that d3.geoPath
// expects.
//
// IMPORTANT: d3.geoPath calls beginPath() before each feature, so we use
// that hook to immediately commit the previous path with stroke(). This
// keeps each link's geometry in its own PIXI batch and avoids the 65 535-
// vertex hard cap that silently truncates large accumulated paths in PIXI v8.
// The style and graphics object are set per draw pass via setStyle().
class PixiGeoContext {
    constructor() { this.g = null; this._style = null; this._pending = false }
    setStyle(graphics, style) { this.g = graphics; this._style = style; this._pending = false }
    beginPath() {
        if (this._pending) { this.g.stroke(this._style); this._pending = false }
    }
    moveTo(x, y)  { this.g.moveTo(x, y);  this._pending = true }
    lineTo(x, y)  { this.g.lineTo(x, y) }
    arc(x, y, r, a0, a1, ccw) { this.g.arc(x, y, r, a0, a1, ccw) }
    closePath()   { this.g.closePath() }
    flush()       { if (this._pending) { this.g.stroke(this._style); this._pending = false } }
    stroke() {}
    fill()   {}
}

let stage, pixiCtx, geoPath

export function initLinks() {
    const graphics = new Graphics()
    stage = s.pixi.addChild(graphics)
    pixiCtx = new PixiGeoContext()
    refreshGeoPath()
}

export function refreshGeoPath() {
    geoPath = d3.geoPath(s.projection, pixiCtx)
}

const HIGHLIGHT = 0xd62828

const STYLE_SPHERE = { width: 1,   color: 0x000000, alpha: 0.5  }
const STYLE_LINK   = { width: 0.5, color: 0x000000, alpha: 0.3  }
const STYLE_ACTIVE = { width: 1,   color: HIGHLIGHT, alpha: 0.75 }

export function drawLinks() {
    stage.clear()

    // Sphere outline — gives every projection (rectangle for Mercator,
    // circle for Orthographic, lobed shape for Equal Earth, etc.) a
    // visible border framed by the window margin.
    pixiCtx.setStyle(stage, STYLE_SPHERE)
    geoPath({ type: 'Sphere' })
    pixiCtx.flush()

    // All links. Each path is committed via beginPath() before the next
    // one starts, keeping every link within PIXI's 65 535-vertex batch cap.
    pixiCtx.setStyle(stage, STYLE_LINK)
    s.links.forEach(link => {
        const a = link.source && link.source.spherical
        const b = link.target && link.target.spherical
        if (!a || !b) return
        geoPath({ type: 'LineString', coordinates: [s.networkRotation(a), s.networkRotation(b)] })
    })
    pixiCtx.flush()

    if (!hasSelection()) return

    // Active links overlaid in red.
    pixiCtx.setStyle(stage, STYLE_ACTIVE)
    s.links.forEach(link => {
        if (!isLinkActive(link)) return
        const a = link.source && link.source.spherical
        const b = link.target && link.target.spherical
        if (!a || !b) return
        geoPath({ type: 'LineString', coordinates: [s.networkRotation(a), s.networkRotation(b)] })
    })
    pixiCtx.flush()
}
