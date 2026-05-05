import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'

export default () => {

    // Create and append PIXI

    const app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight,
        antialias: true,
        transparent: true,
        resolution: 2,
        autoDensity: true,
        autoResize: true,
        resizeTo: window,
    })
    document.body.prepend(app.view)

    // Create and append viewport.
    // The projection in projection.js fills the larger screen dimension,
    // so the world is a square of size max(W, H) centered on the screen.

    const W = window.innerWidth
    const H = window.innerHeight
    const D = Math.max(W, H)

    const viewport = new Viewport({
        screenWidth: W,
        screenHeight: H,
        worldWidth: D,
        worldHeight: D,
        interaction: app.renderer.plugins.interaction
    })
    app.stage.addChild(viewport)

    s.pixi = viewport

    // Activate plugins.
    // The projection is the visualization's natural extent, so zooming
    // out below the initial scale is meaningless — disabled here.
    // Zooming in is still allowed (up to 5x). clamp keeps the world
    // from being panned outside the screen.

    viewport
        .drag()
        .pinch()
        .wheel()
        .decelerate()
        .clamp({ direction: 'all', underflow: 'center' })
        .clampZoom({ minScale: 1, maxScale: 5 })
        
    // Prevent pinch gesture in Chrome

    window.addEventListener('wheel', e => {
        e.preventDefault()
    }, { passive: false })
        
}