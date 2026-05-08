// Force-directed simulation, run inside a Web Worker so the main thread
// stays free for rendering, dragging, and CSS reflow. Each tick we
// transfer the new node positions back as a Float32Array — five floats
// per node: [x, y, z, lon, lat].

import * as force3D from 'd3-force-3d'

const halfPi = Math.PI / 2
const asin = (x) => x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x)

let nodes = null
let sim = null

self.onmessage = (e) => {
    const msg = e.data

    switch (msg.type) {

        case 'init': {
            nodes = msg.nodes
            const links = msg.links
            const N = nodes.length
            const R = 15 * Math.sqrt(N)
            const spacing = 2 * R * Math.sqrt(Math.PI / N)

            sim = force3D.forceSimulation()
                .numDimensions(3)
                .nodes(nodes)
                // Cool faster so the layout reaches a stable state in
                // ~6s rather than ~12s, then doesn't have time to drift.
                .alphaDecay(0.02)
                .velocityDecay(0.45)
                // Allow closer packing without overlap.
                .force('collide', force3D.forceCollide().radius(spacing * 0.55))
                // Repulsion is gentle and bounded — without distanceMax,
                // every pair of nodes pushes apart globally and the
                // network stretches over time.
                .force('charge', force3D.forceManyBody()
                    .strength(-spacing * 0.25)
                    .distanceMax(spacing * 4))
                // Shorter target distance + a stronger floor on link
                // strength so even weak links keep their endpoints close.
                .force('link', force3D.forceLink(links)
                    .id(d => d.id)
                    .distance(spacing * 0.9)
                    .strength(d => Math.max(0.4, Math.min(1, d.value || 0.5))))
                .force('surface', surfaceForce(R))
                .on('tick', emitTick)

            // Send the initial post-construction positions immediately so
            // the main thread has something to draw before the first tick.
            emitTick()
            break
        }

        case 'addTime': sim && sim.alpha(0.4).restart(); break
        case 'restart': sim && sim.alpha(1).restart(); break
        case 'pause':   sim && sim.stop(); break
        case 'resume':  sim && sim.alpha(Math.max(sim.alpha(), 0.3)).restart(); break
    }
}

function surfaceForce(R) {
    return function () {
        for (const node of nodes) {
            if (node.fx != null) node.x = node.fx
            if (node.fy != null) node.y = node.fy
            if (node.fz != null) node.z = node.fz

            node.norm = Math.sqrt(node.x ** 2 + node.y ** 2 + node.z ** 2) || 1

            const lon = Math.atan2(node.y, node.x) * 180 / Math.PI
            const lat = asin(node.z / node.norm) * 180 / Math.PI
            node.spherical = [lon, lat]

            // Pull node toward sphere surface of radius R
            const f = (1 + R / node.norm) / 2
            node.x *= f
            node.y *= f
            node.z *= f

            // Constrain velocity to tangent plane
            const sp = (node.vx * node.x + node.vy * node.y + node.vz * node.z) / node.norm ** 2
            node.vx -= node.x * sp
            node.vy -= node.y * sp
            node.vz -= node.z * sp
        }
    }
}

function emitTick() {
    const N = nodes.length
    const buf = new Float32Array(N * 5)
    for (let i = 0; i < N; i++) {
        const n = nodes[i]
        const o = i * 5
        buf[o    ] = n.x
        buf[o + 1] = n.y
        buf[o + 2] = n.z
        buf[o + 3] = n.spherical ? n.spherical[0] : 0
        buf[o + 4] = n.spherical ? n.spherical[1] : 0
    }
    // Transfer the buffer's underlying ArrayBuffer — zero-copy handoff.
    self.postMessage(
        { type: 'tick', positions: buf, alpha: sim.alpha() },
        [buf.buffer]
    )
}
