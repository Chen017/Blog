import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { compareHomeEntries } from "../src/utils/home-post.ts";

class ElementStub {
	constructor() {
		this.attributes = {};
		this.dataset = {};
		this.listeners = {};
		this.style = { setProperty() {} };
		this.clientWidth = 160;
		this.clientHeight = 119;
		this.animations = [];
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
	root.querySelector = (selector) => {
		if (!elements.has(selector)) elements.set(selector, new ElementStub());
		return elements.get(selector);
	};
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
