export default () => {

    const canvas = document.querySelector('canvas#background')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const body = document.querySelector('body')
    body.prepend(canvas)

    const context = canvas.getContext('2d', { alpha: false })
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

}