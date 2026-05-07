// Shared projection state — all drawing modules read from s.projection

import * as d3 from 'd3'
import * as d3p from 'd3-geo-projection'

// Conic projections need reference parallels.
const PARALLELS = [30, 60]

export const PROJECTIONS = {

    // d3-geo (built into d3)

    'Albers':                     () => d3.geoAlbers().rotate([0, 0]).parallels(PARALLELS),
    'Azimuthal Equal Area':       () => d3.geoAzimuthalEqualArea(),
    'Azimuthal Equidistant':      () => d3.geoAzimuthalEquidistant(),
    'Conic Conformal':            () => d3.geoConicConformal().parallels(PARALLELS),
    'Conic Equal Area':           () => d3.geoConicEqualArea().parallels(PARALLELS),
    'Conic Equidistant':          () => d3.geoConicEquidistant().parallels(PARALLELS),
    'Equal Earth':                () => d3.geoEqualEarth(),
    'Equirectangular':            () => d3.geoEquirectangular(),
    'Gnomonic':                   () => d3.geoGnomonic(),
    'Mercator':                   () => d3.geoMercator(),
    'Natural Earth':              () => d3.geoNaturalEarth1(),
    'Orthographic':               () => d3.geoOrthographic(),
    'Stereographic':              () => d3.geoStereographic(),
    'Transverse Mercator':        () => d3.geoTransverseMercator(),

    // d3-geo-projection

    'Airy':                       () => d3p.geoAiry(),
    'Aitoff':                     () => d3p.geoAitoff(),
    'Armadillo':                  () => d3p.geoArmadillo(),
    'August':                     () => d3p.geoAugust(),
    'Baker':                      () => d3p.geoBaker(),
    'Berghaus':                   () => d3p.geoBerghaus(),
    'Bertin 1953':                () => d3p.geoBertin1953(),
    'Boggs':                      () => d3p.geoBoggs(),
    'Bonne':                      () => d3p.geoBonne(),
    'Bottomley':                  () => d3p.geoBottomley(),
    'Bromley':                    () => d3p.geoBromley(),
    'Cahill Butterfly':           () => d3p.geoPolyhedralButterfly(),
    'Collignon':                  () => d3p.geoCollignon(),
    'Craster Parabolic':          () => d3p.geoCraster(),
    'Cylindrical Equal Area':     () => d3p.geoCylindricalEqualArea(),
    'Cylindrical Stereographic':  () => d3p.geoCylindricalStereographic(),
    'Eckert I':                   () => d3p.geoEckert1(),
    'Eckert II':                  () => d3p.geoEckert2(),
    'Eckert III':                 () => d3p.geoEckert3(),
    'Eckert IV':                  () => d3p.geoEckert4(),
    'Eckert V':                   () => d3p.geoEckert5(),
    'Eckert VI':                  () => d3p.geoEckert6(),
    'Eisenlohr':                  () => d3p.geoEisenlohr(),
    'Fahey':                      () => d3p.geoFahey(),
    'Foucaut':                    () => d3p.geoFoucaut(),
    'Foucaut Sinusoidal':         () => d3p.geoFoucautSinusoidal(),
    'Gingery':                    () => d3p.geoGingery(),
    'Ginzburg IV':                () => d3p.geoGinzburg4(),
    'Ginzburg V':                 () => d3p.geoGinzburg5(),
    'Ginzburg VI':                () => d3p.geoGinzburg6(),
    'Ginzburg VIII':              () => d3p.geoGinzburg8(),
    'Ginzburg IX':                () => d3p.geoGinzburg9(),
    'Goode Homolosine':           () => d3p.geoHomolosine(),
    'Gringorten':                 () => d3p.geoGringorten(),
    'Gringorten Quincuncial':     () => d3p.geoGringortenQuincuncial(),
    'Guyou':                      () => d3p.geoGuyou(),
    'Hammer':                     () => d3p.geoHammer(),
    'Healpix':                    () => d3p.geoHealpix(),
    'Hill':                       () => d3p.geoHill(),
    'Hufnagel':                   () => d3p.geoHufnagel(),
    'Interrupted Boggs':          () => d3p.geoInterruptedBoggs(),
    'Interrupted Homolosine':     () => d3p.geoInterruptedHomolosine(),
    'Interrupted Mollweide':      () => d3p.geoInterruptedMollweide(),
    'Interrupted Mollweide Hem.': () => d3p.geoInterruptedMollweideHemispheres(),
    'Interrupted Q. Authalic':    () => d3p.geoInterruptedQuarticAuthalic(),
    'Interrupted Sinu-Mollweide': () => d3p.geoInterruptedSinuMollweide(),
    'Interrupted Sinusoidal':     () => d3p.geoInterruptedSinusoidal(),
    'Kavrayskiy 7':               () => d3p.geoKavrayskiy7(),
    'Lagrange':                   () => d3p.geoLagrange(),
    'Larrivée':                   () => d3p.geoLarrivee(),
    'Laskowski':                  () => d3p.geoLaskowski(),
    'Littrow':                    () => d3p.geoLittrow(),
    'Loximuthal':                 () => d3p.geoLoximuthal(),
    'Miller':                     () => d3p.geoMiller(),
    'Mollweide':                  () => d3p.geoMollweide(),
    'Mt Flat Polar Parabolic':    () => d3p.geoMtFlatPolarParabolic(),
    'Mt Flat Polar Quartic':      () => d3p.geoMtFlatPolarQuartic(),
    'Mt Flat Polar Sinusoidal':   () => d3p.geoMtFlatPolarSinusoidal(),
    'Natural Earth II':           () => d3p.geoNaturalEarth2(),
    'Nell Hammer':                () => d3p.geoNellHammer(),
    'Nicolosi':                   () => d3p.geoNicolosi(),
    'Patterson':                  () => d3p.geoPatterson(),
    'Peirce Quincuncial':         () => d3p.geoPeirceQuincuncial(),
    'Polyconic':                  () => d3p.geoPolyconic(),
    'Polyhedral Collignon':       () => d3p.geoPolyhedralCollignon(),
    'Polyhedral Waterman':        () => d3p.geoPolyhedralWaterman(),
    'Rectangular Polyconic':      () => d3p.geoRectangularPolyconic(),
    'Robinson':                   () => d3p.geoRobinson(),
    'Sinu-Mollweide':             () => d3p.geoSinuMollweide(),
    'Sinusoidal':                 () => d3p.geoSinusoidal(),
    'Times':                      () => d3p.geoTimes(),
    'Van Der Grinten':            () => d3p.geoVanDerGrinten(),
    'Van Der Grinten II':         () => d3p.geoVanDerGrinten2(),
    'Van Der Grinten III':        () => d3p.geoVanDerGrinten3(),
    'Van Der Grinten IV':         () => d3p.geoVanDerGrinten4(),
    'Wagner IV':                  () => d3p.geoWagner4(),
    'Wagner VI':                  () => d3p.geoWagner6(),
    'Wagner VII':                 () => d3p.geoWagner7(),
    'Wiechel':                    () => d3p.geoWiechel(),
    'Winkel Tripel':              () => d3p.geoWinkel3(),
}

// Side margins (px). Top/bottom are measured from the actual menu and
// controls so the projection adapts to however many columns the menu
// breaks into for the current window width.
export const MARGIN_X = 60
export const MARGIN_GAP = 30

// Persistent rotation [λ, φ, γ] applied on every projection rebuild,
// so the user's drag-to-rotate carries across projection changes,
// menu interactions, and window resizes.
let currentRotation = [0, 0, 0]

export function getRotation() { return currentRotation.slice() }
export function setRotation(r) { currentRotation = r.slice() }

function elementBottom(id, fallback) {
    const el = document.getElementById(id)
    if (!el) return fallback
    const r = el.getBoundingClientRect()
    return r.bottom
}

function elementTop(id, fallback) {
    const el = document.getElementById(id)
    if (!el) return fallback
    const r = el.getBoundingClientRect()
    return r.top
}

export function buildProjection(name) {
    const factory = PROJECTIONS[name]
    if (!factory) throw new Error(`Unknown projection: ${name}`)

    const W = window.innerWidth
    const H = window.innerHeight

    const top    = elementBottom('projection-menu', 200) + MARGIN_GAP
    const bottom = elementTop('controls', H - 100) - MARGIN_GAP

    // Rotation is invariant for sphere bounds, so applying it before
    // fitExtent doesn't affect the fit calculation.
    return factory()
        .rotate(currentRotation)
        .fitExtent(
            [[MARGIN_X, top], [W - MARGIN_X, bottom]],
            { type: 'Sphere' }
        )
}
