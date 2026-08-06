// Radius of the sphere nodes are laid out on, as a function of network
// size. Shared between the worker (seeding + surfaceForce) and the main
// thread (syncPositions, converting a post-drag lon/lat back to xyz) so
// the two stay in agreement about what R means.
export function sphereRadius(N) {
    return 15 * Math.sqrt(N)
}
