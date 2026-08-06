// Main-thread façade for the simulation worker. The real force loop
// runs in simulation.worker.js — here we just pump positions back
// into s.nodes and trigger a redraw on each tick.
//
// The worker's tick timer runs on setTimeout — Web Workers have no
// requestAnimationFrame — so ticks arrive off the browser's real vsync
// cadence and, measured in practice, at roughly half the display's actual
// refresh rate (physics is the bottleneck, not the screen). Painting
// synchronously on every message would read as stutter twice over: once
// from landing off-beat with vsync, and again from only having new data
// for every other real frame. So instead of drawing on message arrival,
// we keep the last two received ticks (with their arrival times) and
// interpolate between them on every requestAnimationFrame callback —
// vsync-locked by definition — so the sphere animates at the display's
// full rate even though the underlying physics updates slower.
//
// Positions are interpolated in Cartesian x/y/z, not lon/lat: two ticks
// apart the node has barely moved, so a straight blend between the two
// xyz points is visually indistinguishable from the true great-circle
// arc, and — unlike lon/lat — it has no seam at ±180° longitude or pole
// convergence to glitch across. lon/lat for drawing is then re-derived
// here from the blended xyz — which is why the worker ships only x/y/z
// and computes no lon/lat of its own.

import { drawLinks } from '../render/links'
import { drawNodes } from '../render/nodes'
import { updateInfoPosition } from './info'

const halfPi = Math.PI / 2
const asin = (x) => x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x)

let worker = null
let lastAlpha = 1

let prevBuf = null, prevAt = 0
let nextBuf = null, nextAt = 0
let looping = false

function frame(now) {
    if (!nextBuf) { looping = false; return }

    // nextAt is already in the past by the time this callback runs — comparing
    // `now` straight against prevAt would always land past nextAt and clamp
    // to 1 immediately, skipping the interpolation entirely. Render one tick
    // interval behind real time instead (the standard entity-interpolation
    // delay), so `now` sweeps through [prevAt, nextAt] as the next real tick
    // is awaited, rather than always trailing both.
    const span = nextAt - prevAt
    const t    = span > 0 ? Math.min(1, Math.max(0, (now - nextAt) / span)) : 1

    const a = prevBuf, b = nextBuf
    const nodes = s.nodes

    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const o = i * 3
        const x = a[o]     + (b[o]     - a[o])     * t
        const y = a[o + 1] + (b[o + 1] - a[o + 1]) * t
        const z = a[o + 2] + (b[o + 2] - a[o + 2]) * t
        n.x = x
        n.y = y
        n.z = z
        const norm = Math.sqrt(x * x + y * y + z * z) || 1
        // Mutated in place rather than reassigned — this runs for every
        // node on every frame, and a fresh pair per node per frame is
        // pure garbage. Every reader only indexes [0]/[1]; the one place
        // that retains the array across frames (initDragToRotate) already
        // takes its own .slice().
        const sp = n.spherical || (n.spherical = [0, 0])
        sp[0] = Math.atan2(y, x) * 180 / Math.PI
        sp[1] = asin(z / norm)   * 180 / Math.PI
    }

    // The graticule depends only on the projection, never on node
    // positions, so it isn't redrawn here — callers that actually change
    // the projection (or toggle it visible) redraw it explicitly.
    drawLinks()
    drawNodes()
    updateInfoPosition()

    // Still catching up to the latest known tick — keep animating toward
    // it. Once caught up, go idle rather than redrawing a static scene
    // forever; a new tick message restarts the loop.
    if (t < 1) requestAnimationFrame(frame)
    else       looping = false
}

function spawnWorker() {
    if (worker) worker.terminate()
    prevBuf = null; nextBuf = null
    looping = false

    worker = new Worker(
        new URL('./simulation.worker.js', import.meta.url),
        { type: 'module' }
    )

    worker.onmessage = (e) => {
        const msg = e.data
        if (msg.type !== 'tick') return

        lastAlpha = msg.alpha

        // First tick ever has nothing to interpolate from — start flat.
        prevBuf = nextBuf ?? msg.positions
        prevAt  = nextBuf ? nextAt : performance.now()
        nextBuf = msg.positions
        nextAt  = performance.now()

        if (!looping) {
            looping = true
            requestAnimationFrame(frame)
        }
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
