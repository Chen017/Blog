export interface UmamiStats { pageviews: number; visitors: number; visits: number; }

// This client is used only while generating static HTML. Only numeric counts
// leave it; neither credentials nor authenticated API responses are serialized.
export function createUmamiStatsClient(options: { baseUrl: string; websiteId: string; apiKey: string }, request: typeof fetch = fetch) {
    const cache = new Map<string, Promise<UmamiStats | null>>();
    return (pagePath = ""): Promise<UmamiStats | null> => {
        if (!cache.has(pagePath)) cache.set(pagePath, (async () => {
            if (!options.baseUrl || !options.websiteId || !options.apiKey) return null;
            try {
                const base = new URL(options.baseUrl.replace(/\/$/, '') + '/');
                if (base.protocol !== 'https:') return null;
                const target = new URL(`v1/websites/${encodeURIComponent(options.websiteId)}/stats`, base);
                target.search = new URLSearchParams({ startAt: '0', endAt: String(Date.now()), ...(pagePath ? { url: pagePath } : {}) }).toString();
                const response = await request(target, { headers: { Authorization: `Bearer ${options.apiKey}` }, signal: AbortSignal.timeout(10000), redirect: 'error' });
                if (!response.ok) return null;
                const data = await response.json();
                const count = (value: unknown): number => {
                    const number = typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
                    return typeof number === 'number' && Number.isFinite(number) && number >= 0 ? number : 0;
                };
                return { pageviews: count(data.pageviews), visitors: count(data.visitors), visits: count(data.visits) };
            } catch { return null; }
        })());
        return cache.get(pagePath)!;
    };
}
