import { test as base, expect } from '@playwright/test';

export const routes = [
  { name: 'Home', path: '/', heading: '.nv-titleblock h1' },
  { name: 'Writing', path: '/archive/', heading: '.vs-page-head h1' },
  { name: 'Links', path: '/friends/', heading: '.vs-page-head h1' },
  { name: 'About', path: '/about/', heading: '.vs-about-content h1' },
];

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors = [];
    const failedRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    // Analytics and external media are not necessary to navigate the static blog.
    // Local scripts, fonts, photos and Pagefind remain real production requests.
    await page.route('**/*', route => {
      const address = new URL(route.request().url());
      if (['127.0.0.1', 'localhost'].includes(address.hostname)) return route.continue();
      return route.fulfill({ status: 204, body: '' });
    });
    await page.addInitScript(() => {
      const probe = window.__motionProbe = { calls: [], events: [], frames: [], transitions: [], activations: [], recording: false };
      const pose = element => {
        if (!element) return null;
        const css = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return { opacity: Number(css.opacity), translate: css.translate, rotate: css.rotate,
          filter: css.filter, blend: css.mixBlendMode, display: css.display,
          x: box.x, y: box.y, width: box.width, height: box.height };
      };
      const sample = () => ({
        time: performance.now(), path: location.pathname,
        active: document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName,
        first: pose(document.querySelector('.nv-title-first')),
        space: pose(document.querySelector('.nv-titleblock h1 em')),
        title: pose(document.querySelector('.nv-titleblock h1')),
        grain: pose(document.querySelector('.nv-horizon-grain')),
        opening: document.documentElement.hasAttribute('data-voyage-opening'),
        prepared: document.documentElement.hasAttribute('data-voyage-return-prepared'),
      });
      const nativeAnimate = Element.prototype.animate;
      document.addEventListener('click', event => {
        const link = event.target.closest?.('.nv-entry-link');
        if (link) probe.activations.push({ detail: event.detail, pointerType: event.pointerType, trusted: event.isTrusted,
          activeLink: document.activeElement === link, route: link.getAttribute('href') });
      }, true);
      Element.prototype.animate = function (...args) {
        const animation = nativeAnimate.apply(this, args);
        if (this.matches('.nv-title-first, .nv-titleblock h1 em, .nv-horizon, .vs-page-head h1, .vs-page-head h1 em, .vs-about-content h1, .vs-about-content h1 em')) {
          probe.calls.push({ path: location.pathname, time: performance.now(),
            target: this.matches('.nv-title-first') ? 'first' : this.matches('.nv-titleblock h1 em') ? 'space' : this.className || this.tagName,
            timing: animation.effect.getTiming(), frames: animation.effect.getKeyframes(), pose: pose(this) });
        }
        return animation;
      };
      for (const name of ['astro:before-preparation', 'astro:before-swap', 'astro:after-swap', 'astro:page-load']) {
        document.addEventListener(name, event => {
          const item = { name, time: performance.now(), path: location.pathname, direction: event.direction, sample: sample(), history: history.state };
          probe.events.push(item);
          if (name === 'astro:before-swap') {
            // This listener runs before application listeners; read the marker after all of them.
            queueMicrotask(() => { item.incomingPrepared = event.newDocument.documentElement.hasAttribute('data-voyage-return-prepared'); });
          }
          if (name === 'astro:after-swap') probe.staged = sample();
        });
      }
      if (document.startViewTransition) {
        const nativeTransition = document.startViewTransition.bind(document);
        document.startViewTransition = (...args) => {
          const transition = nativeTransition(...args);
          const item = { start: performance.now(), path: location.pathname };
          probe.transitions.push(item);
          window.__nativeTransition = transition;
          void transition.ready.then(() => {
            item.ready = performance.now();
            item.animations = document.getAnimations().filter(a => a.effect?.pseudoElement).map(a => ({
              pseudo: a.effect.pseudoElement, name: a.animationName, timing: a.effect.getTiming(), frames: a.effect.getKeyframes(),
            }));
            const content = document.querySelector('#site-main');
            const entrance = content?.getAnimations().find(animation => animation.animationName === 'voyageTabEnter');
            if (entrance) item.contentEntrance = {
              offset: getComputedStyle(content).getPropertyValue('--voyage-tab-offset').trim(),
              duration: entrance.effect.getTiming().duration,
            };
          }, () => { item.skipped = true; });
          void transition.finished.then(() => { item.end = performance.now(); }, () => { item.end = performance.now(); });
          return transition;
        };
      }
      function frame() {
        if (probe.recording && probe.frames.length < 600) probe.frames.push(sample());
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    await use(page);
    if (testInfo.status !== testInfo.expectedStatus || errors.length) {
      const motion = await page.evaluate(() => ({ ...window.__motionProbe, finalHistory: history.state, finalFocus: document.activeElement?.outerHTML?.slice(0, 500) })).catch(() => null);
      await testInfo.attach('browser-diagnostics', { body: JSON.stringify({ errors, failedRequests, motion }, null, 2), contentType: 'application/json' });
    }
    expect(errors, 'uncaught browser exceptions').toEqual([]);
  },
});

export { expect };

export async function settled(page) {
  await page.waitForFunction(() => !!document.querySelector('.nv-page') && !document.documentElement.hasAttribute('data-astro-transition') &&
    !document.documentElement.hasAttribute('data-voyage-home-transition') &&
    !document.documentElement.hasAttribute('data-voyage-tab-transition') &&
    !document.documentElement.hasAttribute('data-voyage-return-prepared') &&
    !document.documentElement.hasAttribute('data-voyage-opening'));
  // IntersectionObserver delivery can follow native transition completion.
  await page.waitForFunction(() => {
    const heading = document.querySelector('.vs-page-head h1, .vs-about-content h1');
    return !heading || matchMedia('(prefers-reduced-motion: reduce)').matches || heading.hasAttribute('data-motion-ready');
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity && a.playState !== 'paused').map(a => a.finished.catch(() => {})));
  });
}

export async function visit(page, path = '/', opened = true) {
  if (opened) await page.addInitScript(() => sessionStorage.setItem('voyage:opened', 'true'));
  await page.goto(path);
  await settled(page);
}

export async function navigate(page, name) {
  const route = routes.find(route => route.name === name);
  const link = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true });
  if (testTouch(page)) await link.tap(); else await link.click();
  await expect(page).toHaveURL(new RegExp(`${route.path.replaceAll('/', '\\/')}(?:#.*)?$`));
  await settled(page);
}

// Playwright exposes touch settings through test.info(), not browser sniffing.
function testTouch() { return !!test.info().project.use.hasTouch; }

export async function armCompositorCapture(page) {
  await page.evaluate(() => {
    window.__captureReady = new Promise(resolve => {
      document.addEventListener('astro:after-swap', () => queueMicrotask(async () => {
        await window.__nativeTransition.ready;
        window.__capturedAnimations = document.getAnimations().filter(animation =>
          animation.effect?.pseudoElement || animation.animationName === 'voyageTabEnter' ||
          animation.effect?.target?.matches?.('.nv-title-first, .nv-titleblock h1 em'));
        for (const animation of window.__capturedAnimations) animation.pause();
        resolve(window.__capturedAnimations.length);
      }), { once: true });
    });
  });
}

export async function seekCaptured(page, time) {
  await page.evaluate(time => {
    for (const animation of window.__capturedAnimations) animation.currentTime = time;
  }, time);
  await freezeDecorations(page);
}

export async function freezeDecorations(page) {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('.nv-sky img')].map(image => image.decode().catch(() => {})));
    await Promise.all([...document.querySelectorAll('img[data-about-photo]')].map(image => image.decode().catch(() => {})));
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getComputedTiming().iterations === Infinity) {
        animation.pause(); animation.currentTime = 0;
      }
    }
  });
}
