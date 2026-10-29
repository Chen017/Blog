import { cleanupFancybox, initFancybox } from "../utils/fancybox";
import { initMarkdownActions } from "../utils/markdown";
import {
	announcePageReady,
	CLOSE_PANELS,
	PAGE_BEFORE_REPLACE,
} from "../utils/page-lifecycle";
import { initScrollControls } from "../utils/scroll-controls";

const page = document.querySelector<HTMLElement>(".vs-interior");
if (page) {
	const reduced = matchMedia("(prefers-reduced-motion: reduce)");
	const canMove = () => !reduced.matches;
	const syncMotion = () => {
		const active = canMove();
		page.dataset.motion = active ? "on" : "off";
		document.documentElement.dataset.motion = active ? "on" : "off";
		if (!active)
			page.getAnimations({ subtree: true }).forEach((animation) => {
				animation.cancel();
			});
	};
	reduced.addEventListener("change", syncMotion);
	page.addEventListener("click", (event) => {
		const target = event.target as Element;
		const top = target.closest("[data-top], #back-to-top-btn button");
		if (top) {
			event.preventDefault();
			window.scrollTo({ top: 0, behavior: canMove() ? "smooth" : "instant" });
			return;
		}
		const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
		if (
			!link ||
			event.defaultPrevented ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		const destination = document.getElementById(
			decodeURIComponent(link.hash.slice(1)),
		);
		if (destination) {
			event.preventDefault();
			destination.scrollIntoView({
				behavior: canMove() ? "smooth" : "instant",
				block: "start",
			});
			history.replaceState(null, "", link.hash);
		}
	});
	document
		.querySelectorAll<HTMLButtonElement>("[data-copy-url]")
		.forEach((button) => {
			button.addEventListener("click", async () => {
				const text = button.dataset.copyUrl;
				if (!text) return;
				const original = button.textContent;
				try {
					await navigator.clipboard.writeText(text);
					button.textContent = "Copied";
				} catch {
					button.textContent = "Copy unavailable — select the URL";
				}
				setTimeout(() => {
					button.textContent = original;
				}, 2400);
			});
		});
	const ready = () => {
		syncMotion();
		page
			.querySelectorAll<HTMLImageElement>("img[data-fallback-artwork]")
			.forEach((image) => {
				if (image.dataset.fallbackBound) return;
				image.dataset.fallbackBound = "true";
				const failed = () => {
					image.hidden = true;
					if (image.parentElement)
						image.parentElement.dataset.artworkError = "true";
				};
				image.addEventListener("error", failed, { once: true });
				if (image.complete && image.currentSrc && !image.naturalWidth) failed();
			});
		initMarkdownActions();
		initScrollControls();
		void initFancybox().catch(() => {
			/* Images remain readable without the viewer. */
		});
		announcePageReady();
	};
	window.addEventListener("content-decrypted", () => {
		void initFancybox().catch(() => {});
	});
	window.addEventListener("pagehide", (event) => {
		document.dispatchEvent(new Event(CLOSE_PANELS));
		document.dispatchEvent(
			new CustomEvent(PAGE_BEFORE_REPLACE, {
				detail: { persisted: event.persisted },
			}),
		);
		document
			.querySelectorAll<HTMLMediaElement>(
				"#content-wrapper audio, #content-wrapper video",
			)
			.forEach((media) => {
				media.pause();
			});
		cleanupFancybox();
	});
	window.addEventListener("pageshow", (event) => {
		if (event.persisted) ready();
	});
	document.addEventListener("visibilitychange", () => {
		if (document.hidden)
			page.getAnimations({ subtree: true }).forEach((animation) => {
				animation.cancel();
			});
	});
	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", ready, { once: true });
	else ready();
}
