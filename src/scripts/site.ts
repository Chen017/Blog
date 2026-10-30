import "./content-features";
import "./heading-motion";
import { cleanupFancybox, initFancybox } from "../utils/fancybox";
import { initMarkdownActions } from "../utils/markdown";
import {
	announcePageReady,
	CLOSE_PANELS,
	PAGE_BEFORE_REPLACE,
} from "../utils/page-lifecycle";
import { initScrollControls } from "../utils/scroll-controls";

let pageController: AbortController | undefined;
let transitionFinished: Promise<unknown> = Promise.resolve();
function initializePage() {
 const page = document.querySelector<HTMLElement>(".vs-interior");
 if (!page || page.dataset.siteInitialized === "true") return;
 page.dataset.siteInitialized = "true";
 pageController?.abort();
 pageController = new AbortController();
 const signal = pageController.signal;
 const bar = page.querySelector<HTMLElement>("[data-progress-bar]");
 const label = page.querySelector<HTMLOutputElement>("[data-progress-value]");
 const progress = page.querySelector<HTMLInputElement>("[data-progress-input]");
 const article = page.querySelector<HTMLElement>(".vs-article");
 if (bar && label && article && progress) {
  progress.disabled = false;
  let frame = 0;
  const update = () => { frame = 0; const rect = article.getBoundingClientRect(); const value = Math.round(100 * Math.max(0, Math.min(1, (innerHeight * .35 - rect.top) / Math.max(1, rect.height - innerHeight * .65)))); bar.style.transform = `scaleY(${value / 100})`; label.value = `${value}%`; progress.value = String(value); progress.setAttribute('aria-valuetext', `${value}%`); progress.parentElement?.style.setProperty('--reading-progress', `${value}%`); };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const seek = () => { const rect = article.getBoundingClientRect(); const start = scrollY + rect.top - innerHeight * .35; const length = Math.max(1, rect.height - innerHeight * .65); scrollTo({top: start + Number(progress.value) / 100 * length, behavior:'instant'}); schedule(); };
  progress.addEventListener('input', seek, {signal});
  let drag: { pointerId:number; y:number; value:number; height:number } | undefined;
  progress.addEventListener('pointerdown', event => {
   if (!event.isPrimary || event.button !== 0) return;
   const bounds = progress.getBoundingClientRect();
   const value = Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100));
   drag = {pointerId:event.pointerId, y:event.clientY, value, height:bounds.height};
   progress.setPointerCapture(event.pointerId);
   event.preventDefault();
   progress.value = String(Math.round(value));
   seek();
  }, {signal});
  progress.addEventListener('pointermove', event => {
   if (!drag || drag.pointerId !== event.pointerId) return;
   progress.value = String(Math.round(Math.max(0, Math.min(100, drag.value + (event.clientY - drag.y) / drag.height * 100))));
   seek();
  }, {signal});
  const endDrag = (event: PointerEvent) => { if (drag?.pointerId === event.pointerId) drag = undefined; };
  progress.addEventListener('pointerup', endDrag, {signal});
  progress.addEventListener('pointercancel', endDrag, {signal});
  progress.addEventListener('lostpointercapture', endDrag, {signal});
  progress.addEventListener('keydown', event => {
   const current = Number(progress.value);
   const values: Record<string,number> = {ArrowUp:current - 1, ArrowDown:current + 1, ArrowLeft:current - 1, ArrowRight:current + 1, PageUp:current - 10, PageDown:current + 10, Home:0, End:100};
   if (!(event.key in values)) return;
   event.preventDefault();
   progress.value = String(Math.max(0, Math.min(100, values[event.key])));
   seek();
  }, {signal});
  addEventListener("scroll", schedule, {passive:true, signal}); addEventListener("resize", schedule, {signal}); addEventListener("pageshow", schedule, {signal}); signal.addEventListener("abort", () => { if (frame) cancelAnimationFrame(frame); }); schedule();
 }

	const reduced = matchMedia("(prefers-reduced-motion: reduce)");
	try {
		const source = JSON.parse(
			sessionStorage.getItem("voyage:source") || "null",
		);
		const previous = document.referrer ? new URL(document.referrer) : null;
		const button = page.querySelector<HTMLButtonElement>("[data-source-back]");
		if (
			button &&
			(source?.current || source?.post) === location.pathname &&
			((previous?.origin === location.origin && previous.pathname === source.from) || document.querySelector('meta[name="astro-view-transitions-enabled"]')) &&
			history.length > 1
		) {
			button.hidden = false;
			button.addEventListener("click", () => {
				const delta = Number(source.originIndex) - Number(history.state?.index);
				if (Number.isInteger(source.originIndex) && Number.isInteger(history.state?.index) && delta < 0) history.go(delta);
				else history.back();
			});
		}
	} catch {
		/* All writing is always available without session state. */
	}
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
	reduced.addEventListener("change", syncMotion, {signal});
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
			history.replaceState(history.state, "", link.hash);
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
		const finishSiteInit = () => {
			if (signal.aborted || !page.isConnected) return;
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
		void transitionFinished.then(finishSiteInit, finishSiteInit);
	};
	window.addEventListener("content-decrypted", () => {
		void initFancybox().catch(() => {});
	}, {signal});
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
	}, {signal});
	window.addEventListener("pageshow", (event) => {
		if (event.persisted) ready();
	}, {signal});
	document.addEventListener("visibilitychange", () => {
		if (document.hidden)
			page.getAnimations({ subtree: true }).forEach((animation) => {
				animation.cancel();
			});
	}, {signal});
	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", ready, { once: true });
	else ready();
}
document.addEventListener("astro:before-swap", event => {
 transitionFinished = (event as Event & {viewTransition?: ViewTransition}).viewTransition?.finished.catch(() => {}) ?? Promise.resolve();
 document.dispatchEvent(new Event(CLOSE_PANELS));
 document.dispatchEvent(new CustomEvent(PAGE_BEFORE_REPLACE, { detail: { persisted: false } }));
 document.querySelectorAll<HTMLMediaElement>("#content-wrapper audio, #content-wrapper video").forEach(media => media.pause());
 pageController?.abort();
 cleanupFancybox();
});
document.addEventListener("astro:page-load", initializePage);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializePage, {once:true}); else initializePage();
