// Export the current visualisation as PNG (composited canvas) or SVG
// (re-rendered through d3.geoPath without a context). Both flavours
// match the on-screen state, including selection highlights.

import * as d3 from 'd3'
import { isGraticuleVisible } from './graticule'
import {
    hasSelection, isLinkActive, isNeighbor, getSelected,
} from './selection'

const HIGHLIGHT = '#d62828'

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
    const W = window.innerWidth
    const H = window.innerHeight
    const scale = 2  // matches PIXI's resolution

    const out = document.createElement('canvas')
    out.width = W * scale
    out.height = H * scale
    const ctx = out.getContext('2d')

    // White ground first.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)

    // PIXI canvas (transparent overlay) on top.
    if (s.canvas) {
        ctx.drawImage(s.canvas, 0, 0, out.width, out.height)
    }

    out.toBlob(blob => {
        if (blob) triggerDownload(blob, fileName('png'))
    }, 'image/png')
}

export function downloadSVG() {
    const W = window.innerWidth
    const H = window.innerHeight
    const path = d3.geoPath(s.projection)

    const parts = []
    parts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" ` +
        `width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    )
    parts.push(`<rect width="${W}" height="${H}" fill="white"/>`)

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

    // All links collapsed into one path with a MultiLineString
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

    // Active links in red
    if (hasSelection()) {
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

    if (hasSelection()) {
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

function fileName(ext) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19)
    return `spherical-projection_${ts}.${ext}`
}
