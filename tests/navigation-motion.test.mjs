import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = (await readFile("src/components/site/NavigationMotion.astro", "utf8")).match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

test("Astro navigation preserves outgoing menu state, caches main routes and hovered posts, and unwraps covers on Post -> Home", async () => {
 const handlers = {}, windowHandlers = {}, storage = new Map(), rootAttrs = new Map(), cardAttrs = new Map(), fetchedUrls = [];
 const makeTitle = () => ({
  style:{removeProperty() { delete this.viewTransitionName; }},
  getBoundingClientRect: () => ({ left: 400, top: 1075.5, bottom: 1125.5, width: 154, height: 50 }),
 });
 const makeNavLink = (href, current = false) => ({
  href,
  current: current ? "page" : undefined,
  getAttribute(name) { return name === "href" ? this.href : this.current; },
  setAttribute(name, value) { if (name === "aria-current") this.current = value; },
  removeAttribute(name) { if (name === "aria-current") this.current = undefined; },
 });
 const navLinks = [
  makeNavLink("#nv-home", true),
  makeNavLink("/archive/"),
  makeNavLink("/friends/"),
  makeNavLink("/about/"),
 ];
 const cardTitle = makeTitle(), articleTitle = makeTitle();
 const card = {
  id: "selected",
  querySelector: sel => sel === "a[href]" ? link : cardTitle,
  setAttribute(k, v) { cardAttrs.set(k, v); },
  removeAttribute(k) { cardAttrs.delete(k); },
  getAttribute(k) { return k === "data-entry-route" ? "/posts/one/" : cardAttrs.get(k); },
 };
 const link = {
  href: "https://example.com/posts/one/",
  target: "",
  matches: sel => sel === "a[href]",
  getAttribute: name => name === "href" ? "/posts/one/" : null,
  hasAttribute: () => false,
  closest: sel => sel.includes("[data-entry-route]") ? card : link,
 };
 let fetchCalls = 0;
 let fakeNowMs = 1_000_000_000;
 let responseVersion = 1;
 const connection = { saveData: false, effectiveType: "4g" };
 class MockResponse {
  constructor(body, init = {}) {
   this.body = body;
   this.ok = true;
   this.redirected = false;
   this.status = init.status || 200;
   this.statusText = init.statusText || "OK";
   this.headers = { get: name => name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null };
  }
  async text() { return this.body; }
  clone() { return new MockResponse(this.body, this); }
 }
 const windowObj = {
  scrollY: 0,
  innerHeight: 736,
  scrollTo(opts) { if (opts && typeof opts.top === "number") this.scrollY = opts.top; },
  fetch: async (url, init) => {
   fetchedUrls.push({ url, priority: init?.priority });
   if (!String(url).includes("/_astro/")) fetchCalls++;
   return new MockResponse(`<html data-cache-version="${responseVersion}"><head><link rel="stylesheet" href="/_astro/test.css"><script type="module" src="/_astro/page.js"></script></head><body><astro-island component-url="/_astro/archivePanel.js" renderer-url="/_astro/client.js"></astro-island>${url}</body></html>`);
  },
  addEventListener(name, fn) { windowHandlers[name] = fn; },
 };
 const document = {
  readyState: "loading",
  head: {
   querySelector: () => null,
   querySelectorAll: () => [{ getAttribute: () => "/_astro/inner-only.css", cloneNode: () => ({}) }],
   appendChild() { throw new Error("navigation must not append stale outgoing stylesheets"); },
  },
  documentElement:{
   setAttribute(k, v) { rootAttrs.set(k, v); },
   removeAttribute(k) { rootAttrs.delete(k); },
   hasAttribute(k) { return rootAttrs.has(k); },
  },
  addEventListener:(name, fn) => {handlers[name] = fn},
  getElementById:id => id === "selected" ? card : null,
  querySelector:() => articleTitle,
  querySelectorAll:selector => {
   if (selector.includes(".nv-nav")) return navLinks;
   if (selector === "[data-entry-pressing]") return cardAttrs.has("data-entry-pressing") ? [card] : [];
   return [cardTitle, articleTitle].filter(x => x.style.viewTransitionName);
  },
 };
 const location = {href:"https://example.com/",pathname:"/",origin:"https://example.com"};
 const historyObj = { state: { index: 5 }, replaceState(st) { this.state = st; } };
 vm.runInNewContext(source, {window:windowObj,Response:MockResponse,Date:{now:() => fakeNowMs},setTimeout,clearTimeout,document,location,URL,navigator:{connection,onLine:true},history:historyObj,sessionStorage:{getItem:key => storage.get(key), setItem:(key,value) => storage.set(key,value), removeItem:key => storage.delete(key)}});

 // Verify in-memory caching for the 4 menu routes, fetch-based subresource warming (no Sec-Purpose: prefetch), and non-caching for un-warmed posts
 const firstMenuRes = await windowObj.fetch("https://example.com/friends/");
 const secondMenuRes = await windowObj.fetch("https://example.com/friends/");
 assert.equal(await firstMenuRes.text(), await secondMenuRes.text());
 assert.equal(fetchCalls, 1, "menu route HTML is served from in-memory cache on subsequent fetches");
 await windowObj.fetch("https://example.com/friends/?category=Development");
 assert.equal(fetchCalls, 2, "query-specific HTML bypasses pathname-only navigation cache");
 await windowObj.fetch("https://example.com/friends/", { cache: "reload" });
 assert.equal(fetchCalls, 3, "explicit reload requests bypass custom navigation cache");
 fakeNowMs += 5 * 60 * 1000 + 1;
 responseVersion = 2;
 const staleMenuRes = await windowObj.fetch("https://example.com/friends/");
 assert.equal(fetchCalls, 3, "a soft-expired menu responds from memory without blocking on the network");
 assert.equal(await staleMenuRes.text(), await firstMenuRes.text(), "soft expiry preserves an immediately usable snapshot");
 await new Promise(resolve => setTimeout(resolve, 10));
 assert.equal(fetchCalls, 4, "the stale menu is revalidated once, in the background");
 const refreshedMenuRes = await windowObj.fetch("https://example.com/friends/");
 assert.ok((await refreshedMenuRes.text()).includes('data-cache-version="2"'), "subsequent navigation sees the refreshed HTML");
 assert.equal(fetchCalls, 4, "freshly revalidated HTML is reused");
 fakeNowMs += 60 * 60 * 1000 + 1;
 responseVersion = 3;
 const tooOldMenuRes = await windowObj.fetch("https://example.com/friends/");
 assert.ok((await tooOldMenuRes.text()).includes('data-cache-version="3"'), "very old HTML cannot remain stale indefinitely");
 assert.equal(fetchCalls, 5, "the hard staleness cap requires a new fetch");
 assert.deepEqual(
  fetchedUrls.filter(item => String(item.url).includes("/_astro/")),
  [
   { url: "https://example.com/_astro/test.css", priority: "low" },
   { url: "https://example.com/_astro/page.js", priority: "low" },
   { url: "https://example.com/_astro/archivePanel.js", priority: "low" },
   { url: "https://example.com/_astro/client.js", priority: "low" },
  ],
  "menu route fetch warms stylesheets and Astro scripts via low-priority fetch instead of link rel=prefetch",
 );
 await windowObj.fetch("https://example.com/posts/unwarmed/");
 await windowObj.fetch("https://example.com/posts/unwarmed/");
 assert.equal(fetchCalls, 7, "unwarmed post routes are not cached indiscriminately");
 connection.saveData = true;
 windowHandlers.load({ type: "load" });
 assert.equal(fetchCalls, 7, "Save-Data prevents automatic background tab warming");
 connection.saveData = false;

 // Solution A1: pointerdown / hover on a card pre-warms postCache so clicking serves from memory in 0ms
 windowHandlers.pointerdown({ type: "pointerdown", target: { closest: () => link } });
 await new Promise(r => setTimeout(r, 5));
 const callsAfterWarm = fetchCalls;
 const warmedPostRes = await windowObj.fetch("https://example.com/posts/one/");
 assert.equal(fetchCalls, callsAfterWarm, "pre-warmed post route is served from postCache without extra network fetch");
 assert.ok((await warmedPostRes.text()).includes("/posts/one/"));

 handlers.click({button:0,target:{closest:() => link}});
 assert.equal(cardAttrs.get("data-entry-pressing"), "true", "clicking a card sets immediate tactile pressing state");
 handlers["astro:before-preparation"]({from:new URL("https://example.com/"),to:new URL(link.href)});
 assert.equal(cardTitle.style.viewTransitionName, "voyage-entry-title");
 assert.equal(rootAttrs.has("data-voyage-home-fold-deferred"), false, "entry title transitions do not hide below-fold cards");
 assert.equal(JSON.parse(storage.get("voyage:source")).scrollY, 634, "computes and saves viewport-aligned scrollY in voyage:source when clicked card is below fold at scrollY=0");
 assert.equal(navLinks[0].current, "page", "outgoing Home keeps its selected state until the swap");
 assert.equal(navLinks[1].current, undefined, "the destination must not flash as active on the outgoing DOM");
 let finish;
 const transition = {finished:new Promise(resolve => {finish = resolve;})};
 handlers["astro:before-swap"]({to:new URL(link.href),newDocument:{querySelector:() => articleTitle,head:{querySelector:() => null,appendChild(){throw new Error("outgoing CSS must never be copied");}}},viewTransition:transition});
 assert.equal(cardAttrs.has("data-entry-pressing"), false, "clears pressing state on swap");
 assert.ok(windowObj.__voyageTransitionFinished instanceof Promise, "exposes global __voyageTransitionFinished promise for interior scripts");
 assert.equal(articleTitle.style.viewTransitionName, "voyage-entry-title");
 assert.equal(cardTitle.style.viewTransitionName, "voyage-entry-title");
 finish(); await transition.finished; await Promise.resolve();
 assert.equal(articleTitle.style.viewTransitionName, undefined);

 // Clicking menu tabs from inside a post sets accurate slide direction relative to Writing
 const postToLinks = {from:new URL(link.href),to:new URL("https://example.com/friends/"),direction:"back"};
 handlers["astro:before-preparation"](postToLinks);
 assert.equal(postToLinks.direction, "forward");
 assert.equal(navLinks[2].current, undefined, "old header does not preselect a different destination");

 // CSS ownership: Astro ClientRouter must own <head> swaps (no outgoing CSS clones).
 // Solution B1: Post -> Home synchronously unwraps <deferred-cover> templates in incoming document before snapshot capture
 windowObj.scrollY = 0;
 let coverUnwrapped = false;
 let unrelatedCoverUnwrapped = false;
 let coverLoadedAttr = null;
 const mockImg = { decoding: "async", loading: "lazy" };
 const mockCover = {
  closest: () => ({ id: "selected" }),
  querySelector: sel => sel === "template" ? { content: { cloneNode: () => ({ querySelector: () => mockImg }) }, remove() { coverUnwrapped = true; } } : null,
  insertBefore() {},
  setAttribute(k, v) { if (k === "data-loaded") coverLoadedAttr = v; },
 };
 const unrelatedCover = {
  closest: () => ({ id: "unrelated-card" }),
  querySelector: sel => sel === "template" ? { content: { cloneNode: () => ({ querySelector: () => mockImg }) }, remove() { unrelatedCoverUnwrapped = true; } } : null,
  insertBefore() {},
  setAttribute() {},
 };
 handlers["astro:before-preparation"]({from:new URL(link.href),to:new URL("https://example.com/")});
 assert.equal(navLinks[0].page ?? navLinks[0].current, "page", "outgoing header is left untouched until Astro swaps the destination");
 assert.equal(navLinks[2].current, undefined);
 handlers["astro:before-swap"]({
  to:new URL("https://example.com/"),
  newDocument:{
   getElementById:() => card,
   querySelectorAll: sel => sel === "deferred-cover" ? [mockCover, unrelatedCover] : [],
  },
  viewTransition:{finished:new Promise(() => {})},
 });
 assert.equal(cardTitle.style.viewTransitionName, "voyage-entry-title");
 assert.equal(coverUnwrapped, true, "Post -> Home unwraps <deferred-cover> template before snapshot capture");
 assert.equal(unrelatedCoverUnwrapped, false, "Post -> Home preserves unrelated lazy cover templates");
 assert.equal(coverLoadedAttr, "true", "marks unwrapped cover as data-loaded=true to skip 360ms fade replay");
 assert.equal(mockImg.decoding, "sync");
 assert.equal(mockImg.loading, "eager");
 assert.equal(windowObj.__voyageLoadedCovers.has("selected"), true);
 assert.equal(windowObj.__voyageLoadedCovers.has("unrelated-card"), false);
 handlers["astro:after-swap"]();
 assert.ok(windowObj.scrollY > 0, "Post -> Home astro:after-swap aligns scrollY so target card is inside viewport before snapshot capture");
 const previous = { from:new URL(link.href), to:new URL('https://example.com/posts/older/'), direction:'forward', sourceElement:{closest:() => ({dataset:{direction:'previous'}, closest:() => null})} };
 handlers['astro:before-preparation'](previous);
 assert.equal(previous.direction, 'back');
 assert.equal(JSON.parse(storage.get('voyage:source')).current, '/posts/older/');
 assert.equal(JSON.parse(storage.get('voyage:source')).originIndex, 5);
 const tab = {from:new URL('https://example.com/about/'), to:new URL('https://example.com/archive/'), direction:'forward'};
 handlers['astro:before-preparation'](tab);
 assert.equal(tab.direction, 'back');
 assert.equal(navLinks[1].current, undefined, "subpage navigation does not mutate the outgoing header");
 assert.equal(rootAttrs.has("data-voyage-home-transition"), false, "interior-to-interior tab switch does not set home transition flag");
 const forward = {from:new URL('https://example.com/'), to:new URL('https://example.com/friends/'), direction:'back'};
 handlers['astro:before-preparation'](forward);
 assert.equal(forward.direction, 'forward');
 assert.equal(navLinks[2].current, undefined, "Home departure does not pre-highlight Links");
 assert.equal(navLinks[1].current, undefined);
 assert.equal(rootAttrs.has("data-voyage-home-transition"), true, "Home -> interior sets home transition flag");
 assert.equal(rootAttrs.has("data-voyage-home-fold-deferred"), false, "leaving Home keeps visible cards intact on tall screens");
 handlers['astro:page-load']();
 assert.equal(storage.has('voyage:source'), false);

 // Verify Home transition signal capture, invalidation, and rejection safety for top-menu transitions
 const friendsToHomePrep = { from: new URL("https://example.com/friends/"), to: new URL("https://example.com/"), direction: "back" };
 handlers["astro:before-preparation"](friendsToHomePrep);
 assert.equal(friendsToHomePrep.direction, "back", "Home transition setup preserves event.direction");
 assert.equal(windowObj.__voyageHomeTransition, null, "new navigation clears previous home transition");
 assert.equal(rootAttrs.has("data-voyage-home-transition"), true);
 assert.equal(rootAttrs.has("data-voyage-home-fold-deferred"), true);

 let resolveFriendsTransition;
 const incomingAttrs = new Map();
 const vtFriends = { finished: new Promise(r => { resolveFriendsTransition = r; }) };
 handlers["astro:before-swap"]({
  from: new URL("https://example.com/friends/"),
  to: new URL("https://example.com/"),
  newDocument: { documentElement: { setAttribute(k, v) { incomingAttrs.set(k, v); } }, getElementById: () => null },
  viewTransition: vtFriends,
 });
 assert.ok(windowObj.__voyageHomeTransition, "creates home transition record on /friends/ -> /");
 assert.equal(windowObj.__voyageHomeTransition.from, "/friends/");
 assert.ok(typeof windowObj.__voyageHomeTransition.id === "number");
 assert.ok(windowObj.__voyageHomeTransition.finished instanceof Promise);
 assert.equal(incomingAttrs.has("data-voyage-home-transition"), true, "marks incoming document for Home boundary transition");
 assert.equal(incomingAttrs.has("data-voyage-home-fold-deferred"), true, "marks incoming Home document for below-fold deferral");
 resolveFriendsTransition();
 await vtFriends.finished;
 await Promise.resolve();
 assert.equal(rootAttrs.has("data-voyage-home-transition"), false, "clears Home boundary flag after transition finishes");
 assert.equal(rootAttrs.has("data-voyage-home-fold-deferred"), false, "clears below-fold deferral flag after transition finishes");
 assert.equal(rootAttrs.has("data-voyage-home-fold-reveal"), true, "triggers post-load fold reveal animation after Home transition finishes");

 handlers["astro:before-preparation"]({ from: new URL("https://example.com/about/"), to: new URL("https://example.com/") });
 assert.equal(windowObj.__voyageHomeTransition, null, "clears record on new preparation");
 handlers["astro:before-swap"]({
  from: new URL("https://example.com/about/"),
  to: new URL("https://example.com/"),
  newDocument: { getElementById: () => null },
  viewTransition: { finished: Promise.resolve() },
 });
 assert.ok(windowObj.__voyageHomeTransition, "creates record on /about/ -> /");
 assert.equal(windowObj.__voyageHomeTransition.from, "/about/");

 handlers["astro:before-preparation"]({ from: new URL("https://example.com/archive/"), to: new URL("https://example.com/") });
 handlers["astro:before-swap"]({
  from: new URL("https://example.com/archive/"),
  to: new URL("https://example.com/"),
  newDocument: { getElementById: () => null },
  viewTransition: { finished: Promise.resolve() },
 });
 assert.ok(windowObj.__voyageHomeTransition, "creates record on /archive/ -> /");
 assert.equal(windowObj.__voyageHomeTransition.from, "/archive/");

 // Subpage to subpage (/friends/ -> /about/) does not create home transition
 handlers["astro:before-preparation"]({ from: new URL("https://example.com/friends/"), to: new URL("https://example.com/about/") });
 handlers["astro:before-swap"]({
  from: new URL("https://example.com/friends/"),
  to: new URL("https://example.com/about/"),
  newDocument: { getElementById: () => null },
  viewTransition: { finished: Promise.resolve() },
 });
 assert.equal(windowObj.__voyageHomeTransition, null, "does not create record on /friends/ -> /about/");
 assert.equal(rootAttrs.has("data-voyage-home-transition"), false);

 // Rejection of viewTransition.finished does not cause unhandled rejection
 let rejectTransition;
 const vtReject = { finished: new Promise((_, rej) => { rejectTransition = rej; }) };
 handlers["astro:before-preparation"]({ from: new URL("https://example.com/about/"), to: new URL("https://example.com/") });
 handlers["astro:before-swap"]({
  from: new URL("https://example.com/about/"),
  to: new URL("https://example.com/"),
  newDocument: { getElementById: () => null },
  viewTransition: vtReject,
 });
 assert.ok(windowObj.__voyageHomeTransition);
 rejectTransition(new Error("view transition cancelled"));
 await windowObj.__voyageHomeTransition.finished;
});


test("mobile soft-expired pages stay instant while refreshes are serialized and back off on 503", async () => {
 let now = 1_000_000;
 const timers = [];
 const requests = [];
 const pendingRefreshes = [];
 let activeRefreshes = 0;
 let peakRefreshes = 0;
 let saveData = false;

 class CachedResponse {
  constructor(body, status = 200) {
   this.body = body;
   this.status = status;
   this.statusText = "OK";
   this.ok = status >= 200 && status < 300;
   this.redirected = false;
   this.headers = { get: name => name === "content-type" ? "text/html; charset=utf-8" : null };
  }
  text() { return Promise.resolve(this.body); }
  clone() { return new CachedResponse(this.body, this.status); }
 }
 const fetch = (url, init) => {
  requests.push({ url: String(url), cache: init?.cache });
  if (init?.cache === "no-cache") {
   activeRefreshes++;
   peakRefreshes = Math.max(peakRefreshes, activeRefreshes);
   return new Promise(resolve => pendingRefreshes.push((status, body) => {
    activeRefreshes--;
    resolve(new CachedResponse(body, status));
   }));
  }
  return Promise.resolve(new CachedResponse("initial:" + url));
 };
 const windowObj = { fetch, addEventListener() {} };
 const document = {
  hidden: false,
  readyState: "loading",
  head: { querySelector: () => null },
  documentElement: { setAttribute() {}, removeAttribute() {}, hasAttribute: () => false },
  querySelectorAll: () => [],
  addEventListener() {},
 };
 const schedule = (fn, delay) => { timers.push({ fn, delay }); return timers.length; };
 const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
 const runTimer = async () => {
  const task = timers.shift();
  assert.ok(task, "refresh should have a scheduled task");
  task.fn();
  await settle();
 };
 vm.runInNewContext(source, {
  window: windowObj, document, Response: CachedResponse, URL,
  Date: { now: () => now }, setTimeout: schedule, clearTimeout() {},
  navigator: { connection: { get saveData() { return saveData; }, effectiveType: "4g" }, onLine: true },
  location: { href: "https://example.com/", origin: "https://example.com", pathname: "/" },
  history: { state: {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
 });

 const friends = "https://example.com/friends/";
 const about = "https://example.com/about/";
 await windowObj.fetch(friends);
 await windowObj.fetch(about);
 assert.equal(requests.length, 2);
 now += 6 * 60 * 1000;
 assert.equal(await (await windowObj.fetch(friends)).text(), "initial:" + friends);
 assert.equal(await (await windowObj.fetch(about)).text(), "initial:" + about);
 assert.equal(requests.length, 2, "touch navigation should not wait for either stale page to revalidate");

 await runTimer();
 assert.equal(pendingRefreshes.length, 1, "only one background refresh starts");
 assert.equal(peakRefreshes, 1, "refreshes do not run concurrently");
 pendingRefreshes.shift()(200, "updated friends");
 await settle();
 assert.equal(await (await windowObj.fetch(friends)).text(), "updated friends");
 await runTimer();
 assert.equal(pendingRefreshes.length, 1, "second route waits for the first to finish");
 pendingRefreshes.shift()(200, "updated about");
 await settle();
 assert.equal(peakRefreshes, 1);
 assert.equal(await (await windowObj.fetch(about)).text(), "updated about");

 now += 6 * 60 * 1000;
 await windowObj.fetch(friends);
 await runTimer();
 pendingRefreshes.shift()(503, "temporarily unavailable");
 await settle();
 assert.equal(await (await windowObj.fetch(friends)).text(), "updated friends", "503 preserves the last usable snapshot");
 assert.equal(timers.length, 0, "503 does not cause an immediate retry storm");

 saveData = true;
 now += 61 * 1000;
 await windowObj.fetch(friends);
 assert.equal(timers.length, 0, "Save-Data prevents speculative background refresh");
});


test("menu keeps correct selection timing and planet texture stays stable across navigation", async () => {
 const css = await readFile("src/styles/voyage.css", "utf8");
 const header = await readFile("src/components/site/Header.astro", "utf8");
 const nav = await readFile("src/components/site/NavigationMotion.astro", "utf8");
 assert.doesNotMatch(nav, /syncNav\(/, "the old page keeps server-provided aria-current until replacement");
 assert.match(header, /aria-current=\{link\.active\s*\?\s*"page"/, "the incoming header owns its active state");
 assert.doesNotMatch(css, /\.nv-nav a:active\s*\{\s*opacity:\s*\.78;\s*translate:/, "touch never shifts or fades nav text");
 assert.match(css, /@media\s*\(hover:hover\)\s*and\s*\(pointer:fine\)/, "sticky mobile hover is excluded");
 assert.doesNotMatch(nav, /data-voyage-hero-capture|voyage-hero-title/, "no abandoned hero snapshot route remains");
 assert.doesNotMatch(css, /data-voyage-hero-capture|voyage-hero-title|voyageHeroFromLeft/, "no orphaned title capture style remains");
 assert.doesNotMatch(css, /\.nv-horizon-grain\s*\{\s*display:\s*none\s*!important/, "planet texture must not disappear during a transition");
 assert.match(css, /\.nv-horizon-grain\s*\{[^}]*opacity:\s*\.07/, "planet texture retains original 7% opacity");
 assert.doesNotMatch(css, /html:is\(\[data-astro-transition\],\s*\[data-voyage-home-transition\]\)\s+#voyage-afterhours\s+\.nv-titleblock h1\s*\{\s*mix-blend-mode:\s*normal/, "navigation cannot dim the blended Home headline");
});


test("Home title keeps additive light on departure and its root snapshot stays opaque on return", async () => {
 const css = await readFile("src/styles/voyage.css", "utf8");
 const slide = await readFile("src/utils/page-lifecycle.ts", "utf8");
 const nav = await readFile("src/components/site/NavigationMotion.astro", "utf8");

 // Outgoing Home: no forced normal blend; the original and accessibility fallback remain.
 assert.match(css, /@supports\s*\(mix-blend-mode:\s*plus-lighter\)[\s\S]*?\.nv-titleblock h1\s*\{\s*mix-blend-mode:\s*plus-lighter;/);
 assert.match(css, /@media\s*\(prefers-reduced-transparency:\s*reduce\)[\s\S]*?\.nv-titleblock h1\s*\{\s*mix-blend-mode:\s*normal;/);
 assert.doesNotMatch(css, /html:is\(\[data-astro-transition\],\s*\[data-voyage-home-transition\]\)\s+#voyage-afterhours\s+\.nv-titleblock h1\s*\{\s*mix-blend-mode:\s*normal/);

 // Incoming Home: scope to the new Home body and exclude shared-title transitions.
 assert.match(css, /html\[data-voyage-home-transition\]:has\(> body\.voyage-home\):not\(\[data-voyage-entry-transition\]\):not\(\[data-motion="off"\]\)::view-transition-new\(root\)\s*\{\s*opacity:\s*1\s*!important;/);
 assert.doesNotMatch(css, /::view-transition-new\(voyage-page\)\s*\{\s*opacity:\s*1/, "do not alter unrelated page snapshots");
 assert.match(nav, /incoming\?\.documentElement\?\.setAttribute\?\.\("data-voyage-home-transition",\s*""\)/, "incoming Home gets the boundary marker");
 assert.match(slide, /const VOYAGE_SLIDE_DURATION\s*=\s*"280ms"/, "the native horizontal slide timing stays intact");

 // Planet grain remains visible across the full transition (PR #8).
 assert.doesNotMatch(css, /\.nv-horizon-grain\s*\{\s*display:\s*none\s*!important/);
});
