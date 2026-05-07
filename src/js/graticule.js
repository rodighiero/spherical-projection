import { Graphics } from 'pixi.js'
import * as d3 from 'd3'

// Same canvas-context shim used in links.js — accumulates path commands
// onto a PIXI.Graphics so d3.geoPath can stroke through it.
class PixiGeoContext {
    constructor(g) { this.g = g }
    beginPath() {}
    moveTo(x, y) { this.g.moveTo(x, y) }
    lineTo(x, y) { this.g.lineTo(x, y) }
    arc(x, y, r, a0, a1, ccw) { this.g.arc(x, y, r, a0, a1, ccw) }
    closePath() { this.g.closePath() }
    stroke() {}
    fill() {}
}

let stage, ctx, geoPath
const graticule = d3.geoGraticule10()

export function initGraticule() {
    stage = new Graphics()
    stage.visible = false
    s.pixi.addChild(stage)
    ctx = new PixiGeoContext(stage)
    refreshGraticulePath()
}

export function refreshGraticulePath() {
    geoPath = d3.geoPath(s.projection, ctx)
}

export function drawGraticule() {
    stage.clear()
    if (!stage.visible) return
    geoPath(graticule)
    // Same thickness as the sphere border (1px), lighter alpha so the
    // grid reads as an overlay rather than competing with the network.
    stage.stroke({ width: 1, color: 0x000000, alpha: 0.18 })
}

export function setGraticuleVisible(v) {
    stage.visible = v
    drawGraticule()
}

export function isGraticuleVisible() {
    return stage.visible
}
