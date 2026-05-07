// CSS

import '../node_modules/normalize.css/normalize.css'
import './index.css'

// Libraries

import * as d3 from 'd3'

// Data

import nodes from './data/nodes.json'
import links from './data/links.json'

// Init

import initPixi from './js/pixi.js'
import { initLinks, refreshGeoPath, drawLinks } from './js/links.js'
import { initNodes, drawNodes } from './js/nodes.js'
import {
    initGraticule, refreshGraticulePath, drawGraticule,
    setGraticuleVisible, isGraticuleVisible,
} from './js/graticule.js'
import background from './js/background'
import { simulation, addTime, restart, pause, resume, isRunning } from './js/simulation'
import { PROJECTIONS, buildProjection, getRotation, setRotation } from './js/projection.js'
import { setSelected, findNodeAt } from './js/selection.js'
import { setInfoContent, updateInfoPosition } from './js/info.js'

// Global variables

window.d3 = d3

window.s = {
    links,
    nodes,
    projection: null,
}

// Projection selector

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
    drawLinks()
    drawNodes()
    drawGraticule()
    updateInfoPosition()
    // Reheat so the layout settles into a rotation that suits
    // the new projection's seams and boundaries.
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

// URL hash sync — projection name and rotation live in window.location.hash
// so the current view is shareable and persists across reloads.
//   #proj=Mercator&r=12.3,-30.0,0.0

function parseHash() {
    const raw = window.location.hash.slice(1)
    if (!raw) return null
    const params = new URLSearchParams(raw)
    const proj = params.get('proj')
    const rStr = params.get('r')
    const gStr = params.get('g')
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

    gEl.hidden = !isGraticuleVisible()
}

// Apply the bits that are safe to set before any drawing has been
// initialised. Returns the full parsed state so the caller can apply
// the rest after initGraticule() has created its PIXI stage.
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

// Simulation controls

function initControls() {
    const controls = document.getElementById('controls')
    const toggleBtn = controls.querySelector('[data-action="toggle"]')

    controls.addEventListener('click', e => {
        const action = e.target.dataset && e.target.dataset.action
        if (!action) return

        if (action === 'add') addTime()
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
    })
}

// Start

Promise.all([
    d3.json(nodes),
    d3.json(links)

]).then(async ([nodes, links]) => {

    s.nodes = nodes
    // Resolve link source/target IDs to node references — d3-force used
    // to do this for us, but the simulation now lives in a worker and
    // mutates its own copy of the data, not ours.
    const byId = new Map(nodes.map(n => [n.id, n]))
    s.links = links.map(l => ({
        ...l,
        source: byId.get(l.source) || l.source,
        target: byId.get(l.target) || l.target,
    }))
    console.log('nodes', s.nodes.length)
    console.log('links', s.links.length)

    // Pick up projection + rotation from the URL hash, if present,
    // before anything that depends on activeProjection runs.
    const initialState = applyHashState()

    // Render menu and controls first so buildProjection can measure
    // their rendered heights and frame the visualisation around them.
    initProjectionPanel()
    initControls()

    s.projection = buildProjection(activeProjection)

    await initPixi()
    initLinks()
    initNodes()
    initGraticule()

    // Now that the graticule's PIXI stage exists, apply hash bits that
    // depend on it (graticule on/off).
    applyHashStateLate(initialState)

    background()
    simulation()

    function relayout() {
        background()
        // Read the freshly laid-out menu/controls to size the projection
        s.projection = buildProjection(activeProjection)
        refreshGeoPath()
        refreshGraticulePath()
        s.pixi.resize(
            window.innerWidth,
            window.innerHeight,
            window.innerWidth,
            window.innerHeight
        )
        // Force a redraw — the simulation may have cooled down already
        drawLinks()
        drawNodes()
        drawGraticule()
        updateInfoPosition()
    }

    // Defer to the next frame so the CSS columns have re-flowed before
    // we measure the menu height.
    window.addEventListener('resize', () => {
        requestAnimationFrame(relayout)
    })

    // Browser back/forward — re-apply state from the new hash.
    window.addEventListener('hashchange', () => {
        const state = parseHash()
        if (!state) return
        if (state.rotation) {
            setRotation(state.rotation)
            s.projection.rotate(state.rotation)
        }
        if (state.graticule !== null) {
            setGraticuleVisible(state.graticule)
            const btn = document.querySelector('#controls [data-action="graticule"]')
            if (btn) btn.classList.toggle('active', state.graticule)
        }
        if (state.projection && state.projection !== activeProjection) {
            selectProjection(state.projection)
        } else {
            drawLinks(); drawNodes(); drawGraticule()
        }
    })

    initDragToRotate()

    // Persist the initial state (in case nothing was in the hash yet).
    writeHash()

})

// Drag anywhere on the canvas to rotate the projection's perspective.
// Horizontal drag moves longitude (λ), vertical drag moves latitude (φ).
// Sensitivity in degrees per pixel; redraws are throttled with rAF so
// we never queue more than one frame of work even on a fast trackpad.

function initDragToRotate() {
    const canvas = document.querySelector('body > canvas:last-of-type')
    if (!canvas) return
    canvas.style.cursor = 'grab'

    const SENS = 0.3
    const CLICK_THRESHOLD = 5  // px
    let dragging = false
    let start = null
    let r0 = null
    let moved = 0
    let pending = false

    function scheduleRedraw() {
        if (pending) return
        pending = true
        requestAnimationFrame(() => {
            drawLinks()
            drawNodes()
            drawGraticule()
            updateInfoPosition()
            updateConfigDisplay()
            pending = false
        })
    }

    canvas.addEventListener('pointerdown', e => {
        dragging = true
        start = [e.clientX, e.clientY]
        r0 = getRotation()
        moved = 0
        canvas.style.cursor = 'grabbing'
        canvas.setPointerCapture(e.pointerId)
    })

    canvas.addEventListener('pointermove', e => {
        if (!dragging) return
        const dx = e.clientX - start[0]
        const dy = e.clientY - start[1]
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy))
        const r = [r0[0] + dx * SENS, r0[1] - dy * SENS, r0[2]]
        // Clamp latitude to keep the pole within reasonable range
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
            // Treat as a click — convert screen coords to viewport
            // world coords (matters when zoomed in) and pick a node.
            const w = s.pixi.toWorld(e.clientX, e.clientY)
            selectNode(findNodeAt(w.x, w.y))
        } else {
            writeHash()
        }
    }
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)
}

// Selection — drives the info panel and the highlight rendering.

function selectNode(node) {
    setSelected(node)
    setInfoContent(node)
    drawNodes()
    drawLinks()
    updateInfoPosition()
}

// ESC clears the selection.
window.addEventListener('keydown', e => {
    if (e.key === 'Escape') selectNode(null)
})
