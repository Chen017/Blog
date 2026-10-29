import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";
import {
	complexPoint,
	pointerAngle,
	shortestAngle,
} from "../src/utils/complex-plane.ts";
import { compareHomeEntries } from "../src/utils/home-post.ts";

class ElementStub {
	constructor() {
		this.attributes = {};
		this.dataset = {};
		this.listeners = {};
		this.style = { setProperty() {} };
		this.clientWidth = 160;
		this.clientHeight = 119;
	}
	addEventListener(name, handler) {
		this.listeners[name] = handler;
	}
	setAttribute(name, value) {
		this.attributes[name] = value;
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
}

test("system reduced motion governs animation and history return ignores the retired pause preference", async () => {
	const raw = await readFile("src/scripts/voyage.ts", "utf8");
	const program = stripTypeScriptTypes(raw.slice(raw.indexOf("const root =")), {
		mode: "transform",
	});
	const elements = new Map();
	const root = new ElementStub();
	root.querySelector = (selector) => {
		if (!elements.has(selector)) elements.set(selector, new ElementStub());
		return elements.get(selector);
	};
	const lines = [new ElementStub(), new ElementStub()];
	const labels = [new ElementStub(), new ElementStub()];
	root.querySelector(".nv-plane").querySelectorAll = (selector) =>
		selector === "line" ? lines : labels;
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
		complexPoint,
		pointerAngle,
		shortestAngle,
		announcePageReady() {},
		CLOSE_PANELS: "close-panels",
		PAGE_BEFORE_REPLACE: "before-replace",
		document: {
			hidden: false,
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
		},
		cancelAnimationFrame() {},
		Event,
		CustomEvent,
	});
	vm.runInContext(program, context);
	const page = elements.get(".nv-page");
	const orbit = elements.get("[data-binary]");
	const replay = elements.get("[data-replay]");
	assert.equal(page.dataset.motion, "off");
	assert.equal(orbit.disabled, true);
	assert.equal(replay.disabled, true);
	elements
		.get("[data-plane-angle]")
		.listeners.input({ target: { value: "90" } });
	assert.equal(elements.get("[data-real]").textContent, "0.000");
	assert.equal(elements.get("[data-imag]").textContent, "1.000");
	assert.equal(elements.get(".nv-angle").textContent, "θ = 90°");
	media.matches = false;
	media.change();
	assert.equal(page.dataset.motion, "on");
	assert.equal(orbit.disabled, false);
	assert.equal(replay.disabled, false);
	windowListeners.pagehide({ persisted: true });
	assert.deepEqual(events, ["close-panels", "before-replace"]);
	windowListeners.pageshow({ persisted: true });
	assert.equal(page.dataset.motion, "on");
	media.matches = true;
	media.change();
	assert.equal(page.dataset.motion, "off");
	assert.equal(orbit.disabled, true);
	assert.equal(replay.disabled, true);
});
