import "./heading-motion";
import { compareHomeEntries } from "../utils/home-post";
import {
	announcePageReady,
	CLOSE_PANELS,
	PAGE_BEFORE_REPLACE,
} from "../utils/page-lifecycle";

let homeController: AbortController | undefined;
function initializeCurrentVoyage() {
	const root = document.getElementById("voyage-afterhours");
	if (!root?.querySelector(".nv-hero") || root.dataset.homeInitialized === "true") return;
	root.dataset.homeInitialized = "true";
	homeController?.abort();
	homeController = new AbortController();
	initializeVoyage(root, homeController.signal);
}
document.addEventListener("astro:before-swap", () => homeController?.abort());
document.addEventListener("astro:after-swap", initializeCurrentVoyage);
initializeCurrentVoyage();

function initializeVoyage(root: HTMLElement, signal: AbortSignal) {
	const get = <T extends Element = HTMLElement>(selector: string): T => {
		const element = root.querySelector<T>(selector);
		if (!element) throw new Error(`Missing homepage element: ${selector}`);
		return element;
	};
	const page = get<HTMLElement>(".nv-page");
	const hero = get<HTMLElement>(".nv-hero");
	const grid = get<HTMLElement>(".nv-grid");
	const entries = Array.from(grid.querySelectorAll<HTMLElement>(".nv-entry"));
	const buttons = Array.from(
		root.querySelectorAll<HTMLButtonElement>("button[data-category]"),
	);
	const binaryButton = get<HTMLButtonElement>("[data-binary]");
	const graph = get<HTMLButtonElement>(".nv-graph-trigger");
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	let category = "All";
	let graphAnimations: Animation[] = [];
	let graphGeneration = 0;
	let orbitPlaying = false;
	let pointerFrame = 0;
	let pointerX = 0;
	let pointerY = 0;
	const animations = new Set<Animation>();
	const canMove = () => !reduced.matches && !document.hidden;

	function animate(
		element: Element,
		keyframes: Keyframe[],
		options: KeyframeAnimationOptions,
	) {
		if (!canMove()) return;
		const animation = element.animate(keyframes, options);
		animations.add(animation);
		void animation.finished
			.catch(() => {})
			.finally(() => animations.delete(animation));
		return animation;
	}

	function stopMotion() {
		for (const animation of animations) animation.cancel();
		animations.clear();
		orbitPlaying = false;
		cancelAnimationFrame(pointerFrame);
		pointerFrame = 0;
		stopGraph();
		page.style.setProperty("--nv-px", "0");
		page.style.setProperty("--nv-py", "0");
	}

	function syncMotion() {
		const enabled = !reduced.matches;
		page.dataset.motion = enabled ? "on" : "off";
		document.documentElement?.setAttribute(
			"data-motion",
			enabled ? "on" : "off",
		);
		binaryButton.disabled = !enabled;
		if (!enabled || document.hidden) stopMotion();
	}

	function saveState() {
		try {
			history.replaceState(
				{
					...history.state,
					voyage: {
						...history.state?.voyage,
						category,
						order: get<HTMLSelectElement>(".nv-order select").value,
						scroll: window.scrollY,
					},
				},
				"",
			);
		} catch {
			/* Storage/history restrictions must not affect browsing. */
		}
	}

	function updateEntries(motion = true, persist = true) {
        motion = motion && canMove();
		const before = new Map(
			entries
				.filter((entry) => motion && !entry.hidden)
				.map((entry) => [entry, entry.getBoundingClientRect()]),
		);
		for (const entry of entries)
			entry.getAnimations().forEach((animation) => {
				animation.cancel();
			});
		const oldest =
			get<HTMLSelectElement>(".nv-order select").value === "oldest";
		const sorted = [...entries].sort((a, b) =>
			compareHomeEntries(
				{ date: a.dataset.date || "", pinned: a.dataset.pinned === "true" },
				{ date: b.dataset.date || "", pinned: b.dataset.pinned === "true" },
				oldest,
			),
		);
		let count = 0;
		for (const entry of sorted) {
			entry.hidden = category !== "All" && entry.dataset.category !== category;
			grid.append(entry);
			if (!entry.hidden) count++;
		}
		let index = 0;
		for (const entry of sorted) {
			if (!entry.hidden && motion) {
				const previous = before.get(entry);
				const current = entry.getBoundingClientRect();
				animate(
					entry,
					[
						{
							opacity: previous ? 1 : 0,
							translate: previous
								? `${previous.left - current.left}px ${previous.top - current.top}px`
								: "0 12px",
						},
						{ opacity: 1, translate: "0 0" },
					],
					{
						duration: 320,
						delay: previous ? 0 : Math.min(index, 4) * 20,
						easing: "cubic-bezier(.2,.8,.2,1)",
					},
				);
				index++;
			}
		}
		for (const button of buttons) {
			button.setAttribute(
				"aria-pressed",
				String(button.dataset.category === category),
			);
		}
		get(".nv-end").textContent = `${count} of ${count} entries`;
		if (persist) saveState();
	}

	function restoreState() {
		try {
			const state = history.state?.voyage;
			if (!state) return;
			category = buttons.some(
				(button) => button.dataset.category === state.category,
			)
				? state.category
				: "All";
			get<HTMLSelectElement>(".nv-order select").value =
				state.order === "oldest" ? "oldest" : "recent";
			updateEntries(false, false);
		} catch {
			/* Native links and default ordering remain available. */
		}
	}

	function stopGraph() {
		graphGeneration++;
		for (const animation of graphAnimations) animation.cancel();
		graphAnimations = [];
	}

	function playGraph() {
		if (!canMove() || graphAnimations.length) return;
		const generation = ++graphGeneration;
		const strokes = graph.querySelectorAll<SVGLineElement>(".nv-graph-attempt");
		graphAnimations = Array.from(strokes, (stroke, index) => animate(stroke, [
			{ strokeDashoffset: "1", opacity: 0, offset: 0 },
			{ strokeDashoffset: ".14", opacity: 0.9, offset: .48 },
			{ strokeDashoffset: ".14", opacity: 0.9, offset: .62 },
			{ strokeDashoffset: "1", opacity: 0, offset: 1 },
		], { duration: 1250, delay: index * 1400, fill: "both", easing: "cubic-bezier(.4,0,.2,1)" })).filter((item): item is Animation => Boolean(item));
		void Promise.allSettled(graphAnimations.map(animation => animation.finished)).then(() => {
			if (generation === graphGeneration) {
				for (const animation of graphAnimations) animation.cancel();
				graphAnimations = [];
			}
		});
	}

	function orbit() {
		if (orbitPlaying || !canMove()) return;
		orbitPlaying = true;
		const frames = Array.from({ length: 49 }, (_, i) => {
			const theta = (i / 48) * Math.PI * 2;
			return {
				transform: `translate(${22 - Math.cos(theta) * 22}px,${-Math.sin(theta) * 9}px) scale(${1 + Math.sin(theta) * 0.3})`,
				opacity: Math.min(1, 1 + Math.sin(theta) * 0.35),
			};
		});
		const first = animate(get(".nv-dot-a"), frames, {
			duration: 2400,
			easing: "cubic-bezier(.4,0,.2,1)",
		});
		const reverse = Array.from({ length: 49 }, (_, i) => {
			const theta = (i / 48) * Math.PI * 2;
			return {
				transform: `translate(${-22 + Math.cos(theta) * 22}px,${Math.sin(theta) * 9}px) scale(${1 - Math.sin(theta) * 0.3})`,
				opacity: Math.min(1, 1 - Math.sin(theta) * 0.35),
			};
		});
		animate(get(".nv-dot-b"), reverse, {
			duration: 2400,
			easing: "cubic-bezier(.4,0,.2,1)",
		});
		void first?.finished
			.catch(() => {})
			.finally(() => {
				orbitPlaying = false;
			});
	}

	function playOpening() {
		stopMotion();
		const ease = "cubic-bezier(.16,.8,.2,1)";
		animate(
			get(".nv-title-first"),
			[
				{ opacity: 0.45, filter: "blur(3px)", translate: "0 12px" },
				{ opacity: 1, filter: "blur(0)", translate: "0 0" },
			],
			{ duration: 1800, delay: 450, fill: "both", easing: ease },
		);
		animate(
			get("h1 em"),
			[
				{ opacity: 0.45, filter: "blur(3px)", translate: "0 18px" },
				{ opacity: 1, filter: "blur(0)", translate: "0 0" },
			],
			{ duration: 2100, delay: 550, fill: "both", easing: ease },
		);
		animate(
			get(".nv-horizon"),
			[
				{ opacity: 0.4, translate: "0 15px" },
				{ opacity: 1, translate: "0 0" },
			],
			{ duration: 2300, delay: 450, fill: "both", easing: ease },
		);
	}

	for (const button of buttons) {
		button.addEventListener("click", () => {
			category = button.dataset.category || "All";
			updateEntries();
		});
	}
	get<HTMLSelectElement>(".nv-order select").addEventListener("change", () =>
		updateEntries(),
	);
	graph.addEventListener("pointerenter", event => { if (event.pointerType !== "touch") playGraph(); });
	graph.addEventListener("pointerleave", stopGraph);
	graph.addEventListener("focus", playGraph);
	graph.addEventListener("blur", stopGraph);
	graph.addEventListener("click", playGraph);
	binaryButton.addEventListener("pointerenter", orbit);
	binaryButton.addEventListener("focus", orbit);
	binaryButton.addEventListener("click", orbit);
	hero.addEventListener("pointermove", (event) => {
		if (!canMove() || event.pointerType === "touch") return;
		const bounds = hero.getBoundingClientRect();
		const clamp = (value: number) => Math.max(-1, Math.min(1, value));
		pointerX = clamp(
			((event.clientX - bounds.left) / bounds.width - 0.5) * 2.5,
		);
		pointerY = clamp(
			((event.clientY - bounds.top) / bounds.height - 0.5) * 2.5,
		);
		if (pointerFrame) return;
		pointerFrame = requestAnimationFrame(() => {
			pointerFrame = 0;
			page.style.setProperty("--nv-px", String(pointerX));
			page.style.setProperty("--nv-py", String(pointerY));
		});
	});
	hero.addEventListener("pointerleave", () => {
		cancelAnimationFrame(pointerFrame);
		pointerFrame = 0;
		page.style.setProperty("--nv-px", "0");
		page.style.setProperty("--nv-py", "0");
	});
	root.addEventListener("click", (event) => {
		const card = (event.target as Element).closest<HTMLElement>(".nv-card");
		if (card) {
			try {
				history.replaceState(
					{
						...history.state,
						voyage: {
							...history.state?.voyage,
							source: card.id,
							keyboard: document.activeElement === card.querySelector("a"),
						},
					},
					"",
				);
			} catch {}
			saveState();
		}
		const anchor = (event.target as Element).closest<HTMLAnchorElement>(
			'a[href^="#"]',
		);
		if (
			!anchor ||
			event.defaultPrevented ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		const target = document.getElementById(anchor.hash.slice(1));
		if (!target) return;
		event.preventDefault();
		target.scrollIntoView({
			behavior: canMove() ? "smooth" : "instant",
			block: "start",
		});
		if (target.id === "nv-writing") {
			target.setAttribute("tabindex", "-1");
			target.focus({ preventScroll: true });
		}
	});
	reduced.addEventListener("change", syncMotion, {signal});
	document.addEventListener("visibilitychange", syncMotion, {signal});
	window.addEventListener("pagehide", (event) => {
		saveState();
		stopMotion();
		document.dispatchEvent(new Event(CLOSE_PANELS));
		document.dispatchEvent(
			new CustomEvent(PAGE_BEFORE_REPLACE, {
				detail: { persisted: event.persisted },
			}),
		);
	}, {signal});
	window.addEventListener("pageshow", (event) => {
		if (event.persisted) {
			restoreState();
			syncMotion();
			announcePageReady();
		}
	}, {signal});
	signal.addEventListener("abort", () => { saveState(); stopMotion(); });
	get<HTMLElement>(".nv-browse").hidden = false;
	const order = get<HTMLElement>(".nv-order");
	const menu = order.querySelector<HTMLDetailsElement>("details");
	const select = get<HTMLSelectElement>(".nv-order select");
	if (menu) {
		order.dataset.enhanced = "true";
		const summary = menu.querySelector<HTMLElement>("summary")!;
		const refresh = () => { summary.textContent = select.selectedOptions[0]?.textContent || "Newest first"; menu.querySelectorAll<HTMLButtonElement>("[data-order]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.order === select.value))); };
		menu.querySelectorAll<HTMLButtonElement>("[data-order]").forEach(button => button.addEventListener("click", () => { select.value = button.dataset.order || "recent"; select.dispatchEvent(new Event("change")); menu.open = false; refresh(); summary.focus(); }));
		menu.addEventListener("keydown", event => { if (event.key === "Escape" && menu.open) { menu.open = false; summary.focus(); } });
		document.addEventListener("click", event => { if (!menu.contains(event.target as Node)) menu.open = false; }, {signal});
		select.addEventListener("change", refresh);
		addEventListener("pageshow", refresh, {signal});
		refresh();
	}

	syncMotion();
	const saved = typeof history !== "undefined" ? history.state?.voyage : null;
	restoreState();
	if (saved) {
			window.scrollTo({
				top: Number.isFinite(saved.scroll) ? saved.scroll : 0,
				behavior: "instant",
			});
			const source = document.getElementById(saved.source);
			if (source && !source.hidden) {
				source.dataset.returned = "true";
				if (saved.keyboard)
					source
						.querySelector<HTMLAnchorElement>("a")
						?.focus({ preventScroll: true });
			}
	}
	try {
		if (
			!sessionStorage.getItem("voyage:opened") &&
			!location.hash &&
			!saved &&
			canMove()
		) {
			sessionStorage.setItem("voyage:opened", "true");
			playOpening();
		}
	} catch {
		/* A blocked storage area simply skips the opening. */
	}
	document.documentElement.removeAttribute("data-voyage-opening");
	announcePageReady();
}
