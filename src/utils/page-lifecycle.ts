export const PAGE_READY = "twilight:page:loaded";
export const PAGE_BEFORE_REPLACE = "twilight:page:before-replace";
export const CLOSE_PANELS = "twilight:panels:close";

export function announcePageReady() {
    document.dispatchEvent(new CustomEvent(PAGE_READY, {
        detail: { path: window.location.pathname, timestamp: Date.now() },
    }));
}

export function getScrollBehavior(): ScrollBehavior {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}
