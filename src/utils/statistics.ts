export type TimeScale = 'year' | 'month' | 'day';
export type ActivityCounts = Record<string, number>;
export function buildActivitySeries(activity: ActivityCounts, scale: TimeScale, now = new Date()) {
    const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const sum = (prefix: string) => Object.entries(activity).reduce((count, [day, value]) => count + (day.startsWith(prefix) ? value : 0), 0);
    if (scale === 'year') {
        const years = Object.keys(activity).map(day => Number(day.slice(0, 4))).filter(Number.isFinite);
        const start = Math.min(now.getFullYear() - 4, ...years);
        return Array.from({ length: now.getFullYear() - start + 1 }, (_, i) => {
            const key = String(start + i); return { key, label: key, count: sum(key) };
        });
    }
    return Array.from({ length: scale === 'month' ? 12 : 30 }, (_, i) => {
        const date = scale === 'month' ? new Date(now.getFullYear(), now.getMonth() - 11 + i, 1) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i);
        const key = dateKey(date).slice(0, scale === 'month' ? 7 : 10);
        return { key, label: scale === 'month' ? date.toLocaleDateString('en', { month: 'short' }) : String(date.getDate()), count: sum(key) };
    });
}
