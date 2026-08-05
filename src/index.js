// CSS

import 'normalize.css'
import './index.css'

// Libraries

import * as d3 from 'd3'
import versor from 'versor'

// Init

import initPixi from './render/pixi.js'
import { initLinks, refreshGeoPath, drawLinks } from './render/links.js'
import { initNodes, drawNodes } from './render/nodes.js'
import {
    initGraticule, refreshGraticulePath, drawGraticule,
    setGraticuleVisible, isGraticuleVisible,
} from './render/graticule.js'
import background from './render/background'
import { simulation, resetSimulation, addTime, restart, pause, resume, resumeQuiet, isRunning, syncPositions } from './core/simulation'
import { PROJECTIONS, buildProjection } from './core/projection.js'
import { setSelected, findNodeAt } from './core/selection.js'
import { setInfoContent, updateInfoPosition } from './core/info.js'
import { downloadPNG, downloadSVG } from './core/download.js'
import { fetchNetwork, searchTopics } from './core/fetcher.js'

// Global state

window.d3 = d3

window.s = {
    nodes:      [],
    links:      [],
    projection: null,
}

let networkActive = false   // true once a network has been loaded

// ── Projection selector ───────────────────────────────────────────────────────

let activeProjection = 'Mercator'

// Matches the button min-width / column-gap the CSS grid is built against —
// keep in sync with #projection-menu button / column-gap in index.css.
const MENU_ITEM_WIDTH = 95
const MENU_GAP        = 18
const MENU_MIN_MARGIN = 24   // smallest the lateral margins are allowed to shrink to

// CSS multi-column's own `column-fill: balance` produced lopsided columns
// (some 10 items deep, others 7) because the browser balances by estimated
// height rather than item count. Driving the grid explicitly — one row
// count for every column, computed from how many columns actually fit —
// guarantees every column but the last holds exactly the same number of
// entries, and re-deriving it on demand keeps it correct as columns
// added/removed with the window width.
//
// Columns are sized to their natural width (not stretched with `1fr`) and
// the menu is then centered via CSS transform, so leftover width becomes
// equal left/right margins instead of dead space stuck on one side.
function layoutProjectionMenu() {
    const menu  = document.getElementById('projection-menu')
    const count = menu.children.length
    if (!count) return
    const available  = window.innerWidth - 2 * MENU_MIN_MARGIN
    const maxColumns = Math.max(1, Math.floor((available + MENU_GAP) / (MENU_ITEM_WIDTH + MENU_GAP)))
    const rows       = Math.ceil(count / maxColumns)
    // maxColumns is how many columns *fit* — shrink back down to how many
    // are actually *needed* to hold `count` items at that row count, or a
    // wide-enough window reserves a trailing column no button ever lands in.
    const columns    = Math.ceil(count / rows)
    const width      = columns * MENU_ITEM_WIDTH + (columns - 1) * MENU_GAP
    menu.style.width               = `${width}px`
    menu.style.gridTemplateColumns = `repeat(${columns}, ${MENU_ITEM_WIDTH}px)`
    menu.style.gridTemplateRows    = `repeat(${rows}, auto)`
}

function selectProjection(name) {
    if (name === activeProjection) return
    if (!PROJECTIONS[name]) return
    activeProjection = name
    document.querySelectorAll('#projection-menu button').forEach(b =>
        b.classList.toggle('active', b.dataset.name === name)
    )
    s.projection = buildProjection(name)
    refreshGeoPath()
    refreshGraticulePath()
    if (networkActive) { drawLinks(); drawNodes() }
    drawGraticule()
    updateInfoPosition()
    updateConfigDisplay()
}

function initProjectionPanel() {
    const menu = document.getElementById('projection-menu')
    Object.keys(PROJECTIONS).forEach(name => {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = name
        button.dataset.name = name
        if (name === activeProjection) button.classList.add('active')
        button.addEventListener('click', () => selectProjection(name))
        menu.appendChild(button)
    })
    layoutProjectionMenu()
}

// ── Config display ────────────────────────────────────────────────────────────

function updateConfigDisplay() {
    const projEl = document.getElementById('config-projection')
    const gEl    = document.getElementById('config-graticule')
    if (!projEl) return
    projEl.textContent = activeProjection
    gEl.textContent = `Graticule ${isGraticuleVisible() ? 'on' : 'off'}`
    gEl.hidden = false
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
        else if (action === 'graticule') {
            const next = !isGraticuleVisible()
            setGraticuleVisible(next)
            e.target.classList.toggle('active', next)
            updateConfigDisplay()
        }
        else if (action === 'download-png') downloadPNG()
        else if (action === 'download-svg') downloadSVG()
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

function showSearchOverlay(errorMsg) {
    document.getElementById('search-overlay').hidden    = false
    document.getElementById('query-chip').hidden        = true
    // Reset to idle state
    document.getElementById('search-label').hidden      = false
    document.getElementById('search-bar').hidden        = false
    document.getElementById('loading-list').hidden      = true
    document.getElementById('loading-bar-track').hidden = true
    document.getElementById('search-input').disabled   = false

    const errEl = document.getElementById('search-error')
    if (errorMsg) {
        errEl.textContent = errorMsg
        errEl.hidden = false
    } else {
        errEl.hidden = true
    }
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
    document.getElementById('search-overlay').hidden    = false
    document.getElementById('query-chip').hidden        = true
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
    document.getElementById('search-overlay').hidden  = true
    const chip = document.getElementById('query-chip')
    chip.hidden = false
    document.getElementById('query-chip-label').textContent    = topic.display_name
    document.getElementById('query-chip-subfield').textContent = topic.subfield ? `subfield · ${topic.subfield}` : ''

    const N = s.nodes.length
    const L = s.links.length

    document.getElementById('query-chip-authors').textContent = `${N.toLocaleString()} authors`
    document.getElementById('query-chip-links').textContent   = `${L.toLocaleString()} links`

    const avgDeg = N ? (2 * L / N).toFixed(1) : 0
    document.getElementById('query-chip-degree').textContent =
        `avg ${avgDeg} co-authors`

    const totalCit = s.nodes.reduce((sum, n) => sum + (n.cited_by_count || 0), 0)
    document.getElementById('query-chip-citations').textContent =
        `${totalCit.toLocaleString()} citations`

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
    const newBtn = document.getElementById('new-query-btn')

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

    newBtn.addEventListener('click', () => {
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
    s.projection = buildProjection(activeProjection)
    refreshGeoPath()
    refreshGraticulePath()
    s.pixi.resize(window.innerWidth, window.innerHeight, window.innerWidth, window.innerHeight)
    if (networkActive) { drawLinks(); drawNodes() }
    drawGraticule()
    updateInfoPosition()
}

// ── Drag to rotate ────────────────────────────────────────────────────────────

function initDragToRotate() {
    const canvas = s.canvas

    const CLICK_THRESHOLD = 5
    let pending = false, pendingRotate = null
    let v0, initialPositions, moved, wasRunning

    function scheduleRedraw() {
        if (pending) return
        pending = true
        requestAnimationFrame(() => {
            if (pendingRotate && initialPositions) {
                s.nodes.forEach((node, i) => {
                    if (initialPositions[i]) node.spherical = pendingRotate(initialPositions[i])
                })
                pendingRotate = null
            }
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
                const delta = versor.rotation(versor.delta(v0, versor.cartesian(geo1)))
                pendingRotate = d3.geoRotation(delta)
                scheduleRedraw()
            })
            .on('end', event => {
                canvas.style.cursor = 'grab'
                if (pendingRotate && initialPositions) {
                    s.nodes.forEach((node, i) => {
                        if (initialPositions[i]) node.spherical = pendingRotate(initialPositions[i])
                    })
                }
                initialPositions = null
                pendingRotate = null
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

window.addEventListener('keydown', e => {
    if (e.key === 'Escape') selectNode(null)
})

// ── Bootstrap ─────────────────────────────────────────────────────────────────

;(async () => {
    initProjectionPanel()
    initControls()
    initSearch()

    s.projection = buildProjection(activeProjection)

    await initPixi()
    initLinks()
    initNodes()
    initGraticule()

    background()

    window.addEventListener('resize', () => requestAnimationFrame(relayout))

    initDragToRotate()

    showSearchOverlay()
    document.getElementById('search-input').focus()
})()
