// CSS

import 'normalize.css'
import './index.css'

// Libraries

import * as d3 from 'd3'
import versor from 'versor'

// Init

import initPixi from './render/pixi.js'
import { initLinks, refreshGeoPath, drawLinks, setLinksVisible, isLinksVisible } from './render/links.js'
import { initNodes, drawNodes, setNodesVisible, isNodesVisible } from './render/nodes.js'
import {
    initGraticule, refreshGraticulePath, drawGraticule,
    setGraticuleVisible, isGraticuleVisible,
} from './render/graticule.js'
import background from './render/background'
import { simulation, resetSimulation, addTime, restart, pause, resume, resumeQuiet, isRunning, syncPositions } from './core/simulation'
import { PROJECTIONS, buildProjection, PANEL_MARGIN_PERCENT } from './core/projection.js'
import { FAMILY_ORDER, familyOf } from './core/projectionFamilies.js'
import { setSelected, findNodeAt } from './core/selection.js'
import { setInfoContent, updateInfoPosition } from './core/info.js'
import { downloadPNG, downloadSVG } from './core/download.js'
import { fetchNetwork, searchTopics } from './core/fetcher.js'

// Global state

window.d3 = d3

window.s = {
    nodes:          [],
    links:          [],
    projection:     null,
    projectionName: null,
    topic:          null,
    rotation:       [0, 0],
}

let networkActive = false   // true once a network has been loaded

// ── Projection selector ───────────────────────────────────────────────────────

// Not under cache.js's 'sp:' prefix on purpose — that prefix is scanned and
// TTL-pruned as fetched-network/search cache entries, and this is neither.
const LAST_PROJECTION_KEY = 'spherical-projection:last-projection'

function randomProjection() {
    const names = Object.keys(PROJECTIONS)
    return names[Math.floor(Math.random() * names.length)]
}

function loadLastProjection() {
    try {
        const saved = localStorage.getItem(LAST_PROJECTION_KEY)
        // No saved choice yet (first-ever visit) — open on a random
        // projection instead of always defaulting to the same one, but
        // once you've picked one it's remembered and restored as usual.
        return saved && PROJECTIONS[saved] ? saved : randomProjection()
    } catch (_) {
        return randomProjection()   // localStorage unavailable (private mode, etc.)
    }
}

let activeProjection = loadLastProjection()

// Matches the button min-width / column-gap / padding the CSS layout is
// built against — keep in sync with #projection-menu and
// #projection-menu .menu-column in index.css. Padding is subtracted
// because the menu is box-sizing: border-box, so its outer edge — not its
// content box — is what lands flush on --edge-margin. (.panel deliberately
// has no border, so there is none to account for.)
const MENU_ITEM_WIDTH = 95
const MENU_GAP        = 18
const MENU_PADDING_X  = 16

// Built once in initProjectionPanel(): a flat, family-grouped sequence of
// elements (a .menu-family header div ahead of each family's buttons).
// layoutProjectionMenu() only ever re-distributes these existing elements
// into column wrappers — it never recreates them, so listeners and the
// `.active` class survive a relayout.
let menuEntries = []

const isFamilyHeader = el => el.classList.contains('menu-family')

// Last column/row split actually built. A resize that doesn't cross a
// breakpoint then only rewrites widths, instead of tearing down and
// re-appending ~100 elements on every resize frame.
let menuShape = null

// Columns are independent top-to-bottom flex stacks (not CSS grid rows)
// specifically so a family header can be taller than a button row without
// dragging every other column's same row index out of alignment — grid rows
// are shared across all columns, flex columns aren't.
//
// Column/row counts are recomputed from how many MENU_ITEM_WIDTH-wide
// columns fit the window, then shrunk back to the minimum needed so a wide
// window never reserves a trailing empty column. Columns are then widened
// (gap stays fixed at MENU_GAP) to fill the margin-to-margin width exactly
// — MENU_ITEM_WIDTH is only ever a floor — so the outer columns' edges land
// flush on the same --edge-margin the rest of the UI uses, instead of
// leaving the leftover as dead space outside a tightly-packed block.
function layoutProjectionMenu() {
    const menu  = document.getElementById('projection-menu')
    const count = menuEntries.length
    if (!count) return

    const minMargin  = PANEL_MARGIN_PERCENT * Math.min(window.innerWidth, window.innerHeight)
    const outerWidth = window.innerWidth - 2 * minMargin
    const innerWidth = outerWidth - 2 * MENU_PADDING_X
    const maxColumns  = Math.max(1, Math.floor((innerWidth + MENU_GAP) / (MENU_ITEM_WIDTH + MENU_GAP)))
    const rows        = Math.ceil(count / maxColumns)
    const columns     = Math.ceil(count / rows)
    const columnWidth = (innerWidth - (columns - 1) * MENU_GAP) / columns

    menu.style.width = `${outerWidth}px`

    // Same split as last time — only the widths moved.
    if (menuShape && menuShape.rows === rows && menuShape.columns === columns) {
        for (const column of menu.children) column.style.width = `${columnWidth}px`
        return
    }
    menuShape = { rows, columns }

    menu.replaceChildren()

    let i = 0
    for (let c = 0; c < columns; c++) {
        let end = Math.min(i + rows, count)
        // Never end a column on a lone header with none of its own entries
        // below it — bump it into the next column instead. Guarded by
        // `end - 1 > i` so a column that would otherwise hold only that
        // header (rows === 1) keeps it rather than stalling forever.
        while (end - 1 > i && end < count && isFamilyHeader(menuEntries[end - 1])) end--

        const column = document.createElement('div')
        column.className = 'menu-column'
        column.style.width = `${columnWidth}px`
        for (; i < end; i++) column.appendChild(menuEntries[i])
        menu.appendChild(column)
    }
}

// Rebuild s.projection and repaint everything that reads it. Every path
// that changes the projection — a menu pick, a resize — goes through
// here, so none of them can forget a step. In particular the graticule is
// no longer redrawn per frame (see simulation.js), which makes
// refreshGraticulePath() + drawGraticule() easy to omit at a new call site.
function applyProjection() {
    s.projection     = buildProjection(activeProjection)
    s.projectionName = activeProjection
    refreshGeoPath()
    refreshGraticulePath()
    if (networkActive) { drawLinks(); drawNodes() }
    drawGraticule()
    updateInfoPosition()
}

function selectProjection(name) {
    if (name === activeProjection) return
    if (!PROJECTIONS[name]) return
    activeProjection = name
    try { localStorage.setItem(LAST_PROJECTION_KEY, name) } catch (_) { /* private mode etc. — non-fatal */ }
    document.querySelectorAll('#projection-menu button').forEach(b =>
        b.classList.toggle('active', b.dataset.name === name)
    )
    applyProjection()
    updateConfigDisplay()
}

function initProjectionPanel() {
    const namesByFamily = new Map(FAMILY_ORDER.map(family => [family, []]))
    Object.keys(PROJECTIONS).forEach(name => namesByFamily.get(familyOf(name)).push(name))

    FAMILY_ORDER.forEach(family => {
        const names = namesByFamily.get(family)
        if (!names.length) return

        const header = document.createElement('div')
        header.className = 'menu-family'
        header.textContent = family
        menuEntries.push(header)

        names.forEach(name => {
            const button = document.createElement('button')
            button.type = 'button'
            button.textContent = name
            button.dataset.name = name
            if (name === activeProjection) button.classList.add('active')
            button.addEventListener('click', () => selectProjection(name))
            menuEntries.push(button)
        })
    })

    layoutProjectionMenu()
}

// ── Config display ────────────────────────────────────────────────────────────

function updateConfigDisplay() {
    const projEl   = document.getElementById('config-projection')
    const familyEl = document.getElementById('config-family')
    if (!projEl) return
    projEl.textContent   = activeProjection
    familyEl.textContent = familyOf(activeProjection)
}

// Cumulative drag-to-rotate offset from the network's initial orientation —
// a quaternion so successive drags compose correctly (see initDragToRotate);
// reset to identity whenever a new network loads. [lambda, phi] read off it
// via versor.rotation() are themselves already a lon/lat-style rotation
// delta in degrees, not a node's actual coordinate — see CLAUDE.md's
// [lon, lat] node.spherical for the ellipse this angle rotates against.
let totalRotationQ = [1, 0, 0, 0]

function formatRotationDelta([lambda, phi]) {
    const sign = v => (v >= 0 ? '+' : '') + v.toFixed(1)
    return `lon ${sign(lambda)}°, lat ${sign(phi)}°`
}

// Defaults to the committed total, but a drag-in-progress passes its own
// (uncommitted) quaternion so the readout tracks the live drag without
// mutating totalRotationQ until the gesture actually ends.
function updateConfigRotation(q = totalRotationQ) {
    const rotation = versor.rotation(q)
    s.rotation = rotation
    const posEl = document.getElementById('config-position')
    if (!posEl) return
    posEl.textContent = formatRotationDelta(rotation)
}

// ── Simulation controls ───────────────────────────────────────────────────────

function initControls() {
    const controls  = document.getElementById('controls')
    const toggleBtn = controls.querySelector('[data-action="toggle"]')

    controls.addEventListener('click', e => {
        const action = e.target.dataset && e.target.dataset.action
        if (!action) return
        if (action === 'add')          addTime()
        else if (action === 'restart') restart()
        else if (action === 'toggle') {
            if (isRunning()) {
                pause()
                toggleBtn.textContent = 'Resume'
                toggleBtn.classList.add('paused')
            } else {
                resume()
                toggleBtn.textContent = 'Pause'
                toggleBtn.classList.remove('paused')
            }
        }
        else if (action === 'download-png') downloadPNG()
        else if (action === 'download-svg') downloadSVG()
    })
}

// ── View-layer toggles (graticule / links / nodes) ───────────────────────────
// Live in the #config panel, next to the projection name, rather than in
// #controls — they describe what's currently shown, same as that panel's text.

// data-action in index.html → the layer's visibility accessors. Adding a
// layer is one row here, not another branch in the click handler.
const LAYERS = {
    graticule: { get: isGraticuleVisible, set: setGraticuleVisible },
    links:     { get: isLinksVisible,     set: setLinksVisible },
    nodes:     { get: isNodesVisible,     set: setNodesVisible },
}

function initConfigToggles() {
    const toggles = document.getElementById('config-toggles')

    toggles.addEventListener('click', e => {
        // Each button holds a label span plus a '.toggle-state' span — a
        // click can land on either, so find the button itself rather than
        // trusting e.target to be it directly.
        const btn   = e.target.closest('[data-action]')
        const layer = btn && LAYERS[btn.dataset.action]
        if (!layer) return

        const next = !layer.get()
        layer.set(next)
        paintToggle(btn, next)
    })
}

function paintToggle(btn, on) {
    btn.classList.toggle('active', on)
    btn.querySelector('.toggle-state').textContent = on ? 'on' : 'off'
}

// Called once the render modules exist, so the panel reports each layer's
// real default instead of the one hardcoded in index.html — otherwise
// flipping a default in links.js/nodes.js/graticule.js silently leaves the
// panel claiming the opposite.
function syncConfigToggles() {
    document.querySelectorAll('#config-toggles [data-action]').forEach(btn => {
        const layer = LAYERS[btn.dataset.action]
        if (layer) paintToggle(btn, layer.get())
    })
}

// ── Loading progress UI ───────────────────────────────────────────────────────

const _loadingBarFill = document.getElementById('loading-bar-fill')
const _loadingSteps   = [...document.querySelectorAll('.loading-step')]

function setLoadingProgress({ step, label, pct }) {
    _loadingBarFill.style.width = `${pct}%`
    _loadingSteps.forEach(el => {
        const s = parseInt(el.dataset.step)
        el.classList.toggle('done',   s < step)
        el.classList.toggle('active', s === step)
        if (s === step) el.querySelector('.step-label').textContent = label
    })
}

// ── Search UI ─────────────────────────────────────────────────────────────────

// The panels that only make sense once a network exists. Flipped as one
// set by all three overlay states, so a new network-only panel is added
// here rather than in each of them.
function setNetworkChrome(on) {
    document.getElementById('search-overlay').hidden   = on
    document.getElementById('query-chip').hidden       = !on
    document.getElementById('config').hidden           = !on
    document.getElementById('controls-actions').hidden = !on
    document.getElementById('credit-title').disabled   = !on
}

function showSearchOverlay(errorMsg) {
    setNetworkChrome(false)
    // Reset to idle state
    document.getElementById('search-label').hidden      = false
    document.getElementById('search-bar').hidden        = false
    document.getElementById('loading-list').hidden      = true
    document.getElementById('loading-bar-track').hidden = true
    document.getElementById('search-input').disabled   = false
    setSearchError(errorMsg)
}

// Inline error inside the search overlay, without resetting the rest of
// its state the way showSearchOverlay() does.
function setSearchError(msg) {
    const errEl = document.getElementById('search-error')
    if (msg) {
        errEl.textContent = msg
        errEl.hidden = false
    } else {
        errEl.hidden = true
    }
}

function showLoadingOverlay(topic) {
    setNetworkChrome(false)
    document.getElementById('search-label').hidden      = true
    document.getElementById('search-bar').hidden        = true
    document.getElementById('search-error').hidden      = true
    document.getElementById('loading-bar-track').hidden = false

    // Populate the pinned topic item
    document.querySelector('#loading-topic-item .topic-name').textContent = topic.display_name
    document.querySelector('#loading-topic-item .topic-meta').textContent = topic.subfield || ''

    document.getElementById('loading-list').hidden = false
    setLoadingProgress({ step: 1, label: 'Fetching authors…', pct: 0 })
}

function showQueryChip(topic) {
    setNetworkChrome(true)
    document.getElementById('query-chip-label').textContent    = topic.display_name
    document.getElementById('query-chip-subfield').textContent = topic.subfield ? `subfield · ${topic.subfield}` : ''

    const N = s.nodes.length
    const L = s.links.length

    document.getElementById('query-chip-authors').textContent = `${N.toLocaleString()} authors`
    document.getElementById('query-chip-links').textContent   = `${L.toLocaleString()} links`

    const avgDeg = N ? (2 * L / N).toFixed(1) : 0
    document.getElementById('query-chip-degree').textContent =
        `avg ${avgDeg} co-authors`

    const maxLinks = N * (N - 1) / 2
    const density  = maxLinks ? (L / maxLinks) * 100 : 0
    document.getElementById('query-chip-density').textContent =
        `${density < 0.1 && density > 0 ? '<0.1' : density.toFixed(1)}% density`

    const totalCit = s.nodes.reduce((sum, n) => sum + (n.cited_by_count || 0), 0)
    document.getElementById('query-chip-citations').textContent =
        `${totalCit.toLocaleString()} citations`

    // Authors fetchNetwork() kept even though they had no co-authors in
    // this set — free-floating dots on the sphere (see CLAUDE.md, typically
    // ~8% of nodes).
    const connected = new Set()
    s.links.forEach(l => {
        if (l.source) connected.add(l.source.id ?? l.source)
        if (l.target) connected.add(l.target.id ?? l.target)
    })
    const isolated = s.nodes.filter(n => !connected.has(n.id)).length
    const isolatedPct = N ? Math.round((isolated / N) * 100) : 0
    document.getElementById('query-chip-isolated').textContent =
        `${isolated.toLocaleString()} isolated (${isolatedPct}%)`
}

// ── Network launch ────────────────────────────────────────────────────────────

function loadNetwork(nodes, links) {
    // Resolve link source/target IDs to node object references.
    const byId = new Map(nodes.map(n => [n.id, n]))
    s.nodes = nodes
    s.links = links.map(l => ({
        ...l,
        source: byId.get(l.source) || l.source,
        target: byId.get(l.target) || l.target,
    }))

    // drawGraticule() gates on s.nodes.length, so it stays hidden until a
    // network is actually loaded even if already toggled on — redraw it
    // explicitly now that the count just changed, since the per-frame
    // simulation loop no longer redraws the (position-independent) grid.
    drawGraticule()

    // A freshly (re)loaded network's Fibonacci-sphere seed is the new
    // "initial position" the rotation offset is measured from.
    totalRotationQ = [1, 0, 0, 0]
    updateConfigRotation()

    if (networkActive) {
        resetSimulation()
    } else {
        simulation()
        networkActive = true
    }
}

// ── Search submission ─────────────────────────────────────────────────────────

// topic is { id, display_name } as returned by searchTopics
async function runQuery(topic) {
    clearTopicList()
    showLoadingOverlay(topic)
    try {
        const { nodes, links } = await fetchNetwork(topic, setLoadingProgress)
        loadNetwork(nodes, links)
        s.topic = topic
        showQueryChip(topic)
    } catch (err) {
        console.error(err)
        showSearchOverlay(err.message || 'Something went wrong. Try again.')
    }
}

// ── Topic list helpers ────────────────────────────────────────────────────────

let _liveTopics = []   // last fetched topic results

function renderTopicList(topics) {
    _liveTopics = topics
    const list = document.getElementById('topic-list')
    list.innerHTML = ''
    if (!topics.length) { list.hidden = true; return }

    for (const topic of topics) {
        const li   = document.createElement('li')
        const name = document.createElement('span')
        name.className   = 'topic-name'
        name.textContent = topic.display_name
        const meta = document.createElement('span')
        meta.className   = 'topic-meta'
        meta.textContent = topic.subfield || ''
        li.appendChild(name)
        li.appendChild(meta)
        li.addEventListener('mousedown', e => {
            // mousedown fires before input blur, so we can intercept the click
            e.preventDefault()
            runQuery(topic)
        })
        list.appendChild(li)
    }
    list.hidden = false
}

function clearTopicList() {
    _liveTopics = []
    const list = document.getElementById('topic-list')
    list.innerHTML = ''
    list.hidden = true
}

function initSearch() {
    const input  = document.getElementById('search-input')
    const submit = document.getElementById('search-submit')
    const titleBtn = document.getElementById('credit-title')

    // Live search — debounced 300 ms
    let debounce = null
    input.addEventListener('input', () => {
        clearTimeout(debounce)
        setSearchError(null)
        const q = input.value.trim()
        if (!q) { clearTopicList(); return }
        debounce = setTimeout(async () => {
            try {
                const topics = await searchTopics(q)
                // Only render if the input still matches (user may have kept typing)
                if (input.value.trim() === q) renderTopicList(topics)
            } catch (err) {
                // Without this a failed lookup is indistinguishable from
                // "no matches" — which is exactly wrong when the real cause
                // is a rate limit or an exhausted quota.
                clearTopicList()
                if (input.value.trim() === q) {
                    setSearchError(err.message || 'Search failed. Try again.')
                }
            }
        }, 300)
    })

    // Enter / submit — pick the first result in the live list
    function go() {
        if (_liveTopics.length) runQuery(_liveTopics[0])
    }
    // mousedown would blur the input and clear _liveTopics before the
    // click lands, so suppress it — same trick as the list items above.
    submit.addEventListener('mousedown', e => e.preventDefault())
    submit.addEventListener('click', go)
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go() })

    // Hide list on blur (unless user is clicking a list item — prevented by mousedown)
    input.addEventListener('blur', () => clearTopicList())

    titleBtn.addEventListener('click', () => {
        pause()
        s.nodes = []
        s.links = []
        networkActive = false
        setSelected(null)
        setInfoContent(null)
        background()
        drawLinks()
        drawNodes()
        drawGraticule()

        input.value = ''
        clearTopicList()
        showSearchOverlay()
        input.focus()
    })
}

// ── Resize & hash navigation ──────────────────────────────────────────────────

function relayout() {
    background()
    layoutProjectionMenu()
    s.pixi.resize(window.innerWidth, window.innerHeight, window.innerWidth, window.innerHeight)
    applyProjection()
}

// ── Drag to rotate ────────────────────────────────────────────────────────────

function initDragToRotate() {
    const canvas = s.canvas

    const CLICK_THRESHOLD = 5
    let pending = false, pendingRotate = null, pendingDeltaQ = null
    let v0, initialPositions, moved, wasRunning

    function applyPendingRotation() {
        if (!pendingRotate || !initialPositions) return
        s.nodes.forEach((node, i) => {
            if (initialPositions[i]) node.spherical = pendingRotate(initialPositions[i])
        })
    }

    function scheduleRedraw() {
        if (pending) return
        pending = true
        requestAnimationFrame(() => {
            applyPendingRotation()
            pendingRotate = null
            if (pendingDeltaQ) updateConfigRotation(versor.multiply(pendingDeltaQ, totalRotationQ))
            if (networkActive) { drawLinks(); drawNodes() }
            pending = false
        })
    }

    d3.select(canvas).call(
        d3.drag()
            .on('start', event => {
                canvas.style.cursor = 'grabbing'
                wasRunning = isRunning()
                if (wasRunning) pause()
                const geo = s.projection.invert([event.x, event.y])
                v0 = geo ? versor.cartesian(geo) : null
                initialPositions = s.nodes.map(n => n.spherical ? n.spherical.slice() : null)
                moved = 0
            })
            .on('drag', event => {
                moved += Math.hypot(event.dx, event.dy)
                if (!v0) return
                const geo1 = s.projection.invert([event.x, event.y])
                if (!geo1) return
                // Quaternion form drives both the node rotation (via its
                // Euler equivalent, for d3.geoRotation) and the live
                // #config-position readout (composed on top of the total
                // committed so far, without mutating it — see scheduleRedraw).
                pendingDeltaQ = versor.delta(v0, versor.cartesian(geo1))
                pendingRotate = d3.geoRotation(versor.rotation(pendingDeltaQ))
                scheduleRedraw()
            })
            .on('end', event => {
                canvas.style.cursor = 'grab'
                applyPendingRotation()
                if (pendingDeltaQ) {
                    totalRotationQ = versor.multiply(pendingDeltaQ, totalRotationQ)
                    updateConfigRotation()
                }
                initialPositions = null
                pendingRotate = null
                pendingDeltaQ = null
                pending = false
                if (wasRunning) { syncPositions(s.nodes); resumeQuiet() }
                if (moved < CLICK_THRESHOLD) {
                    const w = s.pixi.toWorld(event.x, event.y)
                    selectNode(findNodeAt(w.x, w.y))
                }
            })
    )

    canvas.style.cursor = 'grab'
}

// ── Selection ─────────────────────────────────────────────────────────────────

function selectNode(node) {
    setSelected(node)
    setInfoContent(node)
    drawNodes()
    drawLinks()
    updateInfoPosition()
}

// ── Chrome (panel) visibility ─────────────────────────────────────────────────

function toggleChrome() {
    const hidden = document.body.classList.toggle('chrome-hidden')
    document.getElementById('chrome-toggle').textContent = hidden ? 'Show panels' : 'Hide panels'
}

function initChrome() {
    document.getElementById('chrome-toggle').addEventListener('click', toggleChrome)

    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') selectNode(null)
        // Ignore while typing — 'h' is a normal search-query character.
        else if (e.key.toLowerCase() === 'h' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            toggleChrome()
        }
    })
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

;(async () => {
    initProjectionPanel()
    initControls()
    initConfigToggles()
    initSearch()
    initChrome()

    s.projection     = buildProjection(activeProjection)
    s.projectionName = activeProjection

    await initPixi()
    initLinks()
    initNodes()
    initGraticule()

    // Show the projection name and the layers' real defaults from the first
    // frame — previously this only populated once the user touched a control.
    updateConfigDisplay()
    syncConfigToggles()

    background()

    // Coalesce bursts of resize events into one relayout per frame —
    // relayout() rebuilds the projection and repaints everything, so
    // running it twice for the same frame is pure waste.
    let relayoutPending = false
    window.addEventListener('resize', () => {
        if (relayoutPending) return
        relayoutPending = true
        requestAnimationFrame(() => { relayoutPending = false; relayout() })
    })

    initDragToRotate()

    showSearchOverlay()
    document.getElementById('search-input').focus()
})()
