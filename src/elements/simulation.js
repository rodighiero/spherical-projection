import * as force3D from 'd3-force-3d'

import { drawLinks } from './links'
import { drawNodes } from './nodes'

const halfPi = Math.PI / 2
const asin = (x) => x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x)
const spherical = ([x, y, z]) => [Math.atan2(y, x), asin(z)]

let sim

export function simulation() {

    const N = s.nodes.length
    const R = 15 * Math.sqrt(N)
    // Average geodesic spacing between nodes on the sphere surface,
    // used as the natural unit for collision radius and link distance.
    const spacing = 2 * R * Math.sqrt(Math.PI / N)

    // Use d3-force-3d's n-dimensional forces — vanilla d3.force* only act
    // on x/y, which would leave the z axis undriven during settling.
    sim = force3D.forceSimulation()
        .numDimensions(3)
        .nodes(s.nodes)
        .alphaDecay(0.01)        // slower cooldown → better settling
        .velocityDecay(0.35)
        .force('collide', force3D.forceCollide().radius(spacing * 0.7))
        .force('charge', force3D.forceManyBody().strength(-spacing * 0.6))
        .force('link', force3D.forceLink(s.links)
            .id(d => d.id)
            .distance(spacing * 1.4)
            .strength(d => Math.min(1, (d.value || 0.3))))
        .force('surface', surfaceForce(R))
        .on('tick', ticked)
}

function surfaceForce(R) {
    return function () {
        for (const node of s.nodes) {
            if (node.fx != null) node.x = node.fx
            if (node.fy != null) node.y = node.fy
            if (node.fz != null) node.z = node.fz

            node.norm = Math.sqrt(node.x ** 2 + node.y ** 2 + node.z ** 2) || 1

            // Project to unit sphere and store as [lon, lat] in degrees
            node.spherical = spherical([
                node.x / node.norm,
                node.y / node.norm,
                node.z / node.norm
            ]).map(d => (d * 180) / Math.PI)

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

export function ticked() {
    drawLinks()
    drawNodes()
}

// Controls

export function addTime()  { if (sim) sim.alpha(0.4).restart() }
export function restart()  { if (sim) sim.alpha(1).restart() }
export function pause()    { if (sim) sim.stop() }
export function resume()   { if (sim) sim.alpha(Math.max(sim.alpha(), 0.3)).restart() }
export function isRunning() {
    return !!sim && sim.alpha() > sim.alphaMin()
}
