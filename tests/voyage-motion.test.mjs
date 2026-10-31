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
	assert.equal(elements.has("h1 em"), false, "return flourish cannot start inside a View Transition screenshot");

	// Now transition finishes
	resolveTransition();
	await transitionPromise;
	await new Promise(r => setTimeout(r, 10));

	// Stage 2 verification: interactions are now attached
	assert.ok(typeof devBtn.listeners.click === "function", "click listener attached after transition finishes");
	assert.ok(typeof graph.listeners.focus === "function", "graph focus listener attached after transition finishes");
	assert.ok(events.includes("twilight:page:loaded"), "announcePageReady fired after transition finishes");
	const flourish = elements.get("h1 em")?.animations[0];
	assert.ok(flourish, "Space. resumes its decorative entrance after returning Home");
	assert.equal(flourish.options.duration, 820, "the short return flourish never replays the full opening");
	assert.equal(flourish.options.easing, "cubic-bezier(.16,.8,.2,1)");
	assert.equal(flourish.options.fill, undefined, "return animation leaves no persistent overlay");
	assert.equal(flourish.keyframes[0].translate, "0 0", "return animation starts at the resting position");
	assert.equal(flourish.keyframes.at(-1).translate, "0 0", "return animation settles without a position jump");
	assert.ok(flourish.keyframes.every(frame => !("opacity" in frame) && !("filter" in frame)),
		"return flourish never dims or blurs the plus-lighter lettering");

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
	assert.equal(elements.has("h1 em"), false, "aborted navigation does not replay the Space. flourish");
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
	const finishers = [];
	for (const element of [titleFirst, titleEm, horizon]) {
		const original = element.animate.bind(element);
		element.animate = (...args) => {
			const animation = original(...args);
			animation.finished = new Promise(resolve => finishers.push(resolve));
			return animation;
		};
	}
	const html = new ElementStub();
	html.setAttribute("data-voyage-opening", "");
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
			documentElement: html,
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
	assert.equal(titleEm.animations.length, 1, "direct first visit must not also run the return flourish");
	assert.equal(titleEm.animations[0].options.delay, 550);
	assert.equal(horizon.animations[0].options.duration, 2300);
	assert.equal(horizon.animations[0].options.delay, 450);
	assert.ok(events.includes("twilight:page:loaded"));
	assert.equal(html.attributes["data-voyage-opening"], "", "opening guard must survive the entire running animation");
	finishers.forEach(resolve => resolve());
	await new Promise(resolve => setImmediate(resolve));
	assert.equal(html.attributes["data-voyage-opening"], undefined, "opening guard is removed after completion");
	assert.equal(titleEm.animations[0].cancelled, true, "completed filled animation no longer overrides final CSS");
});

test("Solutions 1A + 2A + 3A and Post -> Home exit title morph: unclipped overscan, zero-jump pointer, star pause, heading reveal, and viewport scroll alignment", async () => {
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
	const returnedCard = new ElementStub();
	returnedCard.id = "entry-1";
	returnedCard.getBoundingClientRect = () => ({ left: 400, top: 1075.5, bottom: 1125.5, width: 154, height: 50 });
	root.querySelector(".nv-grid").querySelectorAll = () => [returnedCard];
	root.querySelector(".nv-graph-trigger").querySelectorAll = () => [];
	const hero = root.querySelector(".nv-hero");
	hero.getBoundingClientRect = () => ({ left: 0, top: 86, width: 1280, height: 760 });
	const page = root.querySelector(".nv-page");
	const props = new Map();
	page.style.setProperty = (k, v) => props.set(k, v);
	const media = { matches: false, addEventListener() {} };

	let resolveTransition;
	const transitionPromise = new Promise(resolve => {
		resolveTransition = resolve;
	});
	const homeTransition = {
		id: 4,
		from: "/posts/test/",
		finished: transitionPromise,
	};

	const docEl = new ElementStub();
	docEl.setAttribute("data-voyage-home-transition", "");
	docEl.setAttribute("data-voyage-entry-transition", "");

	const windowObj = {
		__voyageHomeTransition: homeTransition,
		scrollY: 0,
		innerHeight: 736,
		scrollTo(opts) { if (opts && typeof opts.top === "number") this.scrollY = opts.top; },
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
			getElementById: (id) => (id === "voyage-afterhours" ? root : id === "entry-1" ? returnedCard : null),
			addEventListener: () => {},
			dispatchEvent: () => {},
		},
		window: windowObj,
		location: { pathname: "/", hash: "" },
		sessionStorage: {
			getItem: (key) => key === "voyage:source" ? JSON.stringify({ post: "/posts/test/", current: "/posts/test/", from: "/", card: "entry-1" }) : "true",
			setItem: () => {},
		},
		history: { state: { voyage: { category: "All", order: "recent", source: "entry-1", scroll: 0 } } },
		ResizeObserver: class { observe() {} disconnect() {} },
		AbortController,
		cancelAnimationFrame() {},
		requestAnimationFrame(cb) { return setTimeout(cb, 0); },
		Event,
		CustomEvent,
	});

	vm.runInContext(program, context);

	// Stage 1 immediately aligns scrollY so an offscreen returned card (top=1075.5px in 736px viewport) is brought into view before snapshot capture
	assert.equal(returnedCard.dataset.returned, "true");
	assert.equal(windowObj.scrollY, 634, "Stage 1 scrolls offscreen returned card into viewport before View Transition snapshot");

	resolveTransition();
	await transitionPromise;
	await new Promise(r => setTimeout(r, 10));

	// Solution 2A: First pointermove near top nav bar anchors origin at (0, 0) instead of jumping to -1
	hero.listeners.pointermove({ pointerType: "mouse", clientX: 640, clientY: 90 });
	await new Promise(r => setTimeout(r, 5));
	assert.equal(Number(props.get("--nv-px")), 0, "first pointermove after return has 0 horizontal jump");
	assert.equal(Number(props.get("--nv-py")), 0, "first pointermove after return has 0 vertical jump");

	// Subsequent pointermove shifts smoothly relative to decayed anchor
	hero.listeners.pointermove({ pointerType: "mouse", clientX: 900, clientY: 300 });
	await new Promise(r => setTimeout(r, 5));
	assert.ok(Number(props.get("--nv-px")) > 0, "subsequent pointermove shifts parallax smoothly");

	const css = await readFile("src/styles/voyage.css", "utf8");
	assert.match(css, /#voyage-afterhours\s+\.nv-photograph,[\s\S]*?max-width:\s*none\s*!important;/);
	assert.match(css, /html:is\(\[data-astro-transition\],\s*\[data-voyage-home-transition\]\)\s+#voyage-afterhours\s+:is\(\.nv-twinkle,\s*\.nv-sky\)\s*\{\s*animation-play-state:\s*paused\s*!important;\s*\}/);

	const headingMotion = await readFile("src/scripts/heading-motion.ts", "utf8");
	assert.match(headingMotion, /const\s+baseDelay\s*=\s*inTransition\s*\?\s*110\s*:\s*0/);
	assert.match(css, /::view-transition-group\(voyage-entry-title\)\s*\{\s*animation-duration:\s*620ms;/);
	assert.match(css, /#voyage-afterhours\s+\.archive-title\[data-entry-title\]\s*\{\s*justify-self:\s*start;\s*width:\s*fit-content;/);
	assert.match(css, /#voyage-afterhours\s+\.nv-entry:focus-within:not\(:hover\):not\(:has\(:focus-visible\)\)\s*\{[^}]*transform:\s*none;/);
	assert.match(css, /html,\s*body\s*\{\s*scroll-behavior:\s*auto\s*!important;\s*\}/);
	assert.match(css, /html\[data-voyage-entry-transition\]\s+#voyage-afterhours\s+:is\(\.nv-main,\s*\.nv-grid,\s*\.nv-entry\)\s*\{\s*content-visibility:\s*visible\s*!important;\s*\}/);
	assert.doesNotMatch(css, /\.voyage-home\s+#voyage-afterhours\s+\.nv-grid\s*\{\s*content-visibility:\s*auto;/);
	assert.match(css, /::view-transition-old\(voyage-header\),\s*::view-transition-new\(voyage-header\)\s*\{\s*animation:\s*none\s*!important;/);
	assert.match(css, /html\[data-voyage-entry-transition\]:not\(\[data-motion="off"\]\)::view-transition-old\(root\)\s*\{\s*animation:\s*360ms/);
	assert.match(css, /html\[data-voyage-entry-transition\]:not\(\[data-motion="off"\]\)::view-transition-new\(root\)\s*\{\s*animation:\s*420ms/);
	const tocTs = await readFile("src/components/sidebar/toc.ts", "utf8");
	assert.match(tocTs, /if\s*\(!inTransition\)\s*\{\s*this\.queueInit\(\);\s*\}/);
	const siteTs = await readFile("src/scripts/site.ts", "utf8");
	assert.match(siteTs, /whenTransitionSettled\(\)/);
	const deferredAstro = await readFile("src/components/common/deferredImage.astro", "utf8");
	assert.match(deferredAstro, /window\.__voyageLoadedCovers/);
	assert.match(deferredAstro, /if\s*\(homeTransition\?\.finished\s*&&\s*isFoldDeferred\)/);
	assert.match(css, /@keyframes\s+voyageFoldReveal/);
});


test("card scroll target survives both click and teardown saves", async () => {
 const source = await readFile("src/scripts/voyage.ts", "utf8");
 assert.match(source, /let pendingEntryScroll: number \| null = null;/);
 assert.match(source, /const effectiveScroll = pendingEntryScroll \?\? \(currentScroll > 0 \? currentScroll : fallbackScroll\);/);
 assert.match(source, /pendingEntryScroll = targetScroll;/);
 assert.match(source, /signal\.addEventListener\("abort", \(\) => \{\s*saveState\(\);/);
});


test("navigation settlement has one reader and page-specific imports are generation guarded", async () => {
 const gate = await readFile("src/scripts/navigation/transition-settlement.ts", "utf8");
 const features = await readFile("src/scripts/content-features.ts", "utf8");
 assert.match(gate, /window\.__voyageTransitionFinished \?\? Promise\.resolve\(\)/);
 assert.match(features, /navigationGeneration\+\+/);
 assert.match(features, /if \(!isCurrent\(\)\) return;/);
 assert.doesNotMatch(features, /document\.addEventListener\('astro:before-swap'/);
});


test("Home headline is never targeted by generic heading motion", async () => {
 const source = await readFile("src/scripts/heading-motion.ts", "utf8");
 const css = await readFile("src/styles/voyage.css", "utf8");
 assert.doesNotMatch(source, /\.nv-titleblock h1:not\(\[data-motion-ready\]\)/, "only voyage.ts animates the Home title");
 assert.doesNotMatch(source, /const hero = el\.matches/, "retired cross-controller Home exception is removed");
 assert.doesNotMatch(css, /data-voyage-preparing\]:not\(\[data-voyage-opening\]\)[^}]*\.nv-titleblock h1/, "stale generic hero reveal styles are removed");
 assert.match(css, /data-voyage-opening[^}]*\.nv-titleblock h1 em/, "only the first-visit opening state prepares the hero");
});
