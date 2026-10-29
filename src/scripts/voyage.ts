import "./heading-motion";
import {
	complexPoint,
	pointerAngle,
	shortestAngle,
} from "../utils/complex-plane";
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
	const angleButton = get<HTMLButtonElement>("[data-angle]");
	const planeButton = get<HTMLButtonElement>("[data-plane-toggle]");
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	let category = "All";
	let angle = 45;
	let displayAngle = 45;
	let planeFrame = 0;
	let autoPlaneFrame = 0;
	let draggedPointer: number | null = null;
	let showCode = false;
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
		cancelAnimationFrame(planeFrame);
		planeFrame = 0;
		cancelAnimationFrame(autoPlaneFrame);
		autoPlaneFrame = 0;
		displayAngle = angle;
		drawPlane();
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
		const before = new Map(
			entries
				.filter((entry) => !entry.hidden)
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

	function drawPlane() {
		const svg = get<SVGSVGElement>(".nv-plane");
		const canvas = get<HTMLElement>(".nv-plane-canvas");
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		const cx = w * 0.47;
		const cy = h * 0.5;
		const radius = Math.min(w * 0.28, h * 0.38);
		const { x, y, real, imaginary } = complexPoint(
			displayAngle,
			cx,
			cy,
			radius,
		);
		svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
		const lines = svg.querySelectorAll("line");
		const set = (element: Element, attributes: Record<string, number>) => {
			for (const [name, value] of Object.entries(attributes))
				element.setAttribute(name, String(value));
		};
		set(lines[0], {
			x1: cx - radius - 12,
			y1: cy,
			x2: cx + radius + 18,
			y2: cy,
		});
		set(lines[1], {
			x1: cx,
			y1: cy - radius - 10,
			x2: cx,
			y2: cy + radius + 10,
		});
		set(get(".nv-plane circle"), { cx, cy, r: radius });
		set(get("[data-radius]"), { x1: cx, y1: cy, x2: x, y2: y });
		set(get("[data-point]"), { cx: x, cy: y });
		set(get("[data-real-projection]"), { x1: x, y1: y, x2: x, y2: cy });
		set(get("[data-imag-projection]"), { x1: cx, y1: y, x2: x, y2: y });
		const normalized = ((displayAngle % 360) + 360) % 360;
		const phase = complexPoint(normalized, cx, cy, 20);
		get("[data-phase]").setAttribute(
			"d",
			normalized < 0.1
				? ""
				: `M ${cx + 20} ${cy} A 20 20 0 ${normalized > 180 ? 1 : 0} 0 ${phase.x} ${phase.y}`,
		);
		const formatted = (value: number) =>
			Math.abs(value) < 0.0005 ? "0.000" : value.toFixed(3);
		get("[data-real]").textContent = get("[data-code-real]").textContent =
			formatted(real);
		get("[data-imag]").textContent = get("[data-code-imag]").textContent =
			formatted(imaginary);
		const degrees = Math.round(displayAngle === 360 ? 360 : normalized);
		get("[data-code-angle]").textContent = String(degrees);
		get(".nv-angle").textContent = `θ = ${degrees}°`;
		get<HTMLInputElement>("[data-plane-angle]").value = String(degrees);
		get<HTMLInputElement>("[data-plane-angle]").setAttribute(
			"aria-valuetext",
			`${degrees} degrees; real ${formatted(real)}, imaginary ${formatted(imaginary)}`,
		);
		const labels = svg.querySelectorAll("text");
		set(labels[0], { x: cx + radius + 11, y: cy + 15 });
		set(labels[1], { x: cx + 7, y: cy - radius - 3 });
		svg.setAttribute(
			"aria-label",
			`Complex unit circle with a point at ${degrees} degrees`,
		);
	}

	function setAngle(next: number, smooth = false) {
		cancelAnimationFrame(planeFrame);
		angle = next;
		if (!smooth || !canMove()) {
			displayAngle = angle;
			drawPlane();
			return;
		}
		const from = displayAngle;
		const distance = shortestAngle(from, angle);
		const started = performance.now();
		const frame = (now: number) => {
			const progress = Math.min(1, (now - started) / 360);
			displayAngle = from + distance * (1 - (1 - progress) ** 3);
			drawPlane();
			if (progress < 1 && canMove()) planeFrame = requestAnimationFrame(frame);
			else {
				planeFrame = 0;
				displayAngle = angle;
				drawPlane();
			}
		};
		planeFrame = requestAnimationFrame(frame);
	}

	function stopPlane() { cancelAnimationFrame(autoPlaneFrame); autoPlaneFrame = 0; }
	function startPlane(oneOrbit = false) {
		if (autoPlaneFrame || !canMove()) return;
		cancelAnimationFrame(planeFrame);
		const startAngle = displayAngle, started = performance.now();
		const frame = (now: number) => {
			if (!canMove()) { stopPlane(); return; }
			const elapsed = now - started;
			angle = displayAngle = (startAngle + elapsed * 360 / 8000) % 360;
			drawPlane();
			if (oneOrbit && elapsed >= 8000) { angle = displayAngle = startAngle; drawPlane(); stopPlane(); return; }
			autoPlaneFrame = requestAnimationFrame(frame);
		};
		autoPlaneFrame = requestAnimationFrame(frame);
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
	planeButton.addEventListener("click", () => {
		showCode = !showCode;
		get(".nv-plane").toggleAttribute("hidden", showCode);
		get<HTMLElement>(".nv-plane-code").hidden = !showCode;
		planeButton.setAttribute("aria-pressed", String(showCode));
		planeButton.setAttribute(
			"aria-label",
			showCode ? "Show the complex plane" : "Show formula as code",
		);
		drawPlane();
	});
	angleButton.addEventListener("click", () => {
		if (window.matchMedia("(hover: none)").matches && canMove()) startPlane(true);
		else { stopPlane(); setAngle((angle + 45) % 360, true); }
		angleButton.setAttribute(
			"aria-label",
			`Rotate the point; current angle ${angle} degrees`,
		);
	});
	get<HTMLInputElement>("[data-plane-angle]").addEventListener(
		"input",
		(event) => {
			stopPlane();
			setAngle(Number((event.target as HTMLInputElement).value));
		},
	);
	const planeCanvas = get<HTMLElement>(".nv-plane-canvas");
	const dragAngle = (event: PointerEvent) => {
		const bounds = planeCanvas.getBoundingClientRect();
		setAngle(
			pointerAngle(
				event.clientX - bounds.left,
				event.clientY - bounds.top,
				bounds.width * 0.47,
				bounds.height * 0.5,
			),
		);
	};
	planeCanvas.addEventListener("pointerdown", (event) => {
		if (showCode || !event.isPrimary || event.button !== 0) return;
		stopPlane();
		draggedPointer = event.pointerId;
		planeCanvas.setPointerCapture(event.pointerId);
		dragAngle(event);
	});
	planeCanvas.addEventListener("pointermove", (event) => {
		if (event.pointerId === draggedPointer) dragAngle(event);
	});
	const endDrag = () => {
		draggedPointer = null;
	};
	planeCanvas.addEventListener("pointerup", endDrag);
	planeCanvas.addEventListener("pointercancel", endDrag);
	planeCanvas.addEventListener("lostpointercapture", endDrag);
	const complex = get<HTMLElement>(".nv-complex");
	complex.addEventListener("pointerenter", event => { if (event.pointerType !== "touch") startPlane(); });
	complex.addEventListener("pointerleave", stopPlane);
	complex.addEventListener("focusin", () => { if (window.matchMedia("(hover: hover)").matches) startPlane(); });
	complex.addEventListener("focusout", event => { if (!complex.contains(event.relatedTarget as Node | null)) stopPlane(); });
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
	const observer = new ResizeObserver(drawPlane);
	observer.observe(get(".nv-plane-canvas"));
	signal.addEventListener("abort", () => { saveState(); stopMotion(); observer.disconnect(); });
	angleButton.disabled = false;
	planeButton.disabled = false;
	get<HTMLInputElement>("[data-plane-angle]").disabled = false;
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
	drawPlane();
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
