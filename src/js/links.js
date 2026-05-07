import { Graphics } from 'pixi.js'
import * as d3 from 'd3'
import { hasSelection, isLinkActive } from './selection'

// Adapts PIXI.Graphics to the canvas 2D context interface that d3.geoPath
// expects. Path commands accumulate into the Graphics' current path; we
// stroke once at the end of drawLinks() (PIXI v8 commits paths via stroke()
// or fill(), not via lineStyle as in v5).
class PixiGeoContext {
    constructor(graphics) { this.g = graphics }
    beginPath() {}
    moveTo(x, y)  { this.g.moveTo(x, y) }
    lineTo(x, y)  { this.g.lineTo(x, y) }
    arc(x, y, r, a0, a1, ccw) { this.g.arc(x, y, r, a0, a1, ccw) }
    closePath()   { this.g.closePath() }
    stroke() {}
    fill()   {}
}

let stage, pixiCtx, geoPath

export function initLinks() {
    const graphics = new Graphics()
    stage = s.pixi.addChild(graphics)
    pixiCtx = new PixiGeoContext(stage)
    refreshGeoPath()
}

export function refreshGeoPath() {
    geoPath = d3.geoPath(s.projection, pixiCtx)
}

const HIGHLIGHT = 0xd62828

export function drawLinks() {
    stage.clear()

    // Sphere outline — gives every projection (rectangle for Mercator,
    // circle for Orthographic, lobed shape for Equal Earth, etc.) a
    // visible border framed by the window margin.
    geoPath({ type: 'Sphere' })
    stage.stroke({ width: 1, color: 0x000000, alpha: 0.5 })

    // All links at the same regular intensity, regardless of selection.
    s.links.forEach(link => {
        const a = link.source && link.source.spherical
        const b = link.target && link.target.spherical
        if (!a || !b) return
        geoPath({ type: 'LineString', coordinates: [a, b] })
    })
    stage.stroke({ width: 0.5, color: 0x000000, alpha: 0.3 })

    if (!hasSelection()) return

    // Active links overlaid in red.
    s.links.forEach(link => {
        if (!isLinkActive(link)) return
        const a = link.source && link.source.spherical
        const b = link.target && link.target.spherical
        if (!a || !b) return
        geoPath({ type: 'LineString', coordinates: [a, b] })
    })
    stage.stroke({ width: 1, color: HIGHLIGHT, alpha: 0.75 })
}
