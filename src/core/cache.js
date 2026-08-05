// Persistent topic-network cache backed by localStorage.
// Key: topic short-ID.  Value: { ts, nodes, links }.
// Data expires after TTL_MS so stale networks are refreshed automatically.
//
// One 1 000-author network serialises to roughly 1 MB and localStorage
// gives us about 5 MB, so the cache fills after a handful of topics.
// setCached therefore evicts on quota failure — expired entries first,
// then oldest-fetched — instead of silently giving up.

const PREFIX = 'sp:'
const TTL_MS = 7 * 24 * 60 * 60 * 1000  // 1 week

// Every cache entry as { key, ts }, oldest first. Entries we can't parse
// get ts = 0 so they sort to the front and are evicted first.
function entries() {
    const out = []
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith(PREFIX)) continue
        let ts = 0
        try { ts = JSON.parse(localStorage.getItem(key)).ts || 0 } catch (_) { /* ts stays 0 */ }
        out.push({ key, ts })
    }
    return out.sort((a, b) => a.ts - b.ts)
}

function pruneExpired() {
    const cutoff = Date.now() - TTL_MS
    for (const { key, ts } of entries()) {
        if (ts < cutoff) localStorage.removeItem(key)
    }
}

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
    const key = PREFIX + topicId

    let payload
    try {
        payload = JSON.stringify({ ts: Date.now(), nodes, links })
    } catch (_) {
        return   // not serialisable — nothing to cache
    }

    const write = () => {
        try { localStorage.setItem(key, payload); return true } catch (_) { return false }
    }

    if (write()) return

    // Out of room. Reclaim anything already expired, then retry.
    pruneExpired()
    if (write()) return

    // Still too big — drop the oldest live entries one at a time.
    for (const { key: victim } of entries()) {
        if (victim === key) continue
        localStorage.removeItem(victim)
        if (write()) return
    }

    // Nothing left to evict: this network alone exceeds the quota.
    // Leave the cache empty and let the next query re-fetch.
}
