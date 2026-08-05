// Persistent localStorage cache for two things fetched from OpenAlex:
//   sp:<topicId>   — the built network, { ts, nodes, links }
//   sp:q:<query>   — topic autocomplete results, { ts, topics }
// Both expire after TTL_MS so stale data is refreshed automatically.
//
// The search cache matters as much as the network cache: fetchNetwork()
// only ever runs after a topic has been resolved via searchTopics(), so a
// cached network is unreachable if that lookup itself isn't cached too —
// every visit would need one live request just to find the cached data.
//
// One 1 000-author network serialises to roughly 1 MB and localStorage
// gives us about 5 MB, so the cache fills after a handful of topics.
// setItem therefore evicts on quota failure — expired entries first,
// then oldest-fetched — instead of silently giving up.

const PREFIX     = 'sp:'
const SEARCH_KEY = query => PREFIX + 'q:' + query.trim().toLowerCase()
const TTL_MS     = 7 * 24 * 60 * 60 * 1000  // 1 week

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

function getItem(key) {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const { ts, ...rest } = JSON.parse(raw)
        if (Date.now() - ts > TTL_MS) {
            localStorage.removeItem(key)
            return null
        }
        return rest
    } catch (_) {
        return null
    }
}

function setItem(key, rest) {
    let payload
    try {
        payload = JSON.stringify({ ts: Date.now(), ...rest })
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

    // Nothing left to evict: this entry alone exceeds the quota.
    // Leave the cache empty and let the next call re-fetch.
}

// ── Networks, keyed by topic ID ─────────────────────────────────────────────

export function getCached(topicId) {
    return getItem(PREFIX + topicId)
}

export function setCached(topicId, nodes, links) {
    setItem(PREFIX + topicId, { nodes, links })
}

// ── Topic autocomplete, keyed by the search string ──────────────────────────

export function getCachedSearch(query) {
    return getItem(SEARCH_KEY(query))?.topics ?? null
}

export function setCachedSearch(query, topics) {
    setItem(SEARCH_KEY(query), { topics })
}
