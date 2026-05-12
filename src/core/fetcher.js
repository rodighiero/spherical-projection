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

import { getCached, setCached } from './cache'

const BASE          = 'https://api.openalex.org'
const MAX_AUTHORS   = 1000
const AUTHORS_PAGE  = 200
const WORKS_BATCH   = 25   // author IDs per works request
const CONCURRENCY   = 10   // parallel works requests

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

// ── Step 1 — search topics ────────────────────────────────────────────────────

export async function searchTopics(query) {
    const data = await get(`${BASE}/topics?search=${encodeURIComponent(query)}&per_page=8&select=id,display_name,subfield,works_count`)
    if (!data.results?.length) throw new Error(`No topics found for "${query}".`)
    return data.results.map(t => ({
        id:           shortId(t.id),
        display_name: t.display_name,
        subfield:     t.subfield?.display_name || null,
        works_count:  t.works_count || 0,
    }))
}

// ── Step 2 — fetch top authors ────────────────────────────────────────────────

async function fetchAuthors(topicId, onProgress) {
    const authors = []
    let cursor = '*'
    const select = [
        'id', 'display_name', 'works_count', 'cited_by_count',
        'topics', 'last_known_institutions',
    ].join(',')

    const baseUrl = `${BASE}/authors?filter=topics.id:${topicId}&sort=cited_by_count:desc&per_page=${AUTHORS_PAGE}&select=${select}`

    while (authors.length < MAX_AUTHORS) {
        const data = await get(`${baseUrl}&cursor=${cursor}`)
        if (!data.results?.length) break
        authors.push(...data.results)

        const pct = 5 + Math.min(24, Math.round(authors.length / MAX_AUTHORS * 24))
        onProgress({ step: 1, label: `Fetching top 1000 most-cited authors (${Math.round(authors.length / MAX_AUTHORS * 100)}%)`, pct })

        cursor = data.meta?.next_cursor
        if (!cursor) break
    }

    return authors.slice(0, MAX_AUTHORS)
}

// ── Step 3 — co-authorship via batched author works ───────────────────────────
// Fetches works for batches of authors in parallel. A shared seenWorkIds set
// ensures each work is processed exactly once even when it appears in multiple
// batches (co-authored by people from different batches).

async function fetchCoauthorships(topicId, authors, onProgress) {
    const authorSet  = new Set(authors.map(a => a.id))
    const edgeMap    = new Map()
    const seenWorkIds = new Set()

    const batches = []
    for (let i = 0; i < authors.length; i += WORKS_BATCH) {
        batches.push(authors.slice(i, i + WORKS_BATCH))
    }

    let doneBatches = 0

    async function processBatch(batch) {
        const ids  = batch.map(a => shortId(a.id)).join('|')
        const base = `${BASE}/works?filter=topics.id:${topicId},author.id:${ids}&select=id,authorships&per_page=200`
        let cursor = '*'

        while (cursor) {
            const data = await get(`${base}&cursor=${cursor}`)

            for (const work of data.results || []) {
                if (seenWorkIds.has(work.id)) continue
                seenWorkIds.add(work.id)

                const present = (work.authorships || [])
                    .map(a => a.author?.id)
                    .filter(id => id && authorSet.has(id))

                if (present.length < 2) continue

                for (let i = 0; i < present.length; i++) {
                    for (let j = i + 1; j < present.length; j++) {
                        const a = present[i], b = present[j]
                        const key = a < b ? `${a}§${b}` : `${b}§${a}`
                        edgeMap.set(key, (edgeMap.get(key) || 0) + 1)
                    }
                }
            }

            cursor = data.meta?.next_cursor || null
        }

        doneBatches++
        const pct = 30 + Math.round(doneBatches / batches.length * 55)
        onProgress({
            step: 2,
            label: `Building co-authorship · ${seenWorkIds.size.toLocaleString()} works`,
            pct,
        })
    }

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

    const nodes = authors.map(a => ({
        id:             a.id,
        name:           a.display_name,
        docs:           a.works_count    || 0,
        cited_by_count: a.cited_by_count || 0,
        peers:          [...(adj.get(a.id) || [])],
        topics:         (a.topics || []).slice(0, 8).map(t => t.display_name),
        institution:    a.last_known_institutions?.[0]?.display_name || null,
    }))

    return { nodes, links: rawLinks }
}

// ── Public API ────────────────────────────────────────────────────────────────

// topic is { id, display_name } — already resolved by the caller via searchTopics
export async function fetchNetwork(topic, onProgress) {
    const cached = getCached(topic.id)
    if (cached) {
        onProgress({ step: 3, label: 'Loaded from cache', pct: 100 })
        return cached
    }

    onProgress({ step: 1, label: `Topic: ${topic.display_name}`, pct: 3 })

    const authors = await fetchAuthors(topic.id, onProgress)
    if (authors.length < 10) throw new Error(`Too few authors found for "${topic.display_name}".`)

    const edgeMap = await fetchCoauthorships(topic.id, authors, onProgress)

    onProgress({ step: 3, label: 'Building graph…', pct: 87 })
    const { nodes, links } = buildGraph(authors, edgeMap)

    setCached(topic.id, nodes, links)

    onProgress({ step: 3, label: 'Starting simulation…', pct: 95 })
    return { nodes, links }
}
