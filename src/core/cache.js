// Persistent topic-network cache backed by localStorage.
// Key: topic short-ID.  Value: { ts, nodes, links }.
// Data expires after TTL_MS so stale networks are refreshed automatically.

const PREFIX = 'sp:'
const TTL_MS = 7 * 24 * 60 * 60 * 1000  // 1 week

export function getCached(topicId) {
    try {
        const raw = localStorage.getItem(PREFIX + topicId)
        if (!raw) return null
        const { ts, nodes, links } = JSON.parse(raw)
        if (Date.now() - ts > TTL_MS) {
            localStorage.removeItem(PREFIX + topicId)
            return null
        }
        return { nodes, links }
    } catch (_) {
        return null
    }
}

export function setCached(topicId, nodes, links) {
    try {
        localStorage.setItem(PREFIX + topicId, JSON.stringify({ ts: Date.now(), nodes, links }))
    } catch (_) {
        // Quota exceeded — skip caching silently
    }
}
