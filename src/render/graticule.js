import { Graphics } from 'pixi.js'
import * as d3 from 'd3'
import { PixiGeoContext } from './geoContext'

const STYLE_GRATICULE = { width: 1, color: 0x000000, alpha: 0.10 }

let stage, pixiCtx, geoPath
const graticule = d3.geoGraticule10()

export function initGraticule() {
    stage = new Graphics()
    stage.visible = false
    s.pixi.addChild(stage)
    pixiCtx = new PixiGeoContext()
    refreshGraticulePath()
}

export function refreshGraticulePath() {
    geoPath = d3.geoPath(s.projection, pixiCtx)
}

export function drawGraticule() {
    stage.clear()
    if (!stage.visible || !s.nodes.length) return
    // Same thickness as the sphere border (1px), lighter alpha so the
    // grid reads as an overlay rather than competing with the network.
    pixiCtx.setStyle(stage, STYLE_GRATICULE)
    geoPath(graticule)
    pixiCtx.flush()
}

export function setGraticuleVisible(v) {
    stage.visible = v
    drawGraticule()
}

export function isGraticuleVisible() {
    return stage.visible
}
