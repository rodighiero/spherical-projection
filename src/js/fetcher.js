// Fetches a co-authorship network from the OpenAlex API for a given topic
// query string. Calls onProgress({ step, label, pct }) throughout so the
// UI can show a live status panel.
//
// Returns { nodes, links } in the app schema:
//   node  — { id, name, docs, cited_by_count, peers, topics, institution }
//   link  — { source, target, value, papers }
//
// IDs are OpenAlex URL strings ("https://openalex.org/A…"). The simulation
// worker and selection code both key on node.id, so string IDs work as-is.

const BASE          = 'https://api.openalex.org'
const MAX_AUTHORS   = 1000
const AUTHORS_PAGE  = 200
const WORKS_BATCH   = 50   // author IDs per works request
const CONCURRENCY   = 5    // parallel works requests

// ── Helpers ──────────────────────────────────────────────────────────────────

async function get(url) {
    const sep  = url.includes('?') ? '&' : '?'
    const full = `${url}${sep}mailto=spherical-projection`
    const res  = await fetch(full)
    if (!res.ok) throw new Error(`OpenAlex ${res.status}: ${url}`)
    return res.json()
}

function shortId(url) {
    // "https://openalex.org/T10102" → "T10102"
    return url ? url.split('/').pop() : null
}

// ── Step 1 — resolve topic ────────────────────────────────────────────────────

async function resolveTopic(query) {
    const data = await get(`${BASE}/topics?search=${encodeURIComponent(query)}&per_page=1`)
    const topic = data.results?.[0]
    if (!topic) throw new Error(`No topic found for "${query}".`)
    return { id: shortId(topic.id), display_name: topic.display_name }
}

// ── Step 2 — fetch top authors ────────────────────────────────────────────────

async function fetchAuthors(topicId, onProgress) {
    const authors = []
    let cursor = '*'
    const select = [
        'id', 'display_name', 'works_count', 'cited_by_count',
        'topics', 'last_known_institutions',
    ].join(',')

    while (authors.length < MAX_AUTHORS) {
        const url = [
            `${BASE}/authors`,
            `?filter=topics.id:${topicId}`,
            `&sort=cited_by_count:desc`,
            `&per_page=${AUTHORS_PAGE}`,
            `&cursor=${cursor}`,
            `&select=${select}`,
        ].join('')

        const data = await get(url)
        if (!data.results?.length) break
        authors.push(...data.results)

        const pct = 5 + Math.min(24, Math.round(authors.length / MAX_AUTHORS * 24))
        onProgress({ step: 1, label: `Fetching authors (${authors.length}…)`, pct })

        cursor = data.meta?.next_cursor
        if (!cursor) break
    }

    return authors.slice(0, MAX_AUTHORS)
}

// ── Step 3 — co-authorship via batched works queries ─────────────────────────

async function fetchCoauthorships(authors, onProgress) {
    const authorSet = new Set(authors.map(a => a.id))
    const edgeMap   = new Map()   // sorted "id1§id2" → shared paper count

    // Split authors into chunks of WORKS_BATCH
    const batches = []
    for (let i = 0; i < authors.length; i += WORKS_BATCH) {
        batches.push(authors.slice(i, i + WORKS_BATCH))
    }

    let done = 0

    async function processBatch(batch) {
        const ids  = batch.map(a => shortId(a.id)).join('|')
        const url  = `${BASE}/works?filter=author.id:${ids}&select=authorships&per_page=200`
        const data = await get(url)

        for (const work of data.results || []) {
            // Collect only authors that are in our set
            const present = (work.authorships || [])
                .map(a => a.author?.id)
                .filter(id => id && authorSet.has(id))

            for (let i = 0; i < present.length; i++) {
                for (let j = i + 1; j < present.length; j++) {
                    const key = [present[i], present[j]].sort().join('§')
                    edgeMap.set(key, (edgeMap.get(key) || 0) + 1)
                }
            }
        }

        done++
        const pct = 30 + Math.round(done / batches.length * 55)
        onProgress({ step: 2, label: `Building co-authorship (${Math.round(done / batches.length * 100)}%)`, pct })
    }

    // Run with limited concurrency
    for (let i = 0; i < batches.length; i += CONCURRENCY) {
        await Promise.all(batches.slice(i, i + CONCURRENCY).map(processBatch))
    }

    return edgeMap
}

// ── Step 4 — build graph, trim to largest connected component ─────────────────

function buildGraph(authors, edgeMap) {
    const adj = new Map(authors.map(a => [a.id, new Set()]))

    const rawLinks = []
    for (const [key, count] of edgeMap) {
        const [src, tgt] = key.split('§')
        if (!adj.has(src) || !adj.has(tgt)) continue
        adj.get(src).add(tgt)
        adj.get(tgt).add(src)
        rawLinks.push({ source: src, target: tgt, papers: count, value: Math.min(1, count / 10) })
    }

    // BFS to find the largest connected component
    const visited  = new Set()
    let largest    = []

    for (const { id } of authors) {
        if (visited.has(id)) continue
        const component = []
        const queue     = [id]
        visited.add(id)
        while (queue.length) {
            const cur = queue.shift()
            component.push(cur)
            for (const nb of adj.get(cur) || []) {
                if (!visited.has(nb)) { visited.add(nb); queue.push(nb) }
            }
        }
        if (component.length > largest.length) largest = component
    }

    const keep = new Set(largest)

    const nodes = authors
        .filter(a => keep.has(a.id))
        .map(a => ({
            id:             a.id,
            name:           a.display_name,
            docs:           a.works_count    || 0,
            cited_by_count: a.cited_by_count || 0,
            peers:          [...(adj.get(a.id) || [])].filter(id => keep.has(id)),
            topics:         (a.topics || []).slice(0, 8).map(t => t.display_name),
            institution:    a.last_known_institutions?.[0]?.display_name || null,
        }))

    const links = rawLinks.filter(l => keep.has(l.source) && keep.has(l.target))

    return { nodes, links }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchNetwork(query, onProgress) {
    onProgress({ step: 1, label: 'Resolving topic…', pct: 0 })

    const topic = await resolveTopic(query)
    onProgress({ step: 1, label: `Topic: ${topic.display_name}`, pct: 3 })

    const authors = await fetchAuthors(topic.id, onProgress)
    if (authors.length < 10) throw new Error(`Too few authors found for "${query}".`)

    const edgeMap = await fetchCoauthorships(authors, onProgress)

    onProgress({ step: 3, label: 'Building graph…', pct: 87 })
    const { nodes, links } = buildGraph(authors, edgeMap)

    onProgress({ step: 3, label: 'Starting simulation…', pct: 95 })
    return { nodes, links }
}
