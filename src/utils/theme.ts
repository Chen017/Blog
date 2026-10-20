// This personal blog always uses the dark theme.
export function initTheme(): void {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "github-dark");
    try { localStorage.setItem("theme", "dark"); } catch { /* Storage can be disabled. */ }
}
