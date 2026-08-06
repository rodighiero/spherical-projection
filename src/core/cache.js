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

const PREFIX        = 'sp:'
const SEARCH_PREFIX = PREFIX + 'q:'
const SEARCH_KEY    = query => SEARCH_PREFIX + query.trim().toLowerCase()
const TTL_MS        = 7 * 24 * 60 * 60 * 1000  // 1 week

const isSearchKey = key => key.startsWith(SEARCH_PREFIX)

// setItem always serialises `ts` first, so it can be read straight off the
// raw string. Worth the regex: a network entry is ~1 MB, and JSON.parse-ing
// one to reach a single integer materialises a thousand node objects and
// thousands of links only to discard them.
const TS_RE = /^\{"ts":(\d+)/

// Every cache entry as { key, ts }, oldest first. Entries we can't read a
// timestamp from get ts = 0 so they sort to the front and are evicted first.
function entries() {
    const out = []
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith(PREFIX)) continue
        const match = TS_RE.exec(localStorage.getItem(key) || '')
        out.push({ key, ts: match ? Number(match[1]) : 0 })
    }
    return out.sort((a, b) => a.ts - b.ts)
}

// Drops everything past its TTL and returns the entries that survived, so
// callers that go on to evict don't have to rescan the whole cache.
function pruneExpired() {
    const cutoff = Date.now() - TTL_MS
    const live = []
    for (const entry of entries()) {
        if (entry.ts < cutoff) localStorage.removeItem(entry.key)
        else live.push(entry)
    }
    return live
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

// `canEvict` optionally narrows which entries this write is allowed to
// sacrifice. Autocomplete passes one: a few hundred bytes of search result
// must never be the reason a ~1 MB network gets dropped, or typing a dozen
// characters against a full cache would walk every cached network out and
// turn each one back into a 30s refetch.
function setItem(key, rest, canEvict = () => true) {
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
    const live = pruneExpired()
    if (write()) return

    // Still too big — drop the oldest live entries one at a time, reusing
    // the list pruneExpired() just built rather than rescanning.
    for (const { key: victim } of live) {
        if (victim === key || !canEvict(victim)) continue
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
    setItem(SEARCH_KEY(query), { topics }, isSearchKey)
}
