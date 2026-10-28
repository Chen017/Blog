import { compareHomeEntries } from "../utils/home-post";
import {
	announcePageReady,
	CLOSE_PANELS,
	PAGE_BEFORE_REPLACE,
} from "../utils/page-lifecycle";

const root = document.getElementById("voyage-afterhours");
if (root) initializeVoyage(root);

function initializeVoyage(root: HTMLElement) {
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
	const motionButton = get<HTMLButtonElement>("[data-motion-toggle]");
	const binaryButton = get<HTMLButtonElement>("[data-binary]");
	const replayButton = get<HTMLButtonElement>("[data-replay]");
	const angleButton = get<HTMLButtonElement>("[data-angle]");
	const planeButton = get<HTMLButtonElement>("[data-plane-toggle]");
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	let category = "All";
	let motionEnabled = true;
	let angle = 45;
	let showCode = false;
	let orbitPlaying = false;
	let pointerFrame = 0;
	let pointerX = 0;
	let pointerY = 0;
	const animations = new Set<Animation>();
	const motionKey = "etalib:motion";
	try {
		motionEnabled = localStorage.getItem(motionKey) !== "off";
	} catch {
		/* Storage is optional. */
	}
	const canMove = () => motionEnabled && !reduced.matches && !document.hidden;

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
		page.style.setProperty("--nv-px", "0");
		page.style.setProperty("--nv-py", "0");
	}

	function syncMotion() {
		const enabled = motionEnabled && !reduced.matches;
		page.dataset.motion = enabled ? "on" : "off";
		motionButton.disabled = reduced.matches;
		motionButton.setAttribute(
			"aria-label",
			reduced.matches
				? "System reduced motion is enabled"
				: enabled
					? "Pause motion"
					: "Enable motion",
		);
		motionButton.setAttribute("aria-pressed", String(!enabled));
		get<HTMLElement>("[data-motion-pause]").hidden = !enabled;
		get<HTMLElement>("[data-motion-play]").hidden = enabled;
		binaryButton.disabled = !enabled;
		replayButton.disabled = !enabled;
		if (!enabled || document.hidden) stopMotion();
	}

	function updateEntries() {
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
			if (!entry.hidden) {
				animate(
					entry,
					[
						{ opacity: 0.45, translate: "0 7px" },
						{ opacity: 1, translate: "0 0" },
					],
					{
						duration: 340,
						delay: Math.min(count, 5) * 25,
						easing: "cubic-bezier(.2,.8,.2,1)",
					},
				);
				count++;
			}
		}
		for (const button of buttons) {
			button.setAttribute(
				"aria-pressed",
				String(button.dataset.category === category),
			);
		}
		get(".nv-count").textContent =
			`${count} ${count === 1 ? "entry" : "entries"}`;
		get(".nv-end").textContent = `${count} of ${count} entries`;
	}

	function drawPlane() {
		if (showCode) return;
		const svg = get<SVGSVGElement>(".nv-plane");
		const canvas = get<HTMLElement>(".nv-plane-canvas");
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		const cx = w * 0.44;
		const cy = h * 0.51;
		const radius = Math.min(w * 0.27, h * 0.33);
		const theta = (angle * Math.PI) / 180;
		const x = cx + radius * Math.cos(theta);
		const y = cy - radius * Math.sin(theta);
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
		const labels = svg.querySelectorAll("text");
		set(labels[0], { x: cx + radius + 11, y: cy + 15 });
		set(labels[1], { x: cx + 7, y: cy - radius - 3 });
		svg.setAttribute(
			"aria-label",
			`Complex unit circle with a point at ${angle} degrees`,
		);
	}

	function orbit() {
		if (orbitPlaying || !canMove()) return;
		orbitPlaying = true;
		const frames = Array.from({ length: 49 }, (_, i) => {
			const theta = (i / 48) * Math.PI * 2;
			return {
				transform: `translate(${22 - Math.cos(theta) * 22}px,${-Math.sin(theta) * 9}px)`,
			};
		});
		const first = animate(get(".nv-dot-a"), frames, {
			duration: 2400,
			easing: "cubic-bezier(.4,0,.2,1)",
		});
		const reverse = Array.from({ length: 49 }, (_, i) => {
			const theta = (i / 48) * Math.PI * 2;
			return {
				transform: `translate(${-22 + Math.cos(theta) * 22}px,${Math.sin(theta) * 9}px)`,
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

	function replay() {
		stopMotion();
		window.scrollTo({ top: 0, behavior: "instant" });
		const ease = "cubic-bezier(.16,.8,.2,1)";
		animate(
			get(".nv-title-first"),
			[
				{ opacity: 0.2, filter: "blur(4px)", translate: "0 12px" },
				{ opacity: 1, filter: "blur(0)", translate: "0 0" },
			],
			{ duration: 1400, easing: ease },
		);
		animate(
			get("h1 em"),
			[
				{ opacity: 0.2, filter: "blur(4px)", translate: "0 18px" },
				{ opacity: 1, filter: "blur(0)", translate: "0 0" },
			],
			{ duration: 1700, delay: 100, easing: ease },
		);
		animate(
			get(".nv-horizon"),
			[
				{ opacity: 0.4, translate: "0 15px" },
				{ opacity: 1, translate: "0 0" },
			],
			{ duration: 1900, easing: ease },
		);
	}

	for (const button of buttons) {
		button.addEventListener("click", () => {
			category = button.dataset.category || "All";
			updateEntries();
		});
	}
	get<HTMLSelectElement>(".nv-order select").addEventListener(
		"change",
		updateEntries,
	);
	motionButton.addEventListener("click", () => {
		motionEnabled = !motionEnabled;
		try {
			localStorage.setItem(motionKey, motionEnabled ? "on" : "off");
		} catch {
			/* Storage is optional. */
		}
		syncMotion();
	});
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
		angle = (angle + 45) % 360;
		get(".nv-angle").textContent = `θ = ${angle}°`;
		angleButton.setAttribute(
			"aria-label",
			`Rotate the point; current angle ${angle} degrees`,
		);
		drawPlane();
	});
	binaryButton.addEventListener("click", orbit);
	replayButton.addEventListener("click", replay);
	hero.addEventListener("pointermove", (event) => {
		if (!canMove() || event.pointerType === "touch") return;
		const bounds = hero.getBoundingClientRect();
		pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
		pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
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
	reduced.addEventListener("change", syncMotion);
	document.addEventListener("visibilitychange", syncMotion);
	window.addEventListener("pagehide", (event) => {
		stopMotion();
		document.dispatchEvent(new Event(CLOSE_PANELS));
		document.dispatchEvent(
			new CustomEvent(PAGE_BEFORE_REPLACE, {
				detail: { persisted: event.persisted },
			}),
		);
	});
	window.addEventListener("pageshow", (event) => {
		if (event.persisted) {
			syncMotion();
			announcePageReady();
		}
	});
	const observer = new ResizeObserver(drawPlane);
	observer.observe(get(".nv-plane-canvas"));
	angleButton.disabled = false;
	planeButton.disabled = false;
	get<HTMLElement>(".nv-browse").hidden = false;
	syncMotion();
	drawPlane();
	announcePageReady();
}
