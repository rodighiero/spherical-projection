import { Application } from 'pixi.js'
import { Viewport } from 'pixi-viewport'

export default async () => {

    // Create and append PIXI (v8 uses async init).

    const app = new Application()
    await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        antialias: true,
        backgroundAlpha: 0,
        resolution: 2,
        autoDensity: true,
        resizeTo: window,
    })
    document.body.prepend(app.canvas)

    // Create and append viewport.
    // World matches the screen — the projection is fit inside the window
    // with a margin in projection.js, so its border stays visible.

    const W = window.innerWidth
    const H = window.innerHeight

    const viewport = new Viewport({
        screenWidth: W,
        screenHeight: H,
        worldWidth: W,
        worldHeight: H,
        events: app.renderer.events,
    })
    app.stage.addChild(viewport)

    s.pixi = viewport

    // Activate plugins.
    // Drag is intentionally NOT enabled here — drag gestures rotate the
    // sphere instead (see drag-to-rotate handler in index.js). Wheel and
    // pinch still zoom in (up to 5x); zoom out is disabled because the
    // projection already fits the window.

    viewport
        .pinch()
        .wheel()
        .clamp({ direction: 'all', underflow: 'center' })
        .clampZoom({ minScale: 1, maxScale: 5 })

    // Prevent pinch gesture in Chrome

    window.addEventListener('wheel', e => {
        e.preventDefault()
    }, { passive: false })

}
