import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = (
	await readFile("src/components/site/NavigationMotion.astro", "utf8")
).match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

function setup({
	current = "/",
	reduced = false,
	blockedStorage = false,
} = {}) {
	const handlers = {};
	const storage = new Map();
	const media = {
		matches: reduced,
		addEventListener: (_, handler) => {
			handlers.preference = handler;
		},
	};
	const title = {
		getBoundingClientRect: () => ({ top: 100, bottom: 150 }),
		style: {
			removeProperty() {
				delete this.viewTransitionName;
			},
		},
	};
	const card = {
		id: "selected-project",
		hidden: false,
		dataset: { entryRoute: "/posts/project/" },
		querySelector: () => title,
	};
	const html = { dataset: {} };
	const window = {
		addEventListener: (name, handler) => {
			handlers[name] = handler;
		},
	};
	const document = {
		documentElement: html,
		addEventListener: (name, handler) => {
			handlers[name] = handler;
		},
		dispatchEvent() {},
		getElementById: (id) => (id === card.id ? card : null),
		querySelectorAll: () => [card],
		querySelector: () => title,
	};
	vm.runInNewContext(source, {
		window,
		document,
		location: {
			href: `https://example.com${current}`,
			pathname: current,
			origin: "https://example.com",
		},
		matchMedia: () => media,
		sessionStorage: {
			getItem: (key) => {
				if (blockedStorage) throw Error("blocked");
				return storage.get(key);
			},
			setItem: (key, value) => {
				if (blockedStorage) throw Error("blocked");
				storage.set(key, value);
			},
		},
		URL,
		Event,
		innerHeight: 900,
	});
	return { handlers, storage, media, title, card, html, window };
}

test("only the selected article title is named and names are cleared after navigation", async () => {
	const app = setup();
	let finish;
	const transition = {
		ready: Promise.reject(new Error("Outgoing document was hidden")),
		finished: new Promise((resolve) => {
			finish = resolve;
		}),
	};
	app.handlers.pageswap({
		viewTransition: transition,
		activation: { entry: { url: "https://example.com/posts/project/" } },
	});
	assert.equal(app.title.style.viewTransitionName, "voyage-entry-title");
	finish();
	await transition.finished;
	assert.equal(app.title.style.viewTransitionName, undefined);
});

test("reduced motion skips active transitions immediately, even if changed midway", () => {
	const app = setup();
	let skipped = 0;
	const transition = {
		ready: Promise.resolve(),
		skipTransition: () => {
			skipped++;
		},
		finished: new Promise(() => {}),
	};
	app.handlers.pageswap({
		viewTransition: transition,
		activation: { entry: { url: "https://example.com/posts/project/" } },
	});
	app.media.matches = true;
	app.handlers.preference();
	assert.equal(skipped, 1);
	const reduced = setup({ reduced: true });
	reduced.handlers.pagereveal({ viewTransition: transition });
	assert.equal(skipped, 2);
	assert.equal(reduced.title.style.viewTransitionName, undefined);
});

test("different articles never share a title identity and blocked storage preserves native links", () => {
	const app = setup({ current: "/posts/one/", blockedStorage: true });
	app.handlers.pageswap({
		viewTransition: {
			ready: Promise.resolve(),
			finished: new Promise(() => {}),
		},
		activation: { entry: { url: "https://example.com/posts/two/" } },
	});
	assert.equal(app.title.style.viewTransitionName, undefined);
	let prevented = false;
	const link = {
		href: "https://example.com/posts/project/",
		dataset: {},
		closest: () => app.card,
		hasAttribute: () => false,
	};
	app.handlers.click({
		button: 0,
		target: { closest: () => link },
		preventDefault: () => {
			prevented = true;
		},
	});
	assert.equal(prevented, false);
});
