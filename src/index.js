// CSS

import '../node_modules/normalize.css/normalize.css'
import './index.css'

// Libraries

import * as d3 from 'd3'

// Data

import nodes from './data/nodes.json'
import links from './data/links.json'

// Init

import initPixi from './elements/pixi.js'
import { initLinks, refreshGeoPath, drawLinks } from './elements/links.js'
import { initNodes, drawNodes } from './elements/nodes.js'
import background from './elements/background'
import { simulation, addTime, restart, pause, resume, isRunning } from './elements/simulation'
import { PROJECTIONS, buildProjection } from './elements/projection.js'

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
            drawLinks()
            drawNodes()
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
            } else {
                resume()
                toggleBtn.textContent = 'Pause'
            }
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

    // Build the initial projection before any drawing happens
    s.projection = buildProjection('Mercator')

    await initPixi()
    initLinks()
    initNodes()
    background()
    simulation()
    initProjectionPanel()
    initControls()

    window.onresize = function () {
        background()
        s.projection = buildProjection(activeProjection)
        refreshGeoPath()
        s.pixi.resize(
            window.innerWidth,
            window.innerHeight,
            window.innerWidth,
            window.innerHeight
        )
    }

})
