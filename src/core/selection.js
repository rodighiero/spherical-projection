// Tracks the currently-selected node and its direct neighbours
// (computed once on selection from s.links). Drawing modules read
// this state to know what to emphasise vs fade.

let selected = null
const neighborIds = new Set()

export function getSelected() { return selected }
export function hasSelection() { return selected !== null }
export function isNeighbor(node) { return neighborIds.has(node.id) }

// A link endpoint is either a resolved node object or (before loadNetwork()
// resolves it) a raw id string — resolve to a bare id either way.
export function endpointId(endpoint) {
    return endpoint && endpoint.id != null ? endpoint.id : endpoint
}

export function isLinkActive(link) {
    if (!selected) return false
    const sId = endpointId(link.source)
    const tId = endpointId(link.target)
    return sId === selected.id || tId === selected.id
}

export function setSelected(node) {
    selected = node
    neighborIds.clear()
    if (!node) return
    for (const link of s.links) {
        const sId = endpointId(link.source)
        const tId = endpointId(link.target)
        if (sId === node.id) neighborIds.add(tId)
        if (tId === node.id) neighborIds.add(sId)
    }
}

// Find the projected node closest to a (world) point, within threshold px.
export function findNodeAt(x, y, threshold = 12) {
    let best = null
    let bestDist = threshold * threshold
    for (const node of s.nodes) {
        if (!node.spherical) continue
        const p = s.projection(node.spherical)
        if (!p) continue
        const dx = p[0] - x
        const dy = p[1] - y
        const d = dx * dx + dy * dy
        if (d < bestDist) {
            bestDist = d
            best = node
        }
    }
    return best
}
