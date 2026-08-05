import { Graphics } from 'pixi.js'
import * as d3 from 'd3'
import { hasSelection, isLinkActive } from '../core/selection'
import { PixiGeoContext } from './geoContext'

const HIGHLIGHT = 0xd62828

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

const STYLE_SPHERE = { width: 1, color: 0x000000, alpha: 0.5 }
const STYLE_LINK = { width: 0.2, color: 0x000000, alpha: 1.0 }
const STYLE_ACTIVE = { width: 0.6, color: HIGHLIGHT, alpha: 1.0 }

export function drawLinks() {
    stage.clear()
    if (!s.nodes.length) return

    // Sphere outline — gives every projection (rectangle for Mercator,
    // circle for Orthographic, lobed shape for Equal Earth, etc.) a
    // visible border framed by the window margin.
    pixiCtx.setStyle(stage, STYLE_SPHERE)
    geoPath({ type: 'Sphere' })
    pixiCtx.flush()

    // All links — PixiGeoContext flushes internally as the point count
    // grows, keeping this within PIXI's vertex batch cap regardless of
    // network size.
    pixiCtx.setStyle(stage, STYLE_LINK)
    s.links.forEach(link => {
        const a = link.source && link.source.spherical
        const b = link.target && link.target.spherical
        if (!a || !b) return
        geoPath({ type: 'LineString', coordinates: [a, b] })
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
        geoPath({ type: 'LineString', coordinates: [a, b] })
    })
    pixiCtx.flush()
}
