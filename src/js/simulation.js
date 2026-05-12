// Main-thread façade for the simulation worker. The real force loop
// runs in simulation.worker.js — here we just pump positions back
// into s.nodes and trigger a redraw on each tick.

import { drawLinks } from './links'
import { drawNodes } from './nodes'
import { drawGraticule } from './graticule'
import { updateInfoPosition } from './info'

let worker = null
let lastAlpha = 1

function spawnWorker() {
    if (worker) worker.terminate()

    worker = new Worker(
        new URL('./simulation.worker.js', import.meta.url),
        { type: 'module' }
    )

    worker.onmessage = (e) => {
        const msg = e.data
        if (msg.type !== 'tick') return

        lastAlpha = msg.alpha
        const buf   = msg.positions
        const nodes = s.nodes

        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i]
            const o = i * 5
            n.x = buf[o]
            n.y = buf[o + 1]
            n.z = buf[o + 2]
            n.spherical = [buf[o + 3], buf[o + 4]]
        }

        drawLinks()
        drawNodes()
        drawGraticule()
        updateInfoPosition()
    }
}

function initWorker() {
    // Strip references that won't survive structured cloning, then ship
    // a clean copy of nodes and links into the worker.
    worker.postMessage({
        type: 'init',
        nodes: s.nodes.map(n => ({ id: n.id })),
        links: s.links.map(l => ({
            source: l.source.id != null ? l.source.id : l.source,
            target: l.target.id != null ? l.target.id : l.target,
            value:  l.value,
        })),
    })
}

export function simulation() {
    spawnWorker()
    initWorker()
}

// Reset with a completely new dataset — terminates the current worker and
// starts a fresh one. Call after updating s.nodes and s.links.
export function resetSimulation() {
    lastAlpha = 1
    spawnWorker()
    initWorker()
}

// Controls — fire-and-forget messages. We track alpha locally so
// isRunning() stays synchronous for the Pause/Resume button.

export function addTime() { worker && worker.postMessage({ type: 'addTime' }); lastAlpha = 0.4 }
export function restart() { worker && worker.postMessage({ type: 'restart' }); lastAlpha = 1 }
export function pause()   { worker && worker.postMessage({ type: 'pause' });   lastAlpha = 0 }
export function resume()  { worker && worker.postMessage({ type: 'resume' });  lastAlpha = Math.max(lastAlpha, 0.3) }
export function resumeQuiet() { worker && worker.postMessage({ type: 'resumeQuiet' }) }
export function isRunning() { return lastAlpha > 0.001 }

export function syncPositions(nodes) {
    if (!worker) return
    const N = nodes.length
    const R = 15 * Math.sqrt(N)
    const buf = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
        const sp = nodes[i].spherical
        if (!sp) continue
        const lon = sp[0] * Math.PI / 180
        const lat = sp[1] * Math.PI / 180
        buf[i * 3    ] = R * Math.cos(lat) * Math.cos(lon)
        buf[i * 3 + 1] = R * Math.cos(lat) * Math.sin(lon)
        buf[i * 3 + 2] = R * Math.sin(lat)
    }
    worker.postMessage({ type: 'setPositions', positions: buf }, [buf.buffer])
}
