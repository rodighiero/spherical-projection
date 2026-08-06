// Export the current visualisation as PNG (rendered through PIXI's extract
// system) or SVG (re-rendered through d3.geoPath without a context). Both
// flavours capture the full window, not just the sphere, and match the
// on-screen state including selection highlights.

import * as d3 from 'd3'
import { Rectangle } from 'pixi.js'
import { isGraticuleVisible } from '../render/graticule'
import { isLinksVisible } from '../render/links'
import { isNodesVisible } from '../render/nodes'
import {
    hasSelection, isLinkActive, isNeighbor, getSelected,
} from './selection'

const HIGHLIGHT = '#d62828'

// ISO A3 landscape (420 x 297mm) at 300dpi — the resolution target for
// exports, independent of how many CSS pixels the browser window happens to
// be. Whichever axis is the tighter fit sets the scale, so the export is at
// least this sharp on both dimensions regardless of window aspect ratio.
const A3_LANDSCAPE_PX = { w: 4961, h: 3508 }

function windowFrame() {
    return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function downloadPNG() {
    const { x, y, w, h } = windowFrame()
    const resolution = Math.max(A3_LANDSCAPE_PX.w / w, A3_LANDSCAPE_PX.h / h)

    // extract.canvas does its own offscreen render pass at the requested
    // resolution — decoupled from the live PIXI canvas, so this can exceed
    // the on-screen render quality without touching it.
    const canvas = s.renderer.extract.canvas({
        target:     s.pixi,
        frame:      new Rectangle(x, y, w, h),
        resolution,
        clearColor: '#ffffff',
    })

    canvas.toBlob(blob => {
        if (blob) triggerDownload(blob, fileName('png'))
    }, 'image/png')
}

export function downloadSVG() {
    const { x, y, w, h } = windowFrame()
    const path = d3.geoPath(s.projection)

    const parts = []
    parts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" ` +
        `width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">`
    )
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white"/>`)

    // Sphere outline
    const sphereD = path({ type: 'Sphere' })
    if (sphereD) {
        parts.push(
            `<path d="${sphereD}" fill="none" ` +
            `stroke="black" stroke-opacity="0.5" stroke-width="1"/>`
        )
    }

    // Graticule
    if (isGraticuleVisible()) {
        const gD = path(d3.geoGraticule10())
        if (gD) {
            parts.push(
                `<path d="${gD}" fill="none" ` +
                `stroke="black" stroke-opacity="0.18" stroke-width="1"/>`
            )
        }
    }

    // All links collapsed into one path with a MultiLineString. Gated on
    // the same toggle as the screen — the sphere outline above is drawn
    // regardless, matching links.js.
    if (isLinksVisible()) {
        const lines = []
        s.links.forEach(link => {
            const a = link.source && link.source.spherical
            const b = link.target && link.target.spherical
            if (a && b) lines.push([a, b])
        })
        const linksD = path({ type: 'MultiLineString', coordinates: lines })
        if (linksD) {
            parts.push(
                `<path d="${linksD}" fill="none" ` +
                `stroke="black" stroke-opacity="0.3" stroke-width="0.5"/>`
            )
        }
    }

    // Active links in red
    if (isLinksVisible() && hasSelection()) {
        const active = []
        s.links.forEach(link => {
            if (!isLinkActive(link)) return
            const a = link.source && link.source.spherical
            const b = link.target && link.target.spherical
            if (a && b) active.push([a, b])
        })
        const activeD = path({ type: 'MultiLineString', coordinates: active })
        if (activeD) {
            parts.push(
                `<path d="${activeD}" fill="none" ` +
                `stroke="${HIGHLIGHT}" stroke-opacity="0.75" stroke-width="1"/>`
            )
        }
    }

    // All nodes
    if (isNodesVisible()) {
        parts.push(`<g fill="black" fill-opacity="0.9">`)
        s.nodes.forEach(node => {
            if (!node.spherical) return
            const pos = s.projection(node.spherical)
            if (!pos) return
            parts.push(
                `<circle cx="${pos[0].toFixed(1)}" cy="${pos[1].toFixed(1)}" r="0.7"/>`
            )
        })
        parts.push(`</g>`)
    }

    if (isNodesVisible() && hasSelection()) {
        // Neighbours
        parts.push(`<g fill="${HIGHLIGHT}">`)
        s.nodes.forEach(node => {
            if (!node.spherical || !isNeighbor(node)) return
            const pos = s.projection(node.spherical)
            if (!pos) return
            parts.push(
                `<circle cx="${pos[0].toFixed(1)}" cy="${pos[1].toFixed(1)}" r="1.4"/>`
            )
        })
        parts.push(`</g>`)

        // Selected node + outer ring
        const sel = getSelected()
        if (sel && sel.spherical) {
            const pos = s.projection(sel.spherical)
            if (pos) {
                const x = pos[0].toFixed(1)
                const y = pos[1].toFixed(1)
                parts.push(`<circle cx="${x}" cy="${y}" r="2.8" fill="${HIGHLIGHT}"/>`)
                parts.push(
                    `<circle cx="${x}" cy="${y}" r="6" fill="none" ` +
                    `stroke="${HIGHLIGHT}" stroke-opacity="0.6" stroke-width="0.8"/>`
                )
            }
        }
    }

    parts.push(`</svg>`)

    const blob = new Blob([parts.join('')], { type: 'image/svg+xml;charset=utf-8' })
    triggerDownload(blob, fileName('svg'))
}

function slugify(str) {
    return str
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')   // strip accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function fileName(ext) {
    const parts = []
    if (s.topic && s.topic.display_name) parts.push(slugify(s.topic.display_name))
    if (s.projectionName) parts.push(slugify(s.projectionName))
    if (s.rotation) {
        const [lambda, phi] = s.rotation
        parts.push(`lon${lambda.toFixed(1)}_lat${phi.toFixed(1)}`)
    }
    return `${parts.join('_') || 'export'}.${ext}`
}
