import * as PIXI from 'pixi.js'

let stage

export function initNodes() {
    const graphics = new PIXI.Graphics()
    stage = s.pixi.addChild(graphics)
}

export function drawNodes() {
    stage.clear()
    stage.beginFill(0xffffff, 0.9)
    s.nodes.forEach(node => {
        const pos = s.projection(node.spherical)
        if (pos) stage.drawCircle(pos[0], pos[1], 2)
    })
    stage.endFill()
}
