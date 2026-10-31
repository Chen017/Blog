/**
 * NavigationMotion.astro is the sole writer of this signal, before Astro's
 * default swap. Page-specific scripts must not register competing promises.
 *
 * Direct loads (and non-transition navigations) are already settled.
 */
export function whenTransitionSettled(): Promise<void> {
 return window.__voyageTransitionFinished ?? Promise.resolve();
}
