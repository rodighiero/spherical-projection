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

// The map is centered in the window; MARGIN_PERCENT sets its minimum
// breathing room on every side, as a share of whichever screen dimension is
// smaller — the axis the map would reach the edge of first. Deliberately
// larger than PANEL_MARGIN_PERCENT (index.css's --edge-margin, also used by
// the projection menu's own layout below) to leave more room for the map to
// avoid overlapping the corner UI.
export const MARGIN_PERCENT = 0.10

// Kept separate from MARGIN_PERCENT — the panels sit closer to the window
// edge than the map does. Mirrored by --edge-margin in index.css; keep both
// in sync if this changes.
export const PANEL_MARGIN_PERCENT = 0.05

// ── Projection builder ────────────────────────────────────────────────────────

export function buildProjection(name) {
    const factory = PROJECTIONS[name]
    if (!factory) throw new Error(`Unknown projection: ${name}`)

    const W      = window.innerWidth
    const H      = window.innerHeight
    const margin = MARGIN_PERCENT * Math.min(W, H)

    const extent = [[margin, margin], [W - margin, H - margin]]

    const projection = factory()
        .fitExtent(extent, { type: 'Sphere' })
        .clipExtent(extent)

    // d3.geoPath resamples every great-circle link into a polyline whose
    // deviation from the true arc stays under this threshold (in projected
    // pixels) — the default (~0.71px) is fine detail wasted on links drawn
    // at 0.2–0.6px width. Coarsening it directly cuts the vertex count
    // draw calls are built from, with no visible effect at this line
    // weight. Not every discovered projection factory exposes it.
    if (typeof projection.precision === 'function') projection.precision(2)

    return projection
}
