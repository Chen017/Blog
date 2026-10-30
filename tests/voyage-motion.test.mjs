import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { compareHomeEntries } from "../src/utils/home-post.ts";

const stripTypeScriptTypes = nodeModule.stripTypeScriptTypes || ((code) =>
	ts.transpileModule(code, {
		compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext }
	}).outputText
);

class ElementStub {
	constructor() {
		this.isConnected = true;
		this.attributes = {};
		this.dataset = {};
		this.listeners = {};
		this.style = { setProperty() {} };
		this.clientWidth = 160;
		this.clientHeight = 119;
		this.animations = [];
		this.hidden = false;
	}
	addEventListener(name, handler) {
		this.listeners[name] = handler;
	}
	setAttribute(name, value) {
		this.attributes[name] = value;
	}
	removeAttribute(name) {
		delete this.attributes[name];
	}
	toggleAttribute(name, value) {
		if (value) this.attributes[name] = "";
		else delete this.attributes[name];
	}
	querySelectorAll() {
		return [];
	}
	querySelector() {
		return null;
	}
	getAnimations() {
		return this.animations;
	}
	append() {}
	getBoundingClientRect() {
		return { left: 0, top: 0, width: 100, height: 100 };
	}
	animate(keyframes, options) {
		const animation = { keyframes, options, cancelled: false, finished: new Promise(() => {}), cancel() { this.cancelled = true; } };
		this.animations.push(animation);
		return animation;
	}
}

test("system reduced motion governs animation and history return ignores the retired pause preference", async () => {
	const raw = await readFile("src/scripts/voyage.ts", "utf8");
	const program = stripTypeScriptTypes(raw.slice(raw.indexOf("let homeController")), {
		mode: "transform",
	});
	const elements = new Map();
	const root = new ElementStub();
	const trace = [];
	const makeEntry = (category, date, top) => {
		const entry = new ElementStub();
		entry.dataset = { category, date };
		entry.getBoundingClientRect = () => {
			trace.push("read");
			return { left: 0, top, width: 100, height: 100 };
		};
		const baseAnimate = entry.animate.bind(entry);
		entry.animate = (keyframes, options) => {
			trace.push("write");
			return baseAnimate(keyframes, options);
		};
		return entry;
	};
	const cards = [
		makeEntry("Development", "2026-03-01", 0),
		makeEntry("Development", "2026-02-01", 120),
		makeEntry("Life", "2026-01-01", 240),
	];
	const allBtn = new ElementStub();
	allBtn.dataset = { category: "All" };
	const devBtn = new ElementStub();
	devBtn.dataset = { category: "Development" };
	root.querySelector = (selector) => {
		if (!elements.has(selector)) elements.set(selector, new ElementStub());
		return elements.get(selector);
	};
	root.querySelectorAll = (selector) =>
		selector === "button[data-category]" ? [allBtn, devBtn] : [];
	root.querySelector(".nv-grid").querySelectorAll = () => cards;
	const strokes = [new ElementStub(), new ElementStub(), new ElementStub()];
	root.querySelector(".nv-graph-trigger").querySelectorAll = () => strokes;
	const media = {
		matches: true,
		addEventListener(_, handler) {
			this.change = handler;
		},
	};
	const windowListeners = {};
	const documentListeners = {};
	const storage = new Map([["etalib:motion", "off"]]);
	const events = [];
	const context = vm.createContext({
		compareHomeEntries,
		announcePageReady() {},
		CLOSE_PANELS: "close-panels",
		PAGE_BEFORE_REPLACE: "before-replace",
		document: {
			hidden: false,
			documentElement: new ElementStub(),
			getElementById: () => root,
			addEventListener: (name, handler) => {
				documentListeners[name] = handler;
			},
			dispatchEvent: (event) => events.push(event.type),
		},
		window: {
			matchMedia: () => media,
			addEventListener: (name, handler) => {
				windowListeners[name] = handler;
			},
		},
		localStorage: {
			getItem: (key) => storage.get(key),
			setItem: (key, value) => storage.set(key, value),
		},
		ResizeObserver: class {
			observe() {}
			disconnect() {}
		},
		AbortController,
		cancelAnimationFrame() {},
		Event,
		CustomEvent,
	});
	vm.runInContext(program, context);
	const page = elements.get(".nv-page");
	const orbit = elements.get("[data-binary]");
	assert.equal(page.dataset.motion, "off");
	assert.equal(orbit.disabled, true);
	const graph = elements.get(".nv-graph-trigger");
	graph.listeners.focus();
	assert.equal(strokes[0].animations.length, 0, "reduced motion leaves the graph static");
	media.matches = false;
	media.change();
	assert.equal(page.dataset.motion, "on");
	assert.equal(orbit.disabled, false);

	trace.length = 0;
	devBtn.listeners.click();
	const firstWrite = trace.indexOf("write");
	const lastRead = trace.lastIndexOf("read");
	assert.ok(firstWrite > 0 && lastRead < firstWrite, "all layout reads complete before any FLIP animation starts");

	graph.listeners.focus();
	assert.deepEqual(strokes.map(stroke => stroke.animations[0].options.delay), [0, 1400, 2800]);
	graph.listeners.pointerleave();
	assert.ok(strokes.every(stroke => stroke.animations[0].cancelled), "leaving cancels all attempts");
	windowListeners.pagehide({ persisted: true });
	assert.deepEqual(events, ["close-panels", "before-replace"]);
	windowListeners.pageshow({ persisted: true });
	assert.equal(page.dataset.motion, "on");
	media.matches = true;
	media.change();
	assert.equal(page.dataset.motion, "off");
	assert.equal(orbit.disabled, true);
});

test("Home navigation splits initialization into visual state preparation and post-transition interaction", async () => {
	const raw = await readFile("src/scripts/voyage.ts", "utf8");
	const program = stripTypeScriptTypes(raw.slice(raw.indexOf("let homeController")), {
		mode: "transform",
	});
	const elements = new Map();
	const root = new ElementStub();
	const makeEntry = (category, date, top) => {
		const entry = new ElementStub();
		entry.dataset = { category, date };
		entry.getBoundingClientRect = () => ({ left: 0, top, width: 100, height: 100 });
		return entry;
	};
	const cards = [
		makeEntry("Development", "2026-03-01", 0),
		makeEntry("Development", "2026-02-01", 120),
		makeEntry("Life", "2026-01-01", 240),
	];
	const allBtn = new ElementStub();
	allBtn.dataset = { category: "All" };
	const devBtn = new ElementStub();
	devBtn.dataset = { category: "Development" };
	root.querySelector = (selector) => {
		if (!elements.has(selector)) elements.set(selector, new ElementStub());
		return elements.get(selector);
	};
	root.querySelectorAll = (selector) =>
		selector === "button[data-category]" ? [allBtn, devBtn] : [];
	root.querySelector(".nv-grid").querySelectorAll = () => cards;
	const strokes = [new ElementStub(), new ElementStub(), new ElementStub()];
	root.querySelector(".nv-graph-trigger").querySelectorAll = () => strokes;
	const media = {
		matches: false,
		addEventListener(_, handler) {
			this.change = handler;
		},
	};
	const windowListeners = {};
	const documentListeners = {};
	const storage = new Map([
		["voyage:category", "Development"],
		["voyage:order", "recent"],
	]);
	const events = [];

	let resolveTransition;
	const transitionPromise = new Promise(resolve => {
		resolveTransition = resolve;
	});
	const homeTransition = {
		id: 1,
		from: "/friends/",
		finished: transitionPromise,
	};

	const windowObj = {
		__voyageHomeTransition: homeTransition,
		matchMedia: () => media,
		location: { pathname: "/", hash: "" },
		scrollY: 0,
		scrollTo() {},
		addEventListener: (name, handler) => {
			windowListeners[name] = handler;
		},
	};

	const context = vm.createContext({
		compareHomeEntries,
		announcePageReady() {
			events.push("twilight:page:loaded");
		},
		CLOSE_PANELS: "close-panels",
		PAGE_BEFORE_REPLACE: "before-replace",
		document: {
			hidden: false,
			documentElement: new ElementStub(),
			getElementById: (id) => (id === "voyage-afterhours" ? root : null),
			addEventListener: (name, handler) => {
				documentListeners[name] = handler;
			},
			dispatchEvent: (event) => events.push(event.type),
		},
		window: windowObj,
		location: { pathname: "/", hash: "" },
		sessionStorage: {
			getItem: (key) => storage.get(key),
			setItem: (key, value) => storage.set(key, value),
		},
		history: {
			state: {
				voyage: {
					category: "Development",
					order: "recent",
					scroll: 0,
				},
			},
		},
		ResizeObserver: class {
			observe() {}
			disconnect() {}
		},
		AbortController,
		cancelAnimationFrame() {},
		requestAnimationFrame(cb) { return setTimeout(cb, 0); },
		Event,
		CustomEvent,
	});

	vm.runInContext(program, context);

	// Stage 1 verification: visual state restoration happened BEFORE transition finished
	assert.equal(allBtn.attributes["aria-pressed"], "false", "non-matching button is not pressed");
	assert.equal(devBtn.attributes["aria-pressed"], "true", "matching button restored in stage 1");
	assert.equal(cards[2].hidden, true, "Life entry is filtered out immediately in stage 1");
	assert.equal(cards[0].hidden, false);
	assert.equal(cards[1].hidden, false);

	// Stage 2 should NOT have executed yet
	assert.equal(devBtn.listeners.click, undefined, "click interactions deferred until transition finished");
	const graph = elements.get(".nv-graph-trigger");
	assert.equal(graph.listeners.focus, undefined, "graph focus deferred until transition finished");
	assert.ok(!events.includes("twilight:page:loaded"), "announcePageReady deferred until transition finished");

	// Now transition finishes
	resolveTransition();
	await transitionPromise;
	await new Promise(r => setTimeout(r, 10));

	// Stage 2 verification: interactions are now attached
	assert.ok(typeof devBtn.listeners.click === "function", "click listener attached after transition finishes");
	assert.ok(typeof graph.listeners.focus === "function", "graph focus listener attached after transition finishes");
	assert.ok(events.includes("twilight:page:loaded"), "announcePageReady fired after transition finishes");

	// Double resolution should not re-initialize or throw
	resolveTransition();
	await Promise.resolve();
	assert.ok(typeof devBtn.listeners.click === "function");
});

test("navigation abort before transition finished cancels stage 2 initialization", async () => {
	const raw = await readFile("src/scripts/voyage.ts", "utf8");
	const program = stripTypeScriptTypes(raw.slice(raw.indexOf("let homeController")), {
		mode: "transform",
	});
	const elements = new Map();
	const root = new ElementStub();
	const devBtn = new ElementStub();
	devBtn.dataset = { category: "Development" };
	root.querySelector = (selector) => {
		if (!elements.has(selector)) elements.set(selector, new ElementStub());
		return elements.get(selector);
	};
	root.querySelectorAll = () => [devBtn];
	root.querySelector(".nv-grid").querySelectorAll = () => [];
	root.querySelector(".nv-graph-trigger").querySelectorAll = () => [];
	const media = { matches: false, addEventListener() {} };
	const documentListeners = {};
	const events = [];

	let resolveTransition;
	const transitionPromise = new Promise(resolve => {
		resolveTransition = resolve;
	});
	const homeTransition = {
		id: 2,
		from: "/archive/",
		finished: transitionPromise,
	};

	const windowObj = {
		__voyageHomeTransition: homeTransition,
		matchMedia: () => media,
		location: { pathname: "/", hash: "" },
		addEventListener: () => {},
	};

	const context = vm.createContext({
		compareHomeEntries,
		announcePageReady() {
			events.push("twilight:page:loaded");
		},
		CLOSE_PANELS: "close-panels",
		PAGE_BEFORE_REPLACE: "before-replace",
		document: {
			hidden: false,
			documentElement: new ElementStub(),
			getElementById: (id) => (id === "voyage-afterhours" ? root : null),
			addEventListener: (name, handler) => {
				documentListeners[name] = handler;
			},
			dispatchEvent: (event) => events.push(event.type),
		},
		window: windowObj,
		location: { pathname: "/", hash: "" },
		sessionStorage: { getItem: () => null, setItem: () => {} },
		history: { state: null },
		ResizeObserver: class { observe() {} disconnect() {} },
		AbortController,
		cancelAnimationFrame() {},
		requestAnimationFrame(cb) { return setTimeout(cb, 0); },
		Event,
		CustomEvent,
	});

	vm.runInContext(program, context);

	// User leaves before transition finishes: astro:before-swap fires
	assert.ok(documentListeners["astro:before-swap"], "astro:before-swap listener registered");
	documentListeners["astro:before-swap"]();

	// Transition settles afterwards
	resolveTransition();
	await transitionPromise;
	await new Promise(r => setTimeout(r, 10));

	// Stage 2 must NOT have run
	assert.equal(devBtn.listeners.click, undefined, "aborted transition leaves stage 2 unattached");
	assert.ok(!events.includes("twilight:page:loaded"), "aborted transition does not announce page ready");
});

test("opening animation on direct visit uses original timing and easing", async () => {
	const raw = await readFile("src/scripts/voyage.ts", "utf8");
	const program = stripTypeScriptTypes(raw.slice(raw.indexOf("let homeController")), {
		mode: "transform",
	});
	const elements = new Map();
	const root = new ElementStub();
	const devBtn = new ElementStub();
	devBtn.dataset = { category: "All" };
	root.querySelector = (selector) => {
		if (!elements.has(selector)) elements.set(selector, new ElementStub());
		return elements.get(selector);
	};
	root.querySelectorAll = () => [devBtn];
	root.querySelector(".nv-grid").querySelectorAll = () => [];
	root.querySelector(".nv-graph-trigger").querySelectorAll = () => [];
	const media = { matches: false, addEventListener() {} };
	const events = [];
	const storage = new Map();

	const titleFirst = new ElementStub();
	const titleEm = new ElementStub();
	const horizon = new ElementStub();
	elements.set(".nv-title-first", titleFirst);
	elements.set("h1 em", titleEm);
	elements.set(".nv-horizon", horizon);

	const windowObj = {
		__voyageHomeTransition: null,
		matchMedia: () => media,
		location: { pathname: "/", hash: "" },
		addEventListener: () => {},
	};

	const context = vm.createContext({
		compareHomeEntries,
		announcePageReady() {
			events.push("twilight:page:loaded");
		},
		CLOSE_PANELS: "close-panels",
		PAGE_BEFORE_REPLACE: "before-replace",
		document: {
			hidden: false,
			documentElement: new ElementStub(),
			getElementById: (id) => (id === "voyage-afterhours" ? root : null),
			addEventListener: () => {},
			dispatchEvent: (event) => events.push(event.type),
		},
		window: windowObj,
		location: { pathname: "/", hash: "" },
		sessionStorage: {
			getItem: (key) => storage.get(key),
			setItem: (key, value) => storage.set(key, value),
		},
		history: { state: null },
		ResizeObserver: class { observe() {} disconnect() {} },
		AbortController,
		cancelAnimationFrame() {},
		requestAnimationFrame(cb) { return setTimeout(cb, 0); },
		Event,
		CustomEvent,
	});

	vm.runInContext(program, context);

	assert.equal(storage.get("voyage:opened"), "true");
	assert.equal(titleFirst.animations[0].options.duration, 1800);
	assert.equal(titleFirst.animations[0].options.delay, 450);
	assert.equal(titleFirst.animations[0].options.easing, "cubic-bezier(.16,.8,.2,1)");
	assert.equal(titleEm.animations[0].options.duration, 2100);
	assert.equal(titleEm.animations[0].options.delay, 550);
	assert.equal(horizon.animations[0].options.duration, 2300);
	assert.equal(horizon.animations[0].options.delay, 450);
	assert.ok(events.includes("twilight:page:loaded"));
});

test("Solutions 1 + 2 + 3 + 4: root viewport transitions, 100vh DOM pre-collapse, deferred post-swap work, and hover prefetching", async () => {
	const raw = await readFile("src/scripts/voyage.ts", "utf8");
	const program = stripTypeScriptTypes(raw.slice(raw.indexOf("let homeController")), {
		mode: "transform",
	});
	const elements = new Map();
	const root = new ElementStub();
	const devBtn = new ElementStub();
	devBtn.dataset = { category: "All" };
	root.querySelector = (selector) => {
		if (!elements.has(selector)) elements.set(selector, new ElementStub());
		return elements.get(selector);
	};
	root.querySelectorAll = () => [devBtn];
	root.querySelector(".nv-grid").querySelectorAll = () => [];
	root.querySelector(".nv-graph-trigger").querySelectorAll = () => [];
	const media = { matches: false, addEventListener() {} };

	let resolveTransition;
	const transitionPromise = new Promise(resolve => {
		resolveTransition = resolve;
	});
	const homeTransition = {
		id: 3,
		from: "/archive/",
		finished: transitionPromise,
	};

	const docEl = new ElementStub();
	docEl.setAttribute("data-voyage-home-transition", "");
	docEl.setAttribute("data-voyage-home-fold-deferred", "");

	const windowObj = {
		__voyageHomeTransition: homeTransition,
		matchMedia: () => media,
		location: { pathname: "/", hash: "" },
		addEventListener: () => {},
	};

	const context = vm.createContext({
		compareHomeEntries,
		announcePageReady() {},
		CLOSE_PANELS: "close-panels",
		PAGE_BEFORE_REPLACE: "before-replace",
		document: {
			hidden: false,
			documentElement: docEl,
			getElementById: (id) => (id === "voyage-afterhours" ? root : null),
			addEventListener: () => {},
			dispatchEvent: () => {},
		},
		window: windowObj,
		location: { pathname: "/", hash: "" },
		sessionStorage: {
			getItem: () => "true",
			setItem: () => {},
		},
		history: { state: null },
		ResizeObserver: class { observe() {} disconnect() {} },
		AbortController,
		cancelAnimationFrame() {},
		requestAnimationFrame(cb) { return setTimeout(cb, 0); },
		Event,
		CustomEvent,
	});

	vm.runInContext(program, context);

	assert.equal(docEl.attributes["data-voyage-home-transition"], "");
	assert.equal(docEl.attributes["data-voyage-home-fold-deferred"], "");

	resolveTransition();
	await transitionPromise;
	await new Promise(r => setTimeout(r, 10));

	assert.equal("data-voyage-home-transition" in docEl.attributes, false);
	assert.equal("data-voyage-home-fold-deferred" in docEl.attributes, false);

	const homeLayout = await readFile("src/layouts/home.astro", "utf8");
	assert.match(homeLayout, /transition:name="root"\s+transition:animate=\{voyageSlide\}/);

	const indexPage = await readFile("src/pages/index.astro", "utf8");
	assert.ok(!indexPage.includes("transition:name=\"voyage-page\""));

	const gridLayout = await readFile("src/layouts/grid.astro", "utf8");
	assert.ok(!gridLayout.includes("transition:name=\"voyage-page\""));

	const css = await readFile("src/styles/voyage.css", "utf8");
	assert.match(css, /::view-transition-group\(root\)\s*\{\s*animation-duration:\s*0s;\s*animation:\s*none;\s*overflow:\s*clip;\s*\}/);
	assert.match(css, /html\[data-voyage-home-fold-deferred\]\s+\.voyage-home\s+#voyage-afterhours\s+:is\(\.nv-grid,\s*\.nv-end,\s*\.nv-signoff,\s*\.nv-footer\)\s*\{\s*display:\s*none\s*!important;/);
	assert.match(css, /html:is\(\[data-astro-transition\],\s*\[data-voyage-home-transition\]\)\s+#voyage-afterhours\s+:is\(\.nv-twinkle,\s*\.nv-sky\)\s*\{\s*animation:\s*none\s*!important;\s*\}/);

	const header = await readFile("src/components/site/Header.astro", "utf8");
	assert.match(header, /transition:persist="voyage-search"/);
	assert.match(header, /data-astro-prefetch=.*?"hover"/);

	const archive = await readFile("src/pages/archive.astro", "utf8");
	assert.match(archive, /<ArchivePanel\s+sortedPosts=\{sortedPostsList\}\s+client:idle\s*\/>/);

	const headingMotion = await readFile("src/scripts/heading-motion.ts", "utf8");
	assert.match(headingMotion, /transitionDone\.then/);

	const siteScript = await readFile("src/scripts/site.ts", "utf8");
	assert.match(siteScript, /transitionFinished\.then\(finishSiteInit/);
});
