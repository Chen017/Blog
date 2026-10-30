import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = (await readFile("src/components/site/NavigationMotion.astro", "utf8")).match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

test("Astro navigation pairs the selected title until the transition finishes in both directions and updates active nav state immediately", async () => {
 const handlers = {}, storage = new Map();
 const makeTitle = () => ({style:{removeProperty() { delete this.viewTransitionName; }}});
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
 const document = {
  documentElement:{setAttribute(){},removeAttribute(){}},
  addEventListener:(name, fn) => {handlers[name] = fn},
  getElementById:id => id === "selected" ? card : null,
  querySelector:() => articleTitle,
  querySelectorAll:selector => selector.includes(".nv-nav") ? navLinks : [cardTitle, articleTitle].filter(x => x.style.viewTransitionName),
 };
 const location = {href:"https://example.com/",pathname:"/",origin:"https://example.com"};
 vm.runInNewContext(source, {window:{},document,location,URL,history:{state:{index:5}},sessionStorage:{getItem:key => storage.get(key), setItem:(key,value) => storage.set(key,value), removeItem:key => storage.delete(key)}});
 handlers.click({button:0,target:{closest:() => link}});
 handlers["astro:before-preparation"]({from:new URL("https://example.com/"),to:new URL(link.href)});
 assert.equal(cardTitle.style.viewTransitionName, "voyage-entry-title");
 assert.equal(navLinks[0].current, undefined);
 assert.equal(navLinks[1].current, "page", "navigating to a post highlights Writing immediately");
 let finish;
 const transition = {finished:new Promise(resolve => {finish = resolve;})};
 handlers["astro:before-swap"]({to:new URL(link.href),newDocument:{querySelector:() => articleTitle},viewTransition:transition});
 assert.equal(articleTitle.style.viewTransitionName, "voyage-entry-title");
 assert.equal(cardTitle.style.viewTransitionName, "voyage-entry-title");
 finish(); await transition.finished; await Promise.resolve();
 assert.equal(articleTitle.style.viewTransitionName, undefined);
 handlers["astro:before-preparation"]({from:new URL(link.href),to:new URL("https://example.com/")});
 assert.equal(navLinks[0].current, "page", "returning home highlights Home immediately");
 assert.equal(navLinks[1].current, undefined);
 handlers["astro:before-swap"]({to:new URL("https://example.com/"),newDocument:{getElementById:() => card},viewTransition:{finished:new Promise(() => {})}});
 assert.equal(cardTitle.style.viewTransitionName, "voyage-entry-title");
 const previous = { from:new URL(link.href), to:new URL('https://example.com/posts/older/'), direction:'forward', sourceElement:{closest:() => ({dataset:{direction:'previous'}, closest:() => null})} };
 handlers['astro:before-preparation'](previous);
 assert.equal(previous.direction, 'back');
 assert.equal(JSON.parse(storage.get('voyage:source')).current, '/posts/older/');
 assert.equal(JSON.parse(storage.get('voyage:source')).originIndex, 5);
 const tab = {from:new URL('https://example.com/about/'), to:new URL('https://example.com/archive/'), direction:'forward'};
 handlers['astro:before-preparation'](tab);
 assert.equal(tab.direction, 'back');
 assert.equal(navLinks[1].current, 'page');
 const forward = {from:new URL('https://example.com/'), to:new URL('https://example.com/friends/'), direction:'back'};
 handlers['astro:before-preparation'](forward);
 assert.equal(forward.direction, 'forward');
 assert.equal(navLinks[2].current, 'page');
 assert.equal(navLinks[1].current, undefined);
 handlers['astro:page-load']();
 assert.equal(storage.has('voyage:source'), false);
});
