let finished: Promise<unknown> = Promise.resolve();
document.addEventListener('astro:before-swap', event => { finished = (event as Event & {viewTransition?: ViewTransition}).viewTransition?.finished.catch(() => {}) ?? Promise.resolve(); });
function initializeFeatures() { void finished.then(() => {
 if (document.querySelector('[data-song-card]')) void import('./song-card.js').then(() => (window as any).__songCardInit?.()).catch(() => {});
 if (document.querySelector('.mermaid[data-mermaid-code]')) void import('../plugins/mermaid-render-script.js').then(() => document.dispatchEvent(new Event('twilight:page:loaded'))).catch(() => {});
}); }
document.addEventListener('astro:page-load', initializeFeatures);
window.addEventListener('content-decrypted', initializeFeatures);
initializeFeatures();
