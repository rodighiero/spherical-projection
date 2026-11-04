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
import { endpointId } from './selection'
import { sphereRadius } from './sphere'

const halfPi = Math.PI / 2
const asin = (x) => x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x)

let worker = null
let lastAlpha = 1

// Ticks the worker posted before it handled a pause or setPositions are
// still in flight when those calls return, and would otherwise land after
// them: resetting lastAlpha so a pause doesn't register (isRunning() true
// while the worker is idle), or blending the pre-drag layout back in over
// the rotated one. Every message carries the current epoch, the worker
// stamps its ticks with the last epoch it saw, and pause()/syncPositions()
// bump it — so anything sent before them is recognisably stale and dropped.
let epoch = 0

// Pause/Resume button hook: called with isRunning() whenever it changes —
// on controls, new networks, and the simulation cooling down by itself.
let runningListener = null
let lastRunning = null
export function onRunningChange(fn) { runningListener = fn; notifyRunning() }
function notifyRunning() {
    const r = isRunning()
    if (r === lastRunning) return
    lastRunning = r
    runningListener && runningListener(r)
}

function post(msg, transfer) {
    worker && worker.postMessage({ ...msg, epoch }, transfer)
}

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
        if (msg.type !== 'tick' || msg.epoch !== epoch) return

        lastAlpha = msg.alpha
        notifyRunning()

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

function initWorker(rotation) {
    // Strip references that won't survive structured cloning, then ship
    // a clean copy of nodes and links into the worker.
    post({
        type: 'init',
        rotation,
        nodes: s.nodes.map(n => ({ id: n.id })),
        links: s.links.map(l => ({
            source: endpointId(l.source),
            target: endpointId(l.target),
            value:  l.value,
        })),
    })
}

// rotation: optional [lon, lat] in degrees the seed layout starts turned by
// (a deep link's view — see permalink.js).
export function simulation(rotation) {
    spawnWorker()
    initWorker(rotation)
}

// Reset with a completely new dataset — terminates the current worker and
// starts a fresh one. Call after updating s.nodes and s.links.
export function resetSimulation(rotation) {
    lastAlpha = 1
    notifyRunning()
    spawnWorker()
    initWorker(rotation)
}

// Controls — fire-and-forget messages. We track alpha locally so
// isRunning() stays synchronous for the Pause/Resume button.

export function addTime() { post({ type: 'addTime' }); lastAlpha = 0.4; notifyRunning() }
export function restart() { post({ type: 'restart' }); lastAlpha = 1;   notifyRunning() }
export function pause()   { epoch++; post({ type: 'pause' }); lastAlpha = 0; notifyRunning() }
export function resume()  { post({ type: 'resume' });  lastAlpha = Math.max(lastAlpha, 0.3); notifyRunning() }
export function resumeQuiet() { post({ type: 'resumeQuiet' }) }
export function isRunning() { return lastAlpha > 0.001 }

// Hands the main thread's (rotated) node.spherical back to the worker. Also
// drops both interpolation buffers: they hold pre-rotation positions, and
// blending from them would swing every node back through the old layout.
// The next tick then starts flat from the rotated state.
export function syncPositions(nodes) {
    if (!worker) return
    epoch++
    prevBuf = null; nextBuf = null
    const N = nodes.length
    const R = sphereRadius(N)
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
    post({ type: 'setPositions', positions: buf }, [buf.buffer])
}
