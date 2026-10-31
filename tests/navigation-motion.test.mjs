import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = (await readFile("src/components/site/NavigationMotion.astro", "utf8")).match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

test("Astro navigation pairs the selected title, updates active nav state immediately, and caches the 4 menu routes in memory across all pages", async () => {
 const handlers = {}, storage = new Map(), rootAttrs = new Map(), fetchedUrls = [];
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
 const card = {id:"selected", querySelector:() => cardTitle};
 const link = {href:"https://example.com/posts/one/", target:"", hasAttribute:() => false, closest:() => card};
 let fetchCalls = 0;
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
   return new MockResponse(`<html><head><link rel="stylesheet" href="/_astro/test.css"><script type="module" src="/_astro/page.js"></script></head><body><astro-island component-url="/_astro/archivePanel.js" renderer-url="/_astro/client.js"></astro-island>${url}</body></html>`);
  },
  addEventListener() {},
 };
 const document = {
  readyState: "loading",
  head: {
   querySelector: () => null,
   appendChild() {},
  },
  documentElement:{
   setAttribute(k, v) { rootAttrs.set(k, v); },
   removeAttribute(k) { rootAttrs.delete(k); },
   hasAttribute(k) { return rootAttrs.has(k); },
  },
  addEventListener:(name, fn) => {handlers[name] = fn},
  getElementById:id => id === "selected" ? card : null,
  querySelector:() => articleTitle,
  querySelectorAll:selector => selector.includes(".nv-nav") ? navLinks : [cardTitle, articleTitle].filter(x => x.style.viewTransitionName),
 };
 const location = {href:"https://example.com/",pathname:"/",origin:"https://example.com"};
 const historyObj = { state: { index: 5 }, replaceState(st) { this.state = st; } };
 vm.runInNewContext(source, {window:windowObj,Response:MockResponse,setTimeout,document,location,URL,history:historyObj,sessionStorage:{getItem:key => storage.get(key), setItem:(key,value) => storage.set(key,value), removeItem:key => storage.delete(key)}});

 // Verify in-memory caching for the 4 menu routes, fetch-based subresource warming (no Sec-Purpose: prefetch), and non-caching for posts
 const firstMenuRes = await windowObj.fetch("https://example.com/friends/");
 const secondMenuRes = await windowObj.fetch("https://example.com/friends/");
 assert.equal(await firstMenuRes.text(), await secondMenuRes.text());
 assert.equal(fetchCalls, 1, "menu route HTML is served from in-memory cache on subsequent fetches");
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
 await windowObj.fetch("https://example.com/posts/one/");
 await windowObj.fetch("https://example.com/posts/one/");
 assert.equal(fetchCalls, 3, "post routes are not cached in memory");

 handlers.click({button:0,target:{closest:() => link}});
 handlers["astro:before-preparation"]({from:new URL("https://example.com/"),to:new URL(link.href)});
 assert.equal(cardTitle.style.viewTransitionName, "voyage-entry-title");
 assert.equal(rootAttrs.has("data-voyage-home-fold-deferred"), false, "entry title transitions do not hide below-fold cards");
 assert.equal(JSON.parse(storage.get("voyage:source")).scrollY, 634, "computes and saves viewport-aligned scrollY in voyage:source when clicked card is below fold at scrollY=0");
 assert.equal(navLinks[0].current, undefined);
 assert.equal(navLinks[1].current, "page", "navigating to a post highlights Writing immediately");
 let finish;
 const transition = {finished:new Promise(resolve => {finish = resolve;})};
 handlers["astro:before-swap"]({to:new URL(link.href),newDocument:{querySelector:() => articleTitle},viewTransition:transition});
 assert.equal(articleTitle.style.viewTransitionName, "voyage-entry-title");
 assert.equal(cardTitle.style.viewTransitionName, "voyage-entry-title");
 finish(); await transition.finished; await Promise.resolve();
 assert.equal(articleTitle.style.viewTransitionName, undefined);

 // Clicking menu tabs from inside a post sets accurate slide direction relative to Writing
 const postToLinks = {from:new URL(link.href),to:new URL("https://example.com/friends/"),direction:"back"};
 handlers["astro:before-preparation"](postToLinks);
 assert.equal(postToLinks.direction, "forward");
 assert.equal(navLinks[2].current, "page");

 windowObj.scrollY = 0;
 handlers["astro:before-preparation"]({from:new URL(link.href),to:new URL("https://example.com/")});
 assert.equal(navLinks[0].page ?? navLinks[0].current, "page", "returning home highlights Home immediately");
 assert.equal(navLinks[2].current, undefined);
 handlers["astro:before-swap"]({to:new URL("https://example.com/"),newDocument:{getElementById:() => card},viewTransition:{finished:new Promise(() => {})}});
 assert.equal(cardTitle.style.viewTransitionName, "voyage-entry-title");
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
 assert.equal(navLinks[1].current, 'page');
 assert.equal(rootAttrs.has("data-voyage-home-transition"), false, "interior-to-interior tab switch does not set home transition flag");
 const forward = {from:new URL('https://example.com/'), to:new URL('https://example.com/friends/'), direction:'back'};
 handlers['astro:before-preparation'](forward);
 assert.equal(forward.direction, 'forward');
 assert.equal(navLinks[2].current, 'page');
 assert.equal(navLinks[1].current, undefined);
 assert.equal(rootAttrs.has("data-voyage-home-transition"), true, "Home -> interior sets home transition flag");
 assert.equal(rootAttrs.has("data-voyage-home-fold-deferred"), false, "leaving Home keeps visible cards intact on tall screens");
 handlers['astro:page-load']();
 assert.equal(storage.has('voyage:source'), false);

 // Verify Home transition signal capture, invalidation, and rejection safety
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
