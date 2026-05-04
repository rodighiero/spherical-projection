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
    return fn().fitSize(
        [window.innerWidth, window.innerHeight],
        { type: 'Sphere' }
    )
}
