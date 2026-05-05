/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/elements/background.js"
/*!************************************!*\
  !*** ./src/elements/background.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {\n  const canvas = document.querySelector('canvas#background');\n  canvas.width = window.innerWidth;\n  canvas.height = window.innerHeight;\n  const body = document.querySelector('body');\n  body.prepend(canvas);\n  const context = canvas.getContext('2d', {\n    alpha: false\n  });\n  const gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);\n  gradient.addColorStop(1, d3.rgb(0, 0, 0));\n  gradient.addColorStop(0, d3.rgb(255, 255, 255));\n  context.fillStyle = gradient;\n  context.fillRect(0, 0, canvas.width, canvas.height);\n});\n(Object.getOwnPropertyDescriptor(__WEBPACK_DEFAULT_EXPORT__, \"name\") || {}).writable || Object.defineProperty(__WEBPACK_DEFAULT_EXPORT__, \"name\", { value: \"default\", configurable: true });\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/elements/background.js?\n}");

/***/ },

/***/ "./src/elements/links.js"
/*!*******************************!*\
  !*** ./src/elements/links.js ***!
  \*******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   drawLinks: () => (/* binding */ drawLinks),\n/* harmony export */   initLinks: () => (/* binding */ initLinks),\n/* harmony export */   refreshGeoPath: () => (/* binding */ refreshGeoPath)\n/* harmony export */ });\n/* harmony import */ var pixi_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! pixi.js */ \"./node_modules/pixi.js/lib/pixi.es.js\");\n/* harmony import */ var d3__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! d3 */ \"./node_modules/d3/src/index.js\");\n\n\n\n// Adapts PIXI.Graphics to the canvas 2D context interface that d3.geoPath expects.\n// This lets us render all links into a single Graphics object without any SVG overhead.\nclass PixiGeoContext {\n  constructor(graphics) {\n    this.g = graphics;\n  }\n  beginPath() {}\n  moveTo(x, y) {\n    this.g.moveTo(x, y);\n  }\n  lineTo(x, y) {\n    this.g.lineTo(x, y);\n  }\n  arc(x, y, r, a0, a1, ccw) {\n    this.g.arc(x, y, r, a0, a1, ccw);\n  }\n  closePath() {\n    this.g.closePath();\n  }\n  stroke() {}\n  fill() {}\n}\nlet stage, pixiCtx, geoPath;\nfunction initLinks() {\n  const graphics = new pixi_js__WEBPACK_IMPORTED_MODULE_0__.Graphics();\n  stage = s.pixi.addChild(graphics);\n  pixiCtx = new PixiGeoContext(stage);\n  refreshGeoPath();\n}\nfunction refreshGeoPath() {\n  geoPath = d3__WEBPACK_IMPORTED_MODULE_1__.geoPath(s.projection, pixiCtx);\n}\nfunction drawLinks() {\n  stage.clear();\n  stage.lineStyle(0.5, 0xaaaaaa, 0.5);\n  s.links.forEach(link => {\n    geoPath({\n      type: 'LineString',\n      coordinates: [link.source.spherical, link.target.spherical]\n    });\n  });\n}\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/elements/links.js?\n}");

/***/ },

/***/ "./src/elements/nodes.js"
/*!*******************************!*\
  !*** ./src/elements/nodes.js ***!
  \*******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   drawNodes: () => (/* binding */ drawNodes),\n/* harmony export */   initNodes: () => (/* binding */ initNodes)\n/* harmony export */ });\n/* harmony import */ var pixi_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! pixi.js */ \"./node_modules/pixi.js/lib/pixi.es.js\");\n\nlet stage;\nfunction initNodes() {\n  const graphics = new pixi_js__WEBPACK_IMPORTED_MODULE_0__.Graphics();\n  stage = s.pixi.addChild(graphics);\n}\nfunction drawNodes() {\n  stage.clear();\n  stage.beginFill(0xffffff, 0.9);\n  s.nodes.forEach(node => {\n    const pos = s.projection(node.spherical);\n    if (pos) stage.drawCircle(pos[0], pos[1], 2);\n  });\n  stage.endFill();\n}\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/elements/nodes.js?\n}");

/***/ },

/***/ "./src/elements/pixi.js"
/*!******************************!*\
  !*** ./src/elements/pixi.js ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var pixi_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! pixi.js */ \"./node_modules/pixi.js/lib/pixi.es.js\");\n/* harmony import */ var pixi_viewport__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! pixi-viewport */ \"./node_modules/pixi-viewport/dist/viewport.es.js\");\n\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {\n  // Create and append PIXI\n\n  const app = new pixi_js__WEBPACK_IMPORTED_MODULE_0__.Application({\n    width: window.innerWidth,\n    height: window.innerHeight,\n    antialias: true,\n    transparent: true,\n    resolution: 2,\n    autoDensity: true,\n    autoResize: true,\n    resizeTo: window\n  });\n  document.body.prepend(app.view);\n\n  // Create and append viewport.\n  // The projection in projection.js fills the larger screen dimension,\n  // so the world is a square of size max(W, H) centered on the screen.\n\n  const W = window.innerWidth;\n  const H = window.innerHeight;\n  const D = Math.max(W, H);\n  const viewport = new pixi_viewport__WEBPACK_IMPORTED_MODULE_1__.Viewport({\n    screenWidth: W,\n    screenHeight: H,\n    worldWidth: D,\n    worldHeight: D,\n    interaction: app.renderer.plugins.interaction\n  });\n  app.stage.addChild(viewport);\n  s.pixi = viewport;\n\n  // Activate plugins.\n  // The projection is the visualization's natural extent, so zooming\n  // out below the initial scale is meaningless — disabled here.\n  // Zooming in is still allowed (up to 5x). clamp keeps the world\n  // from being panned outside the screen.\n\n  viewport.drag().pinch().wheel().decelerate().clamp({\n    direction: 'all',\n    underflow: 'center'\n  }).clampZoom({\n    minScale: 1,\n    maxScale: 5\n  });\n\n  // Prevent pinch gesture in Chrome\n\n  window.addEventListener('wheel', e => {\n    e.preventDefault();\n  }, {\n    passive: false\n  });\n});\n(Object.getOwnPropertyDescriptor(__WEBPACK_DEFAULT_EXPORT__, \"name\") || {}).writable || Object.defineProperty(__WEBPACK_DEFAULT_EXPORT__, \"name\", { value: \"default\", configurable: true });\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/elements/pixi.js?\n}");

/***/ },

/***/ "./src/elements/projection.js"
/*!************************************!*\
  !*** ./src/elements/projection.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PROJECTIONS: () => (/* binding */ PROJECTIONS),\n/* harmony export */   buildProjection: () => (/* binding */ buildProjection)\n/* harmony export */ });\n// Shared projection state — all drawing modules read from s.projection\n\nconst PROJECTIONS = {\n  'Mercator': 'geoMercator',\n  'Natural Earth': 'geoNaturalEarth1',\n  'Equal Earth': 'geoEqualEarth',\n  'Equirectangular': 'geoEquirectangular',\n  'Orthographic': 'geoOrthographic',\n  'Stereographic': 'geoStereographic',\n  'Azimuthal Equal Area': 'geoAzimuthalEqualArea',\n  'Azimuthal Equidistant': 'geoAzimuthalEquidistant',\n  'Gnomonic': 'geoGnomonic',\n  'Conic Equal Area': 'geoConicEqualArea',\n  'Transverse Mercator': 'geoTransverseMercator'\n};\nfunction buildProjection(name) {\n  const fn = d3[PROJECTIONS[name]];\n  if (!fn) throw new Error(`Unknown projection: ${name}`);\n  const W = window.innerWidth;\n  const H = window.innerHeight;\n  const dim = Math.max(W, H);\n\n  // Fit to the LARGER dimension so the sphere fills the screen\n  // edge-to-edge. Otherwise a square-ish projection (e.g. Mercator)\n  // on a portrait screen leaves empty bands top and bottom — that's\n  // the \"frame\" effect. We then re-center on the actual screen.\n  return fn().fitSize([dim, dim], {\n    type: 'Sphere'\n  }).translate([W / 2, H / 2]);\n}\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/elements/projection.js?\n}");

/***/ },

/***/ "./src/elements/simulation.js"
/*!************************************!*\
  !*** ./src/elements/simulation.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   simulation: () => (/* binding */ simulation),\n/* harmony export */   ticked: () => (/* binding */ ticked)\n/* harmony export */ });\n/* harmony import */ var d3_force_3d__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! d3-force-3d */ \"./node_modules/d3-force-3d/src/simulation.js\");\n/* harmony import */ var _links__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./links */ \"./src/elements/links.js\");\n/* harmony import */ var _nodes__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./nodes */ \"./src/elements/nodes.js\");\n\n\n\nconst {\n  cos,\n  sin,\n  atan2\n} = Math;\nconst halfPi = Math.PI / 2;\nconst asin = x => x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x);\nconst spherical = ([x, y, z]) => [atan2(y, x), asin(z)];\nfunction simulation() {\n  const sim = d3_force_3d__WEBPACK_IMPORTED_MODULE_0__[\"default\"]().numDimensions(3).nodes(s.nodes).force(\"collide\", d3.forceCollide().radius(60)).force(\"charge\", d3.forceManyBody().strength(-20)).force(\"link\", d3.forceLink(s.links).id(d => d.id).strength(d => d.value)).force(\"center\", d3.forceCenter()).force(\"surface\", function () {\n    const R = 15 * Math.sqrt(s.nodes.length);\n    for (const node of s.nodes) {\n      if (node.fx) node.x = node.fx;\n      if (node.fy) node.y = node.fy;\n      if (node.fz) node.z = node.fz;\n      node.norm = Math.sqrt(node.x ** 2 + node.y ** 2 + node.z ** 2) || 1;\n\n      // Project to unit sphere and store as [lon, lat] in degrees\n      node.spherical = spherical([node.x / node.norm, node.y / node.norm, node.z / node.norm]).map(d => d * 180 / Math.PI);\n\n      // Pull node towards sphere surface of radius R\n      const f = (1 + R / node.norm) / 2;\n      node.x *= f;\n      node.y *= f;\n      node.z *= f;\n\n      // Constrain velocity to tangent plane\n      const sp = (node.vx * node.x + node.vy * node.y + node.vz * node.z) / node.norm ** 2;\n      node.vx -= node.x * sp;\n      node.vy -= node.y * sp;\n      node.vz -= node.z * sp;\n    }\n  }).on('tick', ticked);\n}\nfunction ticked() {\n  (0,_links__WEBPACK_IMPORTED_MODULE_1__.drawLinks)();\n  (0,_nodes__WEBPACK_IMPORTED_MODULE_2__.drawNodes)();\n}\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/elements/simulation.js?\n}");

/***/ },

/***/ "./src/index.js"
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _node_modules_normalize_css_normalize_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/normalize.css/normalize.css */ \"./node_modules/normalize.css/normalize.css\");\n/* harmony import */ var _index_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./index.css */ \"./src/index.css\");\n/* harmony import */ var d3__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! d3 */ \"./node_modules/d3/src/index.js\");\n/* harmony import */ var _data_nodes_json__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./data/nodes.json */ \"./src/data/nodes.json\");\n/* harmony import */ var _data_links_json__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./data/links.json */ \"./src/data/links.json\");\n/* harmony import */ var _elements_pixi_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./elements/pixi.js */ \"./src/elements/pixi.js\");\n/* harmony import */ var _elements_links_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./elements/links.js */ \"./src/elements/links.js\");\n/* harmony import */ var _elements_nodes_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./elements/nodes.js */ \"./src/elements/nodes.js\");\n/* harmony import */ var _elements_background__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./elements/background */ \"./src/elements/background.js\");\n/* harmony import */ var _elements_simulation__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./elements/simulation */ \"./src/elements/simulation.js\");\n/* harmony import */ var _elements_projection_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./elements/projection.js */ \"./src/elements/projection.js\");\n// CSS\n\n\n\n\n// Libraries\n\n\n\n// Data\n\n\n\n\n// Init\n\n\n\n\n\n\n\n\n// Global variables\n\nwindow.d3 = d3__WEBPACK_IMPORTED_MODULE_2__;\nwindow.s = {\n  links: _data_links_json__WEBPACK_IMPORTED_MODULE_4__,\n  nodes: _data_nodes_json__WEBPACK_IMPORTED_MODULE_3__,\n  projection: null\n};\n\n// Projection selector\n\nfunction initProjectionPanel() {\n  const select = document.getElementById('projection-select');\n  Object.keys(_elements_projection_js__WEBPACK_IMPORTED_MODULE_10__.PROJECTIONS).forEach(name => {\n    const option = document.createElement('option');\n    option.value = name;\n    option.textContent = name;\n    if (name === 'Mercator') option.selected = true;\n    select.appendChild(option);\n  });\n  select.addEventListener('change', () => {\n    s.projection = (0,_elements_projection_js__WEBPACK_IMPORTED_MODULE_10__.buildProjection)(select.value);\n    (0,_elements_links_js__WEBPACK_IMPORTED_MODULE_6__.refreshGeoPath)();\n    (0,_elements_links_js__WEBPACK_IMPORTED_MODULE_6__.drawLinks)();\n    (0,_elements_nodes_js__WEBPACK_IMPORTED_MODULE_7__.drawNodes)();\n  });\n}\n\n// Start\n\nPromise.all([d3__WEBPACK_IMPORTED_MODULE_2__.json(_data_nodes_json__WEBPACK_IMPORTED_MODULE_3__), d3__WEBPACK_IMPORTED_MODULE_2__.json(_data_links_json__WEBPACK_IMPORTED_MODULE_4__)]).then(([nodes, links]) => {\n  s.links = links;\n  s.nodes = nodes;\n  console.log('nodes', s.nodes.length);\n  console.log('links', s.links.length);\n\n  // Build the initial projection before any drawing happens\n  s.projection = (0,_elements_projection_js__WEBPACK_IMPORTED_MODULE_10__.buildProjection)('Mercator');\n  (0,_elements_pixi_js__WEBPACK_IMPORTED_MODULE_5__[\"default\"])();\n  (0,_elements_links_js__WEBPACK_IMPORTED_MODULE_6__.initLinks)();\n  (0,_elements_nodes_js__WEBPACK_IMPORTED_MODULE_7__.initNodes)();\n  (0,_elements_background__WEBPACK_IMPORTED_MODULE_8__[\"default\"])();\n  (0,_elements_simulation__WEBPACK_IMPORTED_MODULE_9__.simulation)();\n  initProjectionPanel();\n  window.onresize = function () {\n    (0,_elements_background__WEBPACK_IMPORTED_MODULE_8__[\"default\"])();\n    s.projection = (0,_elements_projection_js__WEBPACK_IMPORTED_MODULE_10__.buildProjection)(document.getElementById('projection-select').value);\n    (0,_elements_links_js__WEBPACK_IMPORTED_MODULE_6__.refreshGeoPath)();\n    // Keep world bounds in sync with screen so clamp/clampZoom\n    // continue to prevent the empty-frame effect after resize.\n    const D = Math.max(window.innerWidth, window.innerHeight);\n    s.pixi.resize(window.innerWidth, window.innerHeight, D, D);\n  };\n});\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/index.js?\n}");

/***/ },

/***/ "./src/index.css"
/*!***********************!*\
  !*** ./src/index.css ***!
  \***********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("{__webpack_require__.r(__webpack_exports__);\n// extracted by mini-css-extract-plugin\n\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/index.css?\n}");

/***/ },

/***/ "./src/data/links.json"
/*!*****************************!*\
  !*** ./src/data/links.json ***!
  \*****************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
eval("{module.exports = __webpack_require__.p + \"links.json\";\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/data/links.json?\n}");

/***/ },

/***/ "./src/data/nodes.json"
/*!*****************************!*\
  !*** ./src/data/nodes.json ***!
  \*****************************/
(module, __unused_webpack_exports, __webpack_require__) {

"use strict";
eval("{module.exports = __webpack_require__.p + \"nodes.json\";\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./src/data/nodes.json?\n}");

/***/ },

/***/ "?4f7e"
/*!********************************!*\
  !*** ./util.inspect (ignored) ***!
  \********************************/
() {

eval("{/* (ignored) */\n\n//# sourceURL=webpack://lexical-cartography-of-covid-19/./util.inspect_(ignored)?\n}");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"main": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunklexical_cartography_of_covid_19"] = self["webpackChunklexical_cartography_of_covid_19"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_d3-force-3d_src_simulation_js-node_modules_normalize_css_normalize_css-n-e3fd9c"], () => (__webpack_require__("./src/index.js")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;