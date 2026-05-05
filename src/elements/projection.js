// Shared projection state — all drawing modules read from s.projection

export const PROJECTIONS = {
    'Mercator':              'geoMercator',
    'Natural Earth':         'geoNaturalEarth1',
    'Equal Earth':           'geoEqualEarth',
    'Equirectangular':       'geoEquirectangular',
    'Orthographic':          'geoOrthographic',
    'Stereographic':         'geoStereographic',
    'Azimuthal Equal Area':  'geoAzimuthalEqualArea',
    'Azimuthal Equidistant': 'geoAzimuthalEquidistant',
    'Gnomonic':              'geoGnomonic',
    'Conic Equal Area':      'geoConicEqualArea',
    'Transverse Mercator':   'geoTransverseMercator',
}

export function buildProjection(name) {
    const fn = d3[PROJECTIONS[name]]
    if (!fn) throw new Error(`Unknown projection: ${name}`)

    const W = window.innerWidth
    const H = window.innerHeight
    const dim = Math.max(W, H)

    // Fit to the LARGER dimension so the sphere fills the screen
    // edge-to-edge. Otherwise a square-ish projection (e.g. Mercator)
    // on a portrait screen leaves empty bands top and bottom — that's
    // the "frame" effect. We then re-center on the actual screen.
    return fn()
        .fitSize([dim, dim], { type: 'Sphere' })
        .translate([W / 2, H / 2])
}
