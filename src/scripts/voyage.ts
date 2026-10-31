import "./heading-motion";
import { compareHomeEntries } from "../utils/home-post";
import {
	announcePageReady,
	CLOSE_PANELS,
	PAGE_BEFORE_REPLACE,
} from "../utils/page-lifecycle";

type HomeTransitionGate = NonNullable<Window["__voyageHomeTransition"]>;

let homeController: AbortController | undefined;
function initializeCurrentVoyage() {
	const root = document.getElementById("voyage-afterhours");
	if (!root?.querySelector(".nv-hero") || root.dataset.homeInitialized === "true") return;
	root.dataset.homeInitialized = "true";
	homeController?.abort();
	homeController = new AbortController();
	const transition = window.__voyageHomeTransition ?? null;
	initializeVoyage(root, homeController.signal, transition);
}
document.addEventListener("astro:before-swap", () => homeController?.abort());
document.addEventListener("astro:after-swap", initializeCurrentVoyage);
initializeCurrentVoyage();

function initializeVoyage(
	root: HTMLElement,
	signal: AbortSignal,
	transition: HomeTransitionGate | null,
) {
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
	let pointerOriginX: number | null = null;
	let pointerOriginY: number | null = null;
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

	function stopMotion(resetParallax = true) {
		for (const animation of animations) animation.cancel();
		animations.clear();
		orbitPlaying = false;
		cancelAnimationFrame(pointerFrame);
		pointerFrame = 0;
		pointerOriginX = null;
		pointerOriginY = null;
		stopGraph();
		if (resetParallax) {
			page.style.setProperty("--nv-px", "0");
			page.style.setProperty("--nv-py", "0");
		}
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

	let pendingEntryScroll: number | null = null;
	function saveState() {
		try {
			if (typeof location !== "undefined" && location.pathname !== "/") return;
			const currentScroll = typeof window.scrollY === "number" ? window.scrollY : 0;
			const fallbackScroll = Number.isFinite(history.state?.voyage?.scroll)
				? history.state.voyage.scroll
				: 0;
			// Keep the target card visible on return even when the old viewport was already scrolled.
			// Both the click handler and the abort handler persist state; neither may overwrite this target.
			const effectiveScroll = pendingEntryScroll ?? (currentScroll > 0 ? currentScroll : fallbackScroll);
			history.replaceState(
				{
					...history.state,
					...(effectiveScroll > 0 ? { scrollY: effectiveScroll } : {}),
					voyage: {
						...history.state?.voyage,
						category,
						order: get<HTMLSelectElement>(".nv-order select").value,
						scroll: effectiveScroll,
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
			const shouldHide = category !== "All" && entry.dataset.category !== category;
			if (entry.hidden !== shouldHide) entry.hidden = shouldHide;
			if (!entry.hidden) count++;
		}
		grid.append(...sorted);
		const after = new Map(
			sorted
				.filter((entry) => motion && !entry.hidden)
				.map((entry) => [entry, entry.getBoundingClientRect()]),
		);
		let index = 0;
		for (const entry of sorted) {
			const current = after.get(entry);
			if (current && motion) {
				const previous = before.get(entry);
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
			const orderValue = state.order === "oldest" ? "oldest" : "recent";
			get<HTMLSelectElement>(".nv-order select").value = orderValue;
			if (category !== "All" || orderValue === "oldest") {
				updateEntries(false, false);
			}
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

	function attachHomeInteractions() {
		for (const button of buttons) {
			button.addEventListener("click", () => {
				category = button.dataset.category || "All";
				updateEntries();
			});
		}
		get<HTMLSelectElement>(".nv-order select").addEventListener("change", () =>
			updateEntries(),
		);
		graph.addEventListener("pointerenter", (event) => {
			if (event.pointerType !== "touch") playGraph();
		});
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
			const rawX = clamp(
				((event.clientX - bounds.left) / bounds.width - 0.5) * 2.5,
			);
			const rawY = clamp(
				((event.clientY - bounds.top) / bounds.height - 0.5) * 2.5,
			);
			if (pointerOriginX === null || pointerOriginY === null) {
				pointerOriginX = rawX;
				pointerOriginY = rawY;
			} else {
				pointerOriginX *= 0.92;
				pointerOriginY *= 0.92;
			}
			pointerX = clamp(rawX - pointerOriginX);
			pointerY = clamp(rawY - pointerOriginY);
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
			pointerOriginX = null;
			pointerOriginY = null;
			page.style.setProperty("--nv-px", "0");
			page.style.setProperty("--nv-py", "0");
		});
		root.addEventListener("click", (event) => {
			const card = (event.target as Element).closest<HTMLElement>(".nv-card");
			if (card) {
				try {
					const titleEl = card.querySelector<HTMLElement>("[data-entry-title]") || card;
					const rect = titleEl.getBoundingClientRect?.();
					const vh = typeof window.innerHeight === "number" ? window.innerHeight : 0;
					let targetScroll = typeof window.scrollY === "number" ? window.scrollY : 0;
					if (rect && vh > 0 && (rect.bottom > vh - 24 || rect.top < 88)) {
						targetScroll = Math.max(0, Math.round(targetScroll + rect.top - vh * 0.6));
					}
					pendingEntryScroll = targetScroll;
					history.replaceState(
						{
							...history.state,
							...(targetScroll > 0 ? { scrollY: targetScroll } : {}),
							voyage: {
								...history.state?.voyage,
								source: card.id,
								scroll: targetScroll,
								keyboard:
									document.activeElement === card.querySelector("a") &&
									(!("detail" in event) || (event as MouseEvent).detail === 0),
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

		const order = get<HTMLElement>(".nv-order");
		const menu = order.querySelector<HTMLDetailsElement>("details");
		const select = get<HTMLSelectElement>(".nv-order select");
		if (menu) {
			if (order.dataset.enhanced !== "true") order.dataset.enhanced = "true";
			const summary = menu.querySelector<HTMLElement>("summary")!;
			const refresh = () => {
				const label = select.selectedOptions?.[0]?.textContent || "Newest first";
				if (summary.textContent !== label) summary.textContent = label;
				menu.querySelectorAll<HTMLButtonElement>("[data-order]").forEach((b) =>
					b.setAttribute("aria-pressed", String(b.dataset.order === select.value)),
				);
			};
			menu.querySelectorAll<HTMLButtonElement>("[data-order]").forEach((button) =>
				button.addEventListener("click", () => {
					select.value = button.dataset.order || "recent";
					select.dispatchEvent(new Event("change"));
					menu.open = false;
					refresh();
					summary.focus();
				}),
			);
			menu.addEventListener("keydown", (event) => {
				if (event.key === "Escape" && menu.open) {
					menu.open = false;
					summary.focus();
				}
			});
			document.addEventListener(
				"click",
				(event) => {
					if (!menu.contains(event.target as Node)) menu.open = false;
				},
				{ signal },
			);
			select.addEventListener("change", refresh);
			addEventListener("pageshow", refresh, { signal });
			refresh();
		}
	}

	reduced.addEventListener("change", syncMotion, { signal });
	document.addEventListener("visibilitychange", syncMotion, { signal });
	window.addEventListener(
		"pagehide",
		(event) => {
			saveState();
			stopMotion(false);
			document.dispatchEvent(new Event(CLOSE_PANELS));
			document.dispatchEvent(
				new CustomEvent(PAGE_BEFORE_REPLACE, {
					detail: { persisted: event.persisted },
				}),
			);
		},
		{ signal },
	);
	window.addEventListener(
		"pageshow",
		(event) => {
			if (event.persisted) {
				restoreState();
				syncMotion();
				announcePageReady();
			}
		},
		{ signal },
	);
	signal.addEventListener("abort", () => {
		saveState();
		stopMotion(false);
	});
	const browse = get<HTMLElement>(".nv-browse");
	if (browse.hidden) browse.hidden = false;

	syncMotion();
	const saved = typeof history !== "undefined" ? history.state?.voyage : null;
	const sessionSource = (() => {
		try {
			const parsed = JSON.parse(sessionStorage.getItem("voyage:source") || "null");
			return parsed && parsed.from === "/" ? parsed : null;
		} catch {
			return null;
		}
	})();
	if (saved) {
		restoreState();
	}
	const sourceId = saved?.source || sessionSource?.card || null;
	const source = sourceId ? document.getElementById(sourceId) : null;
	const savedScroll = Number.isFinite(saved?.scroll) && saved.scroll > 0
		? saved.scroll
		: Number.isFinite(sessionSource?.scrollY) && sessionSource.scrollY > 0
			? sessionSource.scrollY
			: Number.isFinite(saved?.scroll)
				? saved.scroll
				: null;
	if (savedScroll !== null && (savedScroll > 0 || !source) && window.scrollY !== savedScroll) {
		window.scrollTo({
			top: savedScroll,
			behavior: "instant",
		});
	}
	if (source && !source.hidden) {
		source.dataset.returned = "true";
		const titleEl = source.querySelector<HTMLElement>("[data-entry-title]") || source;
		const rect = titleEl.getBoundingClientRect?.();
		const vh = typeof window.innerHeight === "number" ? window.innerHeight : 0;
		if (rect && vh > 0 && (rect.bottom > vh - 24 || rect.top < 88)) {
			const currentY = typeof window.scrollY === "number" ? window.scrollY : 0;
			const targetY = Math.max(0, Math.round(currentY + rect.top - vh * 0.6));
			window.scrollTo({
				top: targetY,
				behavior: "instant",
			});
		}
		if (saved?.keyboard)
			source
				.querySelector<HTMLAnchorElement>("a")
				?.focus({ preventScroll: true });
	}

	function finishHomeInitialization() {
		if (signal.aborted) return;
		// NavigationMotion.astro exclusively owns fold flags and their timed reveal.
		// Home only attaches its deferred interactions once the transition settles.
		attachHomeInteractions();
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

	if (transition) {
		void transition.finished.then(() => {
			if (signal.aborted) return;
			if (!root.isConnected) return;
			if (typeof location !== "undefined" && location.pathname !== "/") return;
			if (window.__voyageHomeTransition !== transition) return;
			finishHomeInitialization();
		});
	} else {
		finishHomeInitialization();
	}
}
