// Shared projection state — all drawing modules read from s.projection

import * as d3  from 'd3'
import * as d3p from 'd3-geo-projection'

// ── Dynamic projection discovery ─────────────────────────────────────────────

const PARALLELS = [30, 60]

// Non-projection geo* exports to skip
const EXCLUDED = new Set([
    'geoIdentity', 'geoProjection', 'geoProjectionMutator',
])

// "geoAzimuthalEqualArea" → "Azimuthal Equal Area"
// "geoGinzburg4"          → "Ginzburg 4"
// "geoBertin1953"         → "Bertin 1953"
function toDisplayName(key) {
    return key.slice(3)                   // drop 'geo'
        .replace(/([A-Z])/g,  ' $1')     // camelCase → words
        .replace(/(\d+)/g,    ' $1')     // attach numbers as separate tokens
        .trim()
        .replace(/\s+/g, ' ')            // collapse any double spaces
}

function discoverProjections() {
    const map = {}

    // Iterate d3 first so its versions win on name collisions with d3p
    for (const [key, factory] of [...Object.entries(d3), ...Object.entries(d3p)]) {
        if (!key.startsWith('geo') || typeof factory !== 'function') continue
        if (EXCLUDED.has(key)) continue

        // A projection factory returns an object with fitExtent() and scale()
        let probe
        try { probe = factory() } catch (_) { continue }
        if (!probe || typeof probe.fitExtent !== 'function' || typeof probe.scale !== 'function') continue

        const name = toDisplayName(key)
        if (map[name]) continue   // already registered (d3 built-in takes priority)

        map[name] = () => {
            const p = factory()
            // Conic projections expose .parallels(); set sensible defaults
            if (typeof p.parallels === 'function') p.parallels(PARALLELS)
            return p
        }
    }

    // Sort alphabetically
    return Object.fromEntries(
        Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    )
}

export const PROJECTIONS = discoverProjections()

// ── Margins ───────────────────────────────────────────────────────────────────

export const MARGIN_X   = 60
export const MARGIN_GAP = 30

// ── Rotation state (used only for drag tracking, not embedded in projection) ─

let currentRotation = [0, 0, 0]

export function getRotation() { return currentRotation.slice() }
export function setRotation(r) { currentRotation = r.slice() }

// ── Projection builder ────────────────────────────────────────────────────────

function elementEdge(id, edge, fallback) {
    const el = document.getElementById(id)
    return el ? el.getBoundingClientRect()[edge] : fallback
}

export function buildProjection(name) {
    const factory = PROJECTIONS[name]
    if (!factory) throw new Error(`Unknown projection: ${name}`)

    const W      = window.innerWidth
    const H      = window.innerHeight
    const top    = elementEdge('projection-menu', 'bottom', 200) + MARGIN_GAP
    const bottom = elementEdge('controls', 'top', H - 100)       - MARGIN_GAP

    const extent = [[MARGIN_X, top], [W - MARGIN_X, bottom]]

    return factory()
        .fitExtent(extent, { type: 'Sphere' })
        .clipExtent(extent)
}
