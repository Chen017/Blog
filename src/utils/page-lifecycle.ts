import type { TransitionDirectionalAnimations } from "astro";

export const PAGE_READY = "twilight:page:loaded";
export const PAGE_BEFORE_REPLACE = "twilight:page:before-replace";
export const CLOSE_PANELS = "twilight:panels:close";

const VOYAGE_SLIDE_DURATION = "280ms";
const VOYAGE_SLIDE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export const voyageSlide: TransitionDirectionalAnimations = {
	forwards: {
		old: [
			{
				name: "voyageFadeOut",
				duration: "90ms",
				easing: VOYAGE_SLIDE_EASING,
				fillMode: "both",
			},
			{
				name: "astroSlideToLeft",
				duration: VOYAGE_SLIDE_DURATION,
				easing: VOYAGE_SLIDE_EASING,
				fillMode: "both",
			},
		],
		new: [
			{
				name: "voyageFadeIn",
				duration: "210ms",
				easing: VOYAGE_SLIDE_EASING,
				delay: "30ms",
				fillMode: "both",
			},
			{
				name: "astroSlideFromRight",
				duration: VOYAGE_SLIDE_DURATION,
				easing: VOYAGE_SLIDE_EASING,
				fillMode: "both",
			},
		],
	},
	backwards: {
		old: [
			{
				name: "voyageFadeOut",
				duration: "90ms",
				easing: VOYAGE_SLIDE_EASING,
				fillMode: "both",
			},
			{
				name: "astroSlideToRight",
				duration: VOYAGE_SLIDE_DURATION,
				easing: VOYAGE_SLIDE_EASING,
				fillMode: "both",
			},
		],
		new: [
			{
				name: "voyageFadeIn",
				duration: "210ms",
				easing: VOYAGE_SLIDE_EASING,
				delay: "30ms",
				fillMode: "both",
			},
			{
				name: "astroSlideFromLeft",
				duration: VOYAGE_SLIDE_DURATION,
				easing: VOYAGE_SLIDE_EASING,
				fillMode: "both",
			},
		],
	},
};

export function announcePageReady() {
	document.dispatchEvent(
		new CustomEvent(PAGE_READY, {
			detail: { path: window.location.pathname, timestamp: Date.now() },
		}),
	);
}

export function getScrollBehavior(): ScrollBehavior {
	const paused =
		typeof document !== "undefined" &&
		document.documentElement?.dataset.motion === "off";
	return paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches
		? "instant"
		: "smooth";
}
