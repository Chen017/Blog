export function normalizePostRoute(routeName: string): string {
    const clean = routeName.trim().replace(/^\/+|\/+$/g, "").replace(/^posts\//, "");
    if (!clean || clean.split('/').some(part => !part || part === '.' || part === '..') || /[?#\\\u0000-\u001f]/.test(clean)) {
        throw new Error(`Invalid post routeName: ${routeName}`);
    }
    return clean;
}
