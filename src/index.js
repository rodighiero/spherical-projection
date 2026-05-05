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
import { simulation } from './elements/simulation'
import { PROJECTIONS, buildProjection } from './elements/projection.js'

// Global variables

window.d3 = d3

window.s = {
    links,
    nodes,
    projection: null,
}

// Projection selector

function initProjectionPanel() {
    const select = document.getElementById('projection-select')

    Object.keys(PROJECTIONS).forEach(name => {
        const option = document.createElement('option')
        option.value = name
        option.textContent = name
        if (name === 'Mercator') option.selected = true
        select.appendChild(option)
    })

    select.addEventListener('change', () => {
        s.projection = buildProjection(select.value)
        refreshGeoPath()
        drawLinks()
        drawNodes()
    })
}

// Start

Promise.all([
    d3.json(nodes),
    d3.json(links)

]).then(([nodes, links]) => {

    s.links = links
    s.nodes = nodes
    console.log('nodes', s.nodes.length)
    console.log('links', s.links.length)

    // Build the initial projection before any drawing happens
    s.projection = buildProjection('Mercator')

    initPixi()
    initLinks()
    initNodes()
    background()
    simulation()
    initProjectionPanel()

    window.onresize = function () {
        background()
        s.projection = buildProjection(
            document.getElementById('projection-select').value
        )
        refreshGeoPath()
        // Keep world bounds in sync with screen so clamp/clampZoom
        // continue to prevent the empty-frame effect after resize.
        const D = Math.max(window.innerWidth, window.innerHeight)
        s.pixi.resize(window.innerWidth, window.innerHeight, D, D)
    }

})
