// Shareable deep links. The URL mirrors the export file name
// (topic_projection_lonX_latY, see download.js) parameter for parameter, so a
// printed figure's file name maps directly onto the link that reopens it:
//
//   ?topic=machine-learning-and-algorithms&projection=peirce-quincuncial&lon=0&lat=0
//
// Both sides format through the helpers below — change them here, not in
// either caller, or file names and links drift apart.

import { PROJECTIONS } from './projection.js'

export function slugify(str) {
    return str
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // strip accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export const formatAngle = v => v.toFixed(1)

const projectionBySlug = new Map(Object.keys(PROJECTIONS).map(name => [slugify(name), name]))

function readAngle(params, key, limit) {
    const v = Number(params.get(key))
    return params.has(key) && Number.isFinite(v) && Math.abs(v) <= limit ? v : 0
}

// Invalid or missing values come back as null / 0, so the caller falls
// through to its usual defaults without special-casing a bad link.
export function readPermalink() {
    const params = new URLSearchParams(window.location.search)
    const topic  = params.get('topic')
    return {
        topicSlug:  topic && slugify(topic) === topic ? topic : null,
        projection: projectionBySlug.get(params.get('projection')) || null,
        rotation:   [readAngle(params, 'lon', 180), readAngle(params, 'lat', 90)],
    }
}

// Reflects what's on screen, via replaceState so dragging and flipping
// projections don't flood the back button with history entries.
export function writePermalink() {
    const params = new URLSearchParams()
    if (s.topic && s.topic.display_name) params.set('topic', slugify(s.topic.display_name))
    if (s.projectionName) params.set('projection', slugify(s.projectionName))
    if (s.topic) {
        const [lambda, phi] = s.rotation
        params.set('lon', formatAngle(lambda))
        params.set('lat', formatAngle(phi))
    }
    const url = `${window.location.pathname}?${params}${window.location.hash}`
    history.replaceState(history.state, '', url)
}
