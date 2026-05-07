// Floating info card — anchored next to the selected node, clamped to
// the viewport so it never goes off-screen. Acts as the visible
// "selection frame": clicking outside it on the canvas deselects.

import { getSelected } from './selection'

const MARGIN = 16
const OFFSET = 20

let panel = null
let nameEl = null
let metaEl = null
let tokensEl = null

function ensure() {
    if (panel) return
    panel    = document.getElementById('info')
    nameEl   = document.getElementById('info-name')
    metaEl   = document.getElementById('info-meta')
    tokensEl = document.getElementById('info-tokens')
}

// Populate the card's text. Cheap; only call on selection change.
export function setInfoContent(node) {
    ensure()
    if (!node) {
        panel.hidden = true
        return
    }
    panel.hidden = false

    nameEl.textContent = node.name || `Node ${node.id}`

    const meta = []
    if (node.docs) meta.push(`${node.docs} docs`)
    if (node.peers && node.peers.length) meta.push(`${node.peers.length} peers`)
    metaEl.textContent = meta.join(' · ')

    tokensEl.innerHTML = ''
    if (node.tokens && node.tokens.length) {
        node.tokens.slice(0, 8).forEach(t => {
            const li = document.createElement('li')
            li.textContent = t.term
            tokensEl.appendChild(li)
        })
    }
}

// Reposition the card so it sits next to the projected node, flipping
// to the other side and clamping if it would overflow. Cheap enough to
// call on every simulation tick.
export function updateInfoPosition() {
    ensure()
    const node = getSelected()
    if (!node || !node.spherical || panel.hidden) return

    const world = s.projection(node.spherical)
    if (!world) return

    const screen = s.pixi.toScreen(world[0], world[1])

    const W  = window.innerWidth
    const H  = window.innerHeight
    const pw = panel.offsetWidth
    const ph = panel.offsetHeight

    let x = screen.x + OFFSET
    let y = screen.y - ph / 2

    if (x + pw > W - MARGIN) x = screen.x - pw - OFFSET
    if (x < MARGIN)          x = MARGIN
    if (y < MARGIN)          y = MARGIN
    if (y + ph > H - MARGIN) y = H - ph - MARGIN

    panel.style.left = `${x}px`
    panel.style.top  = `${y}px`
}
