// CSS

import '../node_modules/normalize.css/normalize.css'
import './index.css'

// Libraries

import * as d3 from 'd3'

// Init

import initPixi from './js/pixi.js'
import { initLinks, refreshGeoPath, drawLinks } from './js/links.js'
import { initNodes, drawNodes } from './js/nodes.js'
import {
    initGraticule, refreshGraticulePath, drawGraticule,
    setGraticuleVisible, isGraticuleVisible,
} from './js/graticule.js'
import background from './js/background'
import { simulation, resetSimulation, addTime, restart, pause, resume, isRunning } from './js/simulation'
import { PROJECTIONS, buildProjection, getRotation, setRotation } from './js/projection.js'
import { setSelected, findNodeAt } from './js/selection.js'
import { setInfoContent, updateInfoPosition } from './js/info.js'
import { downloadPNG, downloadSVG } from './js/download.js'
import { fetchNetwork, searchTopics } from './js/fetcher.js'

// Global state

window.d3 = d3

window.s = {
    nodes:           [],
    links:           [],
    projection:      null,
    networkRotation: d3.geoRotation([0, 0, 0]),
}

let networkActive = false   // true once a network has been loaded

// ── Projection selector ───────────────────────────────────────────────────────

let activeProjection = 'Mercator'

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
}

// ── Config display ────────────────────────────────────────────────────────────

function updateConfigDisplay() {
    const projEl = document.getElementById('config-projection')
    const rotEl  = document.getElementById('config-rotation')
    const gEl    = document.getElementById('config-graticule')
    if (!projEl) return
    projEl.textContent = activeProjection
    const r = getRotation()
    rotEl.textContent = `λ ${r[0].toFixed(0)}° · φ ${r[1].toFixed(0)}°`
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
        if (action === 'add')     addTime()
        if (action === 'restart') restart()
        if (action === 'toggle') {
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
        if (action === 'graticule') {
            const next = !isGraticuleVisible()
            setGraticuleVisible(next)
            e.target.classList.toggle('active', next)
            updateConfigDisplay()
        }
        if (action === 'download-png') downloadPNG()
        if (action === 'download-svg') downloadSVG()
    })
}

// ── Loading progress UI ───────────────────────────────────────────────────────

function setLoadingProgress({ step, label, pct }) {
    document.getElementById('loading-bar-fill').style.width = `${pct}%`

    document.querySelectorAll('.loading-step').forEach(el => {
        const s = parseInt(el.dataset.step)
        el.classList.toggle('done',   s < step)
        el.classList.toggle('active', s === step)
        if (s === step) el.querySelector('.step-label').textContent = label
    })
}

// ── Search UI ─────────────────────────────────────────────────────────────────

function showSearchOverlay(errorMsg) {
    document.getElementById('search-overlay').hidden  = false
    document.getElementById('loading-overlay').hidden = true
    document.getElementById('query-chip').hidden      = true

    const errEl = document.getElementById('search-error')
    if (errorMsg) {
        errEl.textContent = errorMsg
        errEl.hidden = false
    } else {
        errEl.hidden = true
    }
}

function showLoadingOverlay() {
    document.getElementById('search-overlay').hidden  = true
    document.getElementById('loading-overlay').hidden = false
    document.getElementById('query-chip').hidden      = true
    setLoadingProgress({ step: 1, label: 'Resolving topic…', pct: 0 })
}

function showQueryChip(query) {
    document.getElementById('search-overlay').hidden  = true
    document.getElementById('loading-overlay').hidden = true
    const chip = document.getElementById('query-chip')
    chip.hidden = false
    document.getElementById('query-chip-label').textContent = query

    const N = s.nodes.length
    const L = s.links.length

    document.getElementById('query-chip-stats').textContent =
        `${N.toLocaleString()} authors · ${L.toLocaleString()} links`

    const avgDeg = N ? (2 * L / N).toFixed(1) : 0
    document.getElementById('query-chip-degree').textContent =
        `avg ${avgDeg} co-authors`

    const totalCit = s.nodes.reduce((sum, n) => sum + (n.cited_by_count || 0), 0)
    document.getElementById('query-chip-citations').textContent =
        `${totalCit.toLocaleString()} citations`

    const topNode = s.nodes.reduce(
        (best, n) => (n.cited_by_count || 0) > (best.cited_by_count || 0) ? n : best,
        s.nodes[0] || {}
    )
    document.getElementById('query-chip-top').textContent =
        topNode.name ? `top: ${topNode.name}` : ''
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
    showLoadingOverlay()
    try {
        const { nodes, links } = await fetchNetwork(topic, setLoadingProgress)
        loadNetwork(nodes, links)
        showQueryChip(topic.display_name)
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
        const parts = []
        if (topic.subfield)    parts.push(topic.subfield)
        if (topic.works_count) parts.push(`${topic.works_count.toLocaleString()} works`)
        meta.textContent = parts.join(' · ')
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
        const q = input.value.trim()
        if (!q) { clearTopicList(); return }
        debounce = setTimeout(async () => {
            try {
                const topics = await searchTopics(q)
                // Only render if the input still matches (user may have kept typing)
                if (input.value.trim() === q) renderTopicList(topics)
            } catch (_) {
                clearTopicList()
            }
        }, 300)
    })

    // Enter / submit — pick the first result in the live list
    function go() {
        if (_liveTopics.length) runQuery(_liveTopics[0])
    }
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
    const canvas = document.querySelector('body > canvas:last-of-type')
    if (!canvas) return
    canvas.style.cursor = 'grab'

    const CLICK_THRESHOLD = 5
    let dragging = false, start = null, r0 = null, moved = 0, pending = false

    function scheduleRedraw() {
        if (pending) return
        pending = true
        requestAnimationFrame(() => {
            if (networkActive) { drawLinks(); drawNodes() }
            drawGraticule()
            updateInfoPosition()
            updateConfigDisplay()
            pending = false
        })
    }

    canvas.addEventListener('pointerdown', e => {
        dragging = true; start = [e.clientX, e.clientY]
        r0 = getRotation(); moved = 0
        canvas.style.cursor = 'grabbing'
        canvas.setPointerCapture(e.pointerId)
    })

    canvas.addEventListener('pointermove', e => {
        if (!dragging) return
        const dx = e.clientX - start[0]
        const dy = e.clientY - start[1]
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy))

        // Convert pixel delta to degrees using the projection's actual
        // scale (pixels per radian). This gives 1:1 cursor-to-network
        // movement regardless of which projection or window size is active.
        const sens = 180 / (Math.PI * s.projection.scale())
        const r = [r0[0] + dx * sens, r0[1] - dy * sens, r0[2]]
        r[1] = Math.max(-90, Math.min(90, r[1]))
        setRotation(r)
        s.networkRotation = d3.geoRotation(r)
        scheduleRedraw()
    })

    function endDrag(e) {
        if (!dragging) return
        dragging = false
        canvas.style.cursor = 'grab'
        try { canvas.releasePointerCapture(e.pointerId) } catch (_) {}
        if (moved < CLICK_THRESHOLD) {
            const w = s.pixi.toWorld(e.clientX, e.clientY)
            selectNode(findNodeAt(w.x, w.y))
        }
    }

    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)
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
