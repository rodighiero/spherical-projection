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

// Global variables

window.d3 = d3

window.s = {
    links,
    nodes,
    projection: null,
}

// Projection selector

let activeProjection = 'Mercator'

function initProjectionPanel() {
    const menu = document.getElementById('projection-menu')

    Object.keys(PROJECTIONS).forEach(name => {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = name
        button.dataset.name = name
        if (name === activeProjection) button.classList.add('active')

        button.addEventListener('click', () => {
            if (name === activeProjection) return
            activeProjection = name
            menu.querySelectorAll('button').forEach(b =>
                b.classList.toggle('active', b.dataset.name === name)
            )
            s.projection = buildProjection(name)
            refreshGeoPath()
            refreshGraticulePath()
            drawLinks()
            drawNodes()
            drawGraticule()
            // Reheat so the layout settles into a rotation that suits
            // the new projection's seams and boundaries.
            addTime()
        })

        menu.appendChild(button)
    })
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
        }
    })
}

// Start

Promise.all([
    d3.json(nodes),
    d3.json(links)

]).then(async ([nodes, links]) => {

    s.links = links
    s.nodes = nodes
    console.log('nodes', s.nodes.length)
    console.log('links', s.links.length)

    // Render menu and controls first so buildProjection can measure
    // their rendered heights and frame the visualisation around them.
    initProjectionPanel()
    initControls()

    s.projection = buildProjection('Mercator')

    await initPixi()
    initLinks()
    initNodes()
    initGraticule()
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
    }

    // Defer to the next frame so the CSS columns have re-flowed before
    // we measure the menu height.
    window.addEventListener('resize', () => {
        requestAnimationFrame(relayout)
    })

    initDragToRotate()

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
    let dragging = false
    let start = null
    let r0 = null
    let pending = false

    function scheduleRedraw() {
        if (pending) return
        pending = true
        requestAnimationFrame(() => {
            drawLinks()
            drawNodes()
            drawGraticule()
            pending = false
        })
    }

    canvas.addEventListener('pointerdown', e => {
        dragging = true
        start = [e.clientX, e.clientY]
        r0 = getRotation()
        canvas.style.cursor = 'grabbing'
        canvas.setPointerCapture(e.pointerId)
    })

    canvas.addEventListener('pointermove', e => {
        if (!dragging) return
        const dx = e.clientX - start[0]
        const dy = e.clientY - start[1]
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
    }
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)
}
