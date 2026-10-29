const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let observer: IntersectionObserver | undefined;
const animations = new Set<Animation>();
function start() {
 observer?.disconnect(); if (reduced.matches || !document.documentElement.hasAttribute("data-voyage-preparing")) return;
 const headings = document.querySelectorAll<HTMLElement>(".vs-page-head h1:not([data-motion-ready]), .vs-about-content h1:not([data-motion-ready]), .nv-titleblock h1:not([data-motion-ready]), .nv-writing-heading h2:not([data-motion-ready]), .nv-signoff > p:not([data-motion-ready])");
 const track = (a: Animation) => { animations.add(a); void a.finished.then(() => a.cancel(), () => {}).finally(() => animations.delete(a)); };
 const reveal = (el: HTMLElement) => {
  if (!document.documentElement.hasAttribute("data-voyage-preparing")) return;
  const hero = el.matches('.nv-titleblock h1');
  if (!hero) track(el.animate([{opacity:.55,translate:"0 9px"},{opacity:1,translate:"0 0"}], {duration:750,fill:"both",easing:"cubic-bezier(.16,.8,.2,1)"}));
  el.dataset.motionReady = "true";
  const flourish = el.querySelector<HTMLElement>("em");
  if (flourish && !(hero && document.documentElement.hasAttribute('data-voyage-opening'))) track(flourish.animate([{opacity:.35,translate:"0 8px",rotate:"-2deg"},{opacity:1,translate:"0 0",rotate:"0deg"}], {duration:1050,delay:100,fill:"both",easing:"cubic-bezier(.16,.8,.2,1)"}));
 };
 if (!("IntersectionObserver" in window)) { headings.forEach(reveal); document.documentElement.setAttribute("data-voyage-observing", ""); return; }
 observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { reveal(entry.target as HTMLElement); observer?.unobserve(entry.target); } }), {threshold:.2}); headings.forEach(el => observer?.observe(el));
 document.documentElement.setAttribute("data-voyage-observing", "");
}
function stop() { observer?.disconnect(); animations.forEach(a => a.cancel()); animations.clear(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true}); else start();
document.addEventListener("astro:before-swap", event => { stop(); const incoming = (event as Event & {newDocument: Document}).newDocument; if (!reduced.matches) incoming.documentElement.setAttribute('data-voyage-preparing', ''); });
document.addEventListener("astro:page-load", start);
addEventListener("pagehide", stop); addEventListener("pageshow", event => { if (event.persisted) start(); });
reduced.addEventListener("change", () => { stop(); if (!reduced.matches) start(); });
