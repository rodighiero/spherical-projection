# Spherical Projection

A network drawn on a sphere, then unfolded onto the plane through any of nearly ninety geographic projections — Mercator, Orthographic, Cahill Butterfly, Peirce Quincuncial, and so on.

**[Open the live visualization →](https://rodighiero.github.io/spherical-projection/)**

## The idea

Network visualizations are almost always flat. Flatness is convenient — it prints, it scrolls, it sits inside a rectangle — but it pays a price. Some nodes always end up at the edges. When the nodes are people, the edge becomes a kind of demotion: the layout itself produces a hierarchy nobody asked for.

A sphere has no edges. Every point is interior, and the same node can be the center simply by turning the globe. The visualization here treats that geometry literally. The force-directed layout runs in three dimensions and a custom force keeps the nodes on the surface of a sphere; the network settles into a pattern of densities rather than centralities. To make the result legible on a screen, the sphere is then flattened with a cartographic projection — the same kind of mathematics cartographers have been using since Ptolemy to put the Earth on a sheet of paper.

The argument is laid out in full in [Drawing Network Visualizations on a Continuous, Spherical Surface](https://doi.org/10.1109/IV51561.2020.00097), Dario Rodighiero, _IEEE IV 2020_ — an [open-access PDF](https://pure.rug.nl/ws/files/224968970/Rodighiero_2020_Drawing_Network_Visualizations_on_a_Continuous_Sp.pdf) is hosted by the University of Groningen.

## The rebuild

Six years later, in the summer of 2026, the 2020 visualization was rebuilt from scratch in five working sessions with an AI — Claude Code, a chat in the terminal — without its author writing a single line of code. The machine wrote the code; the designer chose among its proposals, refused what went against the work's principles, and answered for the result. The nearly ninety projections are one such refusal: offered a tidier interface with only fifteen, the designer kept them all, because a work about removing margins should not quietly drop its own.

The rebuild, and what it says about authorship when design and making come apart, is the subject of [Design Without Hands: Rebuilding a Web Application with AI](https://doi.org/10.82068/pgjournal.2026.23.42.13) (_Progettare senza mani: ricostruire un'applicazione web con l'IA_), Dario Rodighiero, _Progetto Grafico_ 43 — a forthcoming bilingual essay in Italian and English, illustrated with eight views of the same co-authorship network on machine learning, each captioned with the link that reopens it here.

## How it works

Each frame, `d3-force-3d` runs `collide`, `charge`, and `link` forces in 3D on the node positions. A custom `surface` force projects each node onto a sphere of radius `R = 15·√N` and constrains its velocity to the tangent plane, so the simulation walks across the surface instead of drifting through the volume. The unit-vector position is stored on every node as `[longitude, latitude]` in degrees.

The projection chosen from the menu is a `(λ, φ) → (x, y)` function from `d3-geo` or `d3-geo-projection`. Nodes are rendered as small dots through `projection(node.spherical)`. Links are drawn as great-circle geodesics by feeding `LineString` objects to `d3.geoPath`, which interpolates them along the sphere and reprojects every segment — so the same edge appears as a loxodrome on Mercator, a banana arc on Orthographic, and a broken curve across the seams of an interrupted projection. A faint outline of the sphere itself, and an optional graticule, are drawn the same way. Everything renders through PixiJS v8 onto a single WebGL canvas.

## Controls

Drag anywhere to rotate the perspective — horizontal moves the longitude, vertical the latitude, and the rotation persists when you switch projection. Scroll or pinch to zoom in (zoom out is disabled because the projection already fits the window). The list along the top is the projection picker; the controls at the bottom-left let you give the simulation more time to settle, restart it cold, pause it, or toggle the graticule overlay. The last two buttons export what you see — PNG copies the canvas, SVG re-renders the same state as vector paths for print.

Click a node to pin an info card with the author's institution, output, and topics, plus their OpenAlex page; its co-authors and their links highlight in red. Escape clears the selection.

## Links

Every view has its own URL, so a printed caption can point straight to it:

```
https://rodighiero.github.io/spherical-projection/?topic=machine-learning-and-algorithms&projection=peirce-quincuncial&lon=0&lat=0
```

- `topic` — the OpenAlex topic name as a lowercase, hyphenated slug; the network loads straight away, skipping the search
- `projection` — the projection name, slugged the same way (`peirce-quincuncial`, `azimuthal-equal-area`, …)
- `lon`, `lat` — the sphere's rotation in degrees, default `0`

The parameters match the exported file names: `machine-learning-and-algorithms_peirce-quincuncial_lon0.0_lat0.0.png` opens with the link above. The address bar follows along as you switch topic, change projection, or rotate the sphere, so whatever is on screen can be copied and shared. A link's projection takes precedence over the one remembered from your last visit, and a missing or unrecognised value falls back to the usual behaviour. The layout itself is recomputed on every load, so a link reopens the same topic, projection and orientation, but not the exact node positions of the original figure.

## Run

```sh
npm install
npm start
```

The dev server lives at [`http://localhost:5173`](http://localhost:5173). `npm run build` writes the production bundle into `dist/`. You rarely need to run it by hand: a GitHub Actions workflow builds and publishes to GitHub Pages on every push to `main`, so the repository holds only source. Asset paths are relative, so the same build runs unchanged at a domain root or under a subpath like `/spherical-projection/`.

## Data

Type any research topic into the search bar — the app queries the [OpenAlex API](https://api.openalex.org) live, fetches the top 1 000 most-cited authors in that field, and builds a co-authorship graph from their shared works. Results are cached in the browser for one week so repeat queries are instant; when that cache fills, the oldest networks are evicted to make room.

## Cite

The original argument:

> Rodighiero, D. (2020). _Drawing Network Visualizations on a Continuous, Spherical Surface._ In 2020 24th International Conference Information Visualisation (IV), pp. 573–580. IEEE. https://doi.org/10.1109/IV51561.2020.00097

Open-access PDF, courtesy of the University of Groningen: https://pure.rug.nl/ws/files/224968970/Rodighiero_2020_Drawing_Network_Visualizations_on_a_Continuous_Sp.pdf

The rebuild, forthcoming:

> Rodighiero, D. (2026). Progettare senza mani: Ricostruire un'applicazione web con l'IA / Design without hands: Rebuilding a web application with AI. _Progetto Grafico_, 43. https://doi.org/10.82068/pgjournal.2026.23.42.13

The software itself:

> Rodighiero, D. (2026a). _Spherical projection_ [Web application]. https://rodighiero.github.io/spherical-projection/
>
> Rodighiero, D. (2026b). _Spherical projection_ [Computer software]. GitHub. https://github.com/rodighiero/spherical-projection
