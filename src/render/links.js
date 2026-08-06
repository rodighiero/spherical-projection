import { Graphics } from 'pixi.js'
import * as d3 from 'd3'
import { hasSelection, isLinkActive } from '../core/selection'
import { PixiGeoContext } from './geoContext'

const HIGHLIGHT = 0xd62828

let stage, pixiCtx, geoPath
let linksVisible = true

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
const STYLE_LINK = { width: 0.25, color: 0x000000, alpha: 1.0 }
const STYLE_ACTIVE = { width: 0.6, color: HIGHLIGHT, alpha: 1.0 }

// Reused for every link on every frame instead of allocating a fresh
// object + array per link — d3.geoPath reads it synchronously and keeps
// no reference, so one mutable instance is equivalent.
const LINE = { type: 'LineString', coordinates: [null, null] }

function drawArc(a, b) {
    LINE.coordinates[0] = a
    LINE.coordinates[1] = b
    geoPath(LINE)
}

export function drawLinks() {
    stage.clear()
    if (!s.nodes.length) return

    // Sphere outline — gives every projection (rectangle for Mercator,
    // circle for Orthographic, lobed shape for Equal Earth, etc.) a
    // visible border framed by the window margin.
    pixiCtx.setStyle(stage, STYLE_SPHERE)
    geoPath({ type: 'Sphere' })
    pixiCtx.flush()

    if (!linksVisible) return

    // All links — PixiGeoContext flushes internally as the point count
    // grows, keeping this within PIXI's vertex batch cap regardless of
    // network size.
    pixiCtx.setStyle(stage, STYLE_LINK)
    s.links.forEach(link => {
        const a = link.source && link.source.spherical
        const b = link.target && link.target.spherical
        if (a && b) drawArc(a, b)
    })
    pixiCtx.flush()

    if (!hasSelection()) return

    // Active links overlaid in red.
    pixiCtx.setStyle(stage, STYLE_ACTIVE)
    s.links.forEach(link => {
        if (!isLinkActive(link)) return
        const a = link.source && link.source.spherical
        const b = link.target && link.target.spherical
        if (a && b) drawArc(a, b)
    })
    pixiCtx.flush()
}

// Gates only the link segments, not the sphere outline above — toggling
// links off should still leave the frame of the projection visible.
export function setLinksVisible(v) {
    linksVisible = v
    drawLinks()
}

export function isLinksVisible() {
    return linksVisible
}
