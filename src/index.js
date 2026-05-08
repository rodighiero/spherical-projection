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
import { fetchNetwork } from './js/fetcher.js'

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
    addTime()
    writeHash()
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

// ── URL hash ──────────────────────────────────────────────────────────────────

function parseHash() {
    const raw = window.location.hash.slice(1)
    if (!raw) return null
    const params = new URLSearchParams(raw)
    const proj   = params.get('proj')
    const rStr   = params.get('r')
    const gStr   = params.get('g')
    const rotation = rStr
        ? rStr.split(',').map(Number).filter(n => !Number.isNaN(n))
        : null
    return {
        projection: proj && PROJECTIONS[proj] ? proj : null,
        rotation:   rotation && rotation.length === 3 ? rotation : null,
        graticule:  gStr === '1' ? true : gStr === '0' ? false : null,
    }
}

function writeHash() {
    const r = getRotation().map(n => n.toFixed(1)).join(',')
    const params = new URLSearchParams()
    params.set('proj', activeProjection)
    params.set('r', r)
    params.set('g', isGraticuleVisible() ? '1' : '0')
    history.replaceState(null, '', '#' + params.toString())
    updateConfigDisplay()
}

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

function applyHashState() {
    const state = parseHash()
    if (!state) return null
    if (state.projection) activeProjection = state.projection
    if (state.rotation)   setRotation(state.rotation)
    return state
}

function applyHashStateLate(state) {
    if (!state || state.graticule === null) return
    setGraticuleVisible(state.graticule)
    const btn = document.querySelector('#controls [data-action="graticule"]')
    if (btn) btn.classList.toggle('active', state.graticule)
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
            writeHash()
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

    writeHash()
}

// ── Search submission ─────────────────────────────────────────────────────────

async function runQuery(query) {
    if (!query.trim()) return
    showLoadingOverlay()

    try {
        const { nodes, links } = await fetchNetwork(query.trim(), setLoadingProgress)
        loadNetwork(nodes, links)
        showQueryChip(query.trim())
    } catch (err) {
        console.error(err)
        showSearchOverlay(err.message || 'Something went wrong. Try again.')
    }
}

function initSearch() {
    const input  = document.getElementById('search-input')
    const submit = document.getElementById('search-submit')
    const newBtn = document.getElementById('new-query-btn')

    function go() { runQuery(input.value) }

    submit.addEventListener('click', go)
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go() })
    newBtn.addEventListener('click', () => {
        // Restore canvas to the initial empty-frame state.
        pause()
        s.nodes = []
        s.links = []
        networkActive = false
        setSelected(null)
        setInfoContent(null)
        background()
        drawLinks()    // redraws sphere outline with no links
        drawNodes()    // clears node stage
        drawGraticule()

        input.value = ''
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

    const SENS            = 0.3
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
        const r = [r0[0] + dx * SENS, r0[1] - dy * SENS, r0[2]]
        r[1] = Math.max(-90, Math.min(90, r[1]))
        setRotation(r)
        s.projection.rotate(r)
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
        } else {
            writeHash()
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
    const initialState = applyHashState()

    initProjectionPanel()
    initControls()
    initSearch()

    s.projection = buildProjection(activeProjection)

    await initPixi()
    initLinks()
    initNodes()
    initGraticule()

    applyHashStateLate(initialState)

    background()

    window.addEventListener('resize', () => requestAnimationFrame(relayout))

    window.addEventListener('hashchange', () => {
        const state = parseHash()
        if (!state) return
        if (state.rotation) { setRotation(state.rotation); s.projection.rotate(state.rotation) }
        if (state.graticule !== null) {
            setGraticuleVisible(state.graticule)
            const btn = document.querySelector('#controls [data-action="graticule"]')
            if (btn) btn.classList.toggle('active', state.graticule)
        }
        if (state.projection && state.projection !== activeProjection) {
            selectProjection(state.projection)
        } else if (networkActive) {
            drawLinks(); drawNodes(); drawGraticule()
        }
    })

    initDragToRotate()

    // Start with the search overlay — no data yet.
    showSearchOverlay()
    document.getElementById('search-input').focus()
})()
