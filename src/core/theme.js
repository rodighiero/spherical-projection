// Single source of truth for the selection-highlight color, consumed both
// by the PIXI renderers (numeric hex) and the SVG exporter (CSS hex string)
// so on-screen and exported highlights can't drift apart.
export const HIGHLIGHT = 0xd62828
export const HIGHLIGHT_CSS = '#' + HIGHLIGHT.toString(16).padStart(6, '0')
