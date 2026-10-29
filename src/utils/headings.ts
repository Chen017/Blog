export function getPageHeadings() {
 return Array.from(document.querySelectorAll('#content-wrapper :is(h1,h2,h3,h4,h5,h6)')).filter(h => h.id).map(h => ({depth: Number(h.tagName.slice(1)), slug:h.id, text:(h.textContent || '').replace(/#+\s*$/, '')}));
}
