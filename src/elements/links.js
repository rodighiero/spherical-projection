import { Graphics } from 'pixi.js'
import * as d3 from 'd3'

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

export function drawLinks() {
    stage.clear()
    s.links.forEach(link => {
        geoPath({
            type: 'LineString',
            coordinates: [link.source.spherical, link.target.spherical]
        })
    })
    stage.stroke({ width: 0.5, color: 0xaaaaaa, alpha: 0.5 })
}
