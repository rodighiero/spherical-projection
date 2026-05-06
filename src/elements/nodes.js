import { Graphics } from 'pixi.js'

let stage

export function initNodes() {
    const graphics = new Graphics()
    stage = s.pixi.addChild(graphics)
}

export function drawNodes() {
    stage.clear()
    s.nodes.forEach(node => {
        const pos = s.projection(node.spherical)
        if (pos) stage.circle(pos[0], pos[1], 1)
    })
    stage.fill({ color: 0x000000, alpha: 0.9 })
}
