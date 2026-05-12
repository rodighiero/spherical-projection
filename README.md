# Spherical Projection

A network drawn on a sphere, then unfolded onto the plane through any of nearly ninety geographic projections — Mercator, Orthographic, Cahill Butterfly, Peirce Quincuncial, and so on.

## The idea

Network visualizations are almost always flat. Flatness is convenient — it prints, it scrolls, it sits inside a rectangle — but it pays a price. Some nodes always end up at the edges. When the nodes are people, the edge becomes a kind of demotion: the layout itself produces a hierarchy nobody asked for.

A sphere has no edges. Every point is interior, and the same node can be the center simply by turning the globe. The visualization here treats that geometry literally. The force-directed layout runs in three dimensions and a custom force keeps the nodes on the surface of a sphere; the network settles into a pattern of densities rather than centralities. To make the result legible on a screen, the sphere is then flattened with a cartographic projection — the same kind of mathematics cartographers have been using since Ptolemy to put the Earth on a sheet of paper.

The argument is laid out in full in [Drawing Network Visualizations on a Continuous, Spherical Surface](https://doi.org/10.1109/IV51561.2020.00097), Dario Rodighiero, _IEEE IV 2020_ — an [open-access PDF](https://pure.rug.nl/ws/files/224968970/Rodighiero_2020_Drawing_Network_Visualizations_on_a_Continuous_Sp.pdf) is hosted by the University of Groningen.

## How it works

Each frame, `d3-force-3d` runs `collide`, `charge`, and `link` forces in 3D on the node positions. A custom `surface` force projects each node onto a sphere of radius `R = 15·√N` and constrains its velocity to the tangent plane, so the simulation walks across the surface instead of drifting through the volume. The unit-vector position is stored on every node as `[longitude, latitude]` in degrees.

The projection chosen from the menu is a `(λ, φ) → (x, y)` function from `d3-geo` or `d3-geo-projection`. Nodes are rendered as small dots through `projection(node.spherical)`. Links are drawn as great-circle geodesics by feeding `LineString` objects to `d3.geoPath`, which interpolates them along the sphere and reprojects every segment — so the same edge appears as a loxodrome on Mercator, a banana arc on Orthographic, and a broken curve across the seams of an interrupted projection. A faint outline of the sphere itself, and an optional graticule, are drawn the same way. Everything renders through PixiJS v8 onto a single WebGL canvas.

## Controls

Drag anywhere to rotate the perspective — horizontal moves the longitude, vertical the latitude, and the rotation persists when you switch projection. Scroll or pinch to zoom in (zoom out is disabled because the projection already fits the window). The list along the top is the projection picker; the controls at the bottom-left let you give the simulation more time to settle, restart it cold, pause it, or toggle the graticule overlay.

## Run

```sh
npm install
npm start
```

The dev server lives at `http://localhost:5173`. `npm run build` writes the production bundle into `docs/`, ready to be served as a static site (the repo's GitHub Pages publishes from there).

## Data

Type any research topic into the search bar — the app queries the [OpenAlex API](https://api.openalex.org) live, fetches the top 1 000 most-cited authors in that field, and builds a co-authorship graph from their shared works. Results are cached in the browser for one week so repeat queries are instant.

## Cite

> Rodighiero, D. (2020). _Drawing Network Visualizations on a Continuous, Spherical Surface._ In 2020 24th International Conference Information Visualisation (IV), pp. 573–580. IEEE. https://doi.org/10.1109/IV51561.2020.00097

Open-access PDF, courtesy of the University of Groningen: https://pure.rug.nl/ws/files/224968970/Rodighiero_2020_Drawing_Network_Visualizations_on_a_Continuous_Sp.pdf

## License

MIT.
