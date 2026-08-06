let canvas = null

export default () => {

    if (!canvas) {
        canvas = document.querySelector('canvas#background')
        document.body.prepend(canvas)
    }

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const context = canvas.getContext('2d', { alpha: false })
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

}
