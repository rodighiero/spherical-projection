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

            // Seed every node on a Fibonacci sphere so the simulation
            // starts from a near-uniform distribution rather than a
            // random clump. d3-force only initialises nodes that lack
            // x/y/z, so setting them here takes precedence.
            const PHI = (1 + Math.sqrt(5)) / 2
            for (let i = 0; i < N; i++) {
                const theta = Math.acos(1 - 2 * (i + 0.5) / N)
                const phi   = 2 * Math.PI * i / PHI
                nodes[i].x  = R * Math.sin(theta) * Math.cos(phi)
                nodes[i].y  = R * Math.sin(theta) * Math.sin(phi)
                nodes[i].z  = R * Math.cos(theta)
            }

            sim = force3D.forceSimulation()
                .numDimensions(3)
                .nodes(nodes)
                // Slow cooling gives the layout more time to spread across
                // the sphere before settling (~20s at 60fps).
                .alphaDecay(0.007)
                .velocityDecay(0.45)
                // Allow closer packing without overlap.
                .force('collide', force3D.forceCollide().radius(spacing * 0.55))
                // Repulsion reaches across the full sphere so distant
                // clusters push each other apart globally. Barnes-Hut
                // approximation (default theta=0.9) keeps this affordable.
                .force('charge', force3D.forceManyBody()
                    .strength(-spacing * 0.5)
                    .distanceMax(R))
                // Shorter target distance + a stronger floor on link
                // strength so even weak links keep their endpoints close.
                .force('link', force3D.forceLink(links)
                    .id(d => d.id)
                    .distance(spacing * 0.9)
                    .strength(d => Math.max(0.4, Math.min(1, d.value || 0.5))))
                .force('surface', surfaceForce(R))
                .force('centroid', centroidForce())
                .on('tick', emitTick)

            // Send the initial post-construction positions immediately so
            // the main thread has something to draw before the first tick.
            emitTick()
            break
        }

        case 'addTime': sim && sim.alpha(Math.max(sim.alpha(), 0.05)).restart(); break
        case 'restart': sim && sim.alpha(1).restart(); break
        case 'pause':   sim && sim.stop(); break
        case 'resume':  sim && sim.alpha(Math.max(sim.alpha(), 0.3)).restart(); break

        case 'setPositions': {
            const buf = msg.positions   // Float32Array: [x, y, z] per node
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].x  = buf[i * 3]
                nodes[i].y  = buf[i * 3 + 1]
                nodes[i].z  = buf[i * 3 + 2]
                nodes[i].vx = 0
                nodes[i].vy = 0
                nodes[i].vz = 0
            }
            break
        }
    }
}

// Counteracts centroid drift — the tendency of link forces to pull the
// whole network toward one hemisphere, leaving a hole on the opposite side.
// Each tick it measures how far the network's center of mass has strayed
// from the sphere center and applies a gentle counter-velocity to all nodes.
function centroidForce() {
    const STRENGTH = 0.14
    return function () {
        let cx = 0, cy = 0, cz = 0
        const N = nodes.length
        for (const n of nodes) { cx += n.x; cy += n.y; cz += n.z }
        cx /= N; cy /= N; cz /= N
        for (const n of nodes) {
            n.vx -= cx * STRENGTH
            n.vy -= cy * STRENGTH
            n.vz -= cz * STRENGTH
        }
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
