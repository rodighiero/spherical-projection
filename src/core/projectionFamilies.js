// Cartographic family taxonomy for the names in PROJECTIONS (projection.js),
// following Snyder's "Map Projections: A Working Manual" (USGS) — the
// standard classification by developable surface (cylindrical / conic /
// azimuthal), each with a "pseudo" variant for projections that mimic the
// surface's look without truly being constructed from it, plus a few small
// historical families (retroazimuthal, polyconic, polyhedral) and an "Other"
// catch-all for projections that don't fit any developable-surface family
// (compromise, quincuncial, globular, trimetric, ...).
//
// Neither d3 nor d3-geo-projection encode this metadata, so it's hand-curated
// against Snyder and standard cartographic references. Some placements are
// genuine judgment calls: Wagner 7 and Winkel Tripel are modified/pseudo-
// azimuthal (built from Hammer and Aitoff respectively) despite reading like
// pseudocylindricals; Van der Grinten and the quincuncial projections don't
// cleanly fit any developable-surface family, so they land in Other.

const FAMILIES = {
    Cylindrical: [
        'Cylindrical Equal Area', 'Cylindrical Stereographic', 'Equirectangular',
        'Mercator', 'Miller', 'Patterson', 'Times', 'Transverse Mercator',
    ],
    Pseudocylindrical: [
        'Baker', 'Boggs', 'Bromley', 'Collignon', 'Craster',
        'Eckert 1', 'Eckert 2', 'Eckert 3', 'Eckert 4', 'Eckert 5', 'Eckert 6',
        'Equal Earth', 'Foucaut', 'Foucaut Sinusoidal', 'Gingery',
        'Ginzburg 4', 'Ginzburg 5', 'Ginzburg 6', 'Ginzburg 8', 'Ginzburg 9',
        'Healpix', 'Hill', 'Homolosine', 'Hufnagel', 'Hyperelliptical',
        'Interrupted Boggs', 'Interrupted Homolosine', 'Interrupted Mollweide',
        'Interrupted Mollweide Hemispheres', 'Interrupted Quartic Authalic',
        'Interrupted Sinu Mollweide', 'Interrupted Sinusoidal',
        'Kavrayskiy 7', 'Larrivee', 'Laskowski', 'Loximuthal', 'Mollweide',
        'Mt Flat Polar Parabolic', 'Mt Flat Polar Quartic', 'Mt Flat Polar Sinusoidal',
        'Natural Earth 1', 'Natural Earth 2', 'Nell Hammer', 'Robinson',
        'Sinu Mollweide', 'Sinusoidal', 'Wagner', 'Wagner 4', 'Wagner 6',
    ],
    Conic: [
        'Albers', 'Albers Usa', 'Conic Conformal', 'Conic Equal Area', 'Conic Equidistant',
    ],
    Pseudoconic: [
        'Bonne', 'Bottomley',
    ],
    Azimuthal: [
        'Airy', 'Azimuthal Equal Area', 'Azimuthal Equidistant', 'Gilbert', 'Gnomonic',
        'Modified Stereographic Alaska', 'Modified Stereographic Gs 48',
        'Modified Stereographic Gs 50', 'Modified Stereographic Lee',
        'Modified Stereographic Miller', 'Orthographic', 'Satellite', 'Stereographic',
        'Two Point Azimuthal Usa', 'Two Point Equidistant Usa',
    ],
    Pseudoazimuthal: [
        'Aitoff', 'Berghaus', 'Hammer', 'Wagner 7', 'Wiechel', 'Winkel 3',
    ],
    Retroazimuthal: [
        'Craig', 'Hammer Retroazimuthal', 'Littrow',
    ],
    Polyconic: [
        'Polyconic', 'Rectangular Polyconic',
    ],
    Polyhedral: [
        'Polyhedral Butterfly', 'Polyhedral Collignon', 'Polyhedral Waterman',
    ],
    Other: [
        'Armadillo', 'August', 'Bertin 1953', 'Chamberlin Africa', 'Eisenlohr', 'Fahey',
        'Gringorten', 'Gringorten Quincuncial', 'Guyou', 'Lagrange', 'Nicolosi',
        'Peirce Quincuncial', 'Van Der Grinten', 'Van Der Grinten 2', 'Van Der Grinten 3',
        'Van Der Grinten 4',
    ],
}

export const FAMILY_ORDER = Object.keys(FAMILIES)

const FAMILY_BY_NAME = Object.fromEntries(
    Object.entries(FAMILIES).flatMap(([family, names]) => names.map(name => [name, family]))
)

// Falls back to Other for any projection d3/d3-geo-projection adds in the
// future that hasn't been classified here yet.
export function familyOf(name) {
    return FAMILY_BY_NAME[name] || 'Other'
}
