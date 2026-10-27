let initialized = false;
let pendingFrame: number | null = null;

export function scheduleScrollControls(): void {
    if (pendingFrame !== null) return;
    pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null;
        // Read scroll geometry once, before changing either control's styles.
        const scrollTop = window.scrollY;
        const backToTopVisible = scrollTop > Math.min(window.innerHeight * .66, 600);
        const navbar = document.getElementById('navbar');
        const button = document.getElementById('back-to-top-btn');
        const navbarScrolled = navbar?.dataset.transparentMode === 'semifull' && scrollTop > 50;

        navbar?.classList.toggle('scrolled', navbarScrolled);
        button?.classList.toggle('hide', !backToTopVisible);
        if (button) button.inert = !backToTopVisible;
    });
}

export function initScrollControls(): void {
    if (!initialized) {
        window.addEventListener('scroll', scheduleScrollControls, { passive: true });
        window.addEventListener('resize', scheduleScrollControls, { passive: true });
        initialized = true;
    }
    scheduleScrollControls();
}
