import * as force3D from 'd3-force-3d'

import { drawLinks } from './links'
import { drawNodes } from './nodes'

const { cos, sin, atan2 } = Math

const halfPi = Math.PI / 2

const asin = (x) => x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x)

const spherical = ([x, y, z]) => [atan2(y, x), asin(z)]

export function simulation() {

    const sim = force3D.forceSimulation()
        .numDimensions(3)
        .nodes(s.nodes)
        .force("collide", d3.forceCollide().radius(60))
        .force("charge", d3.forceManyBody().strength(-20))
        .force("link", d3.forceLink(s.links).id(d => d.id).strength(d => d.value))
        .force("center", d3.forceCenter())
        .force("surface", function () {
            const R = 15 * Math.sqrt(s.nodes.length)

            for (const node of s.nodes) {
                if (node.fx) node.x = node.fx
                if (node.fy) node.y = node.fy
                if (node.fz) node.z = node.fz

                node.norm = Math.sqrt(node.x ** 2 + node.y ** 2 + node.z ** 2) || 1

                // Project to unit sphere and store as [lon, lat] in degrees
                node.spherical = spherical([
                    node.x / node.norm,
                    node.y / node.norm,
                    node.z / node.norm
                ]).map(d => (d * 180) / Math.PI)

                // Pull node towards sphere surface of radius R
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
        })
        .on('tick', ticked)

}

export function ticked() {
    drawLinks()
    drawNodes()
}
