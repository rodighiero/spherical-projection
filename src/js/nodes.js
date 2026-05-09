import { Graphics } from 'pixi.js'
import { hasSelection, isNeighbor, getSelected } from './selection'
import { HIGHLIGHT } from './constants'

let stage

export function initNodes() {
    const graphics = new Graphics()
    stage = s.pixi.addChild(graphics)
}

export function drawNodes() {
    stage.clear()

    // Always draw the full network at full strength so the visual base
    // never changes — the highlight is purely additive on top.
    s.nodes.forEach(node => {
        if (!node.spherical) return
        const pos = s.projection(node.spherical)
        if (pos) stage.circle(pos[0], pos[1], 0.7)
    })
    stage.fill({ color: 0x000000, alpha: 0.9 })

    if (!hasSelection()) return

    // Neighbours: red dot, a bit larger.
    s.nodes.forEach(node => {
        if (!node.spherical || !isNeighbor(node)) return
        const pos = s.projection(node.spherical)
        if (pos) stage.circle(pos[0], pos[1], 1.4)
    })
    stage.fill({ color: HIGHLIGHT, alpha: 1 })

    // Selected node: bigger red dot with an outer ring.
    const sel = getSelected()
    if (sel && sel.spherical) {
        const pos = s.projection(sel.spherical)
        if (pos) {
            stage.circle(pos[0], pos[1], 2.8)
            stage.fill({ color: HIGHLIGHT, alpha: 1 })
            stage.circle(pos[0], pos[1], 6)
            stage.stroke({ width: 0.8, color: HIGHLIGHT, alpha: 0.6 })
        }
    }
}
