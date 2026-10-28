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

test("system reduced motion overrides saved animation preferences and survives returning to the page", async () => {
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
	const storage = new Map([["etalib:motion", "on"]]);
	const events = [];
	const context = vm.createContext({
		compareHomeEntries,
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
	const toggle = elements.get("[data-motion-toggle]");
	const orbit = elements.get("[data-binary]");
	const replay = elements.get("[data-replay]");
	assert.equal(page.dataset.motion, "off");
	assert.equal(toggle.disabled, true);
	assert.equal(orbit.disabled, true);
	assert.equal(replay.disabled, true);
	media.matches = false;
	media.change();
	assert.equal(page.dataset.motion, "on");
	assert.equal(toggle.disabled, false);
	toggle.listeners.click();
	assert.equal(storage.get("etalib:motion"), "off");
	assert.equal(page.dataset.motion, "off");
	windowListeners.pagehide({ persisted: true });
	assert.deepEqual(events, ["close-panels", "before-replace"]);
	windowListeners.pageshow({ persisted: true });
	assert.equal(page.dataset.motion, "off");
	assert.equal(orbit.disabled, true);
	assert.equal(replay.disabled, true);
});
