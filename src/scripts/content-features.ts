import { whenTransitionSettled } from "./navigation/transition-settlement";

// Importing a feature is async; completing a previous page's import must not
// initialize controls or dispatch events against a newer document.
let navigationGeneration = 0;
document.addEventListener("astro:before-preparation", () => { navigationGeneration++; });

function initializeFeatures() {
 const generation = navigationGeneration;
 const pathname = location.pathname;
 const isCurrent = () => generation === navigationGeneration && location.pathname === pathname;
 void whenTransitionSettled().then(() => {
  if (!isCurrent()) return;
  if (document.querySelector("[data-song-card]")) {
   void import("./song-card.js").then(() => {
    if (isCurrent() && document.querySelector("[data-song-card]")) (window as any).__songCardInit?.();
   }).catch(() => {});
  }
  if (document.querySelector(".mermaid[data-mermaid-code]")) {
   void import("../plugins/mermaid-render-script.js").then(() => {
    if (isCurrent() && document.querySelector(".mermaid[data-mermaid-code]")) {
     document.dispatchEvent(new Event("twilight:page:loaded"));
    }
   }).catch(() => {});
  }
 }, () => { /* A cancelled transition must not activate stale content. */ });
}

document.addEventListener("astro:page-load", initializeFeatures);
window.addEventListener("content-decrypted", initializeFeatures);
initializeFeatures();
