<script lang="ts">
import { buildActivitySeries, type ActivityCounts, type TimeScale } from '@utils/statistics';
let { activity = {}, categories = [], class: className = '', style = '' }: {
    activity: ActivityCounts; categories: {name: string; count: number; url: string}[]; class?: string; style?: string;
} = $props();
let scale = $state<TimeScale>('year');
const series = $derived(buildActivitySeries(activity, scale));
const maximum = $derived(Math.max(1, ...series.map(point => point.count)));
const points = $derived(series.map((point, index) => ({ ...point, x: 14 + index * (232 / Math.max(1, series.length - 1)), y: 136 - point.count / maximum * 104 })));
const line = $derived(points.map(point => `${point.x},${point.y}`).join(' '));
const categoryList = $derived([...categories].sort((a,b) => b.count - a.count));
const categoryMax = $derived(Math.max(1, ...categories.map(category => category.count)));
const total = $derived(Object.values(activity).reduce((sum, value) => sum + value, 0));
</script>
<section id="statistics" class={`card-base statistics ${className}`} {style} aria-labelledby="statistics-title">
    <h2 id="statistics-title">Statistics <span>{total} posts</span></h2>
    <div class="activity-heading">
        <h3>Activities</h3>
        <label><span class="sr-only">Activity period</span>
            <select aria-label="Activity period" bind:value={scale}>
                <option value="year">Year</option><option value="month">Month</option><option value="day">Day</option>
            </select>
        </label>
    </div>
    <svg viewBox="0 0 260 168" role="img" aria-label={`Posts by ${scale}`}>
        <title>Posts by {scale}</title>
        <defs><linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--primary)" stop-opacity=".26"/><stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
        {#each [32,84,136] as y}<line x1="14" y1={y} x2="246" y2={y} stroke="currentColor" opacity=".1" stroke-dasharray="3 4" />{/each}
        <polygon points={`14,136 ${line} 246,136`} fill="url(#activity-fill)" />
        <polyline points={line} fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        {#each points as point, index}
            <circle cx={point.x} cy={point.y} r="3" fill="var(--primary)"><title>{point.key}: {point.count} posts</title></circle>
            {#if index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 5) === 0}
                <text x={point.x} y="158" text-anchor="middle">{point.label}</text>
            {/if}
        {/each}
    </svg>
    <details class="activity-data"><summary>View activity counts</summary><ul>{#each series as point}<li><span>{point.key}</span><span>{point.count}</span></li>{/each}</ul></details>
    {#if categoryList.length > 0}
        <h3 class="categories-title">Categories</h3>
        <ul class="category-bars">
            {#each categoryList as category}
                <li><a href={category.url}><span>{category.name}</span><span>{category.count}</span></a>
                    <div class="bar-track" aria-hidden="true"><div class="bar" style={`width:${category.count / categoryMax * 100}%`}></div></div>
                </li>
            {/each}
        </ul>
    {/if}
</section>
<style>
.statistics { padding: 1.1rem 1rem 1.2rem; color: rgb(255 255 255 / .82); }
h2 { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin: 0 0 1.5rem; font-size: 1.05rem; font-weight: 600; }
h2 span { font-size: .75rem; font-weight: 400; opacity: .55; }
h3 { font-size: .85rem; font-weight: 600; margin: 0; }
.activity-heading { display: flex; align-items: center; justify-content: space-between; }
select { background: var(--btn-regular-bg); color: inherit; font-size: .75rem; border-radius: .4rem; padding: .2rem .4rem; border: 1px solid rgb(255 255 255 / .08); }
svg { display: block; width: 100%; height: auto; margin-top: .5rem; }
text { font-size: 10px; fill: currentColor; opacity: .6; }
.activity-data { font-size: .7rem; opacity: .65; margin-block: .2rem 1rem; }
summary { cursor: pointer; }
.activity-data ul { max-height: 10rem; overflow: auto; padding: .5rem; }
.activity-data li { display: flex; justify-content: space-between; padding: .2rem 0; }
.categories-title { margin-bottom: 1rem; }
.category-bars { display: grid; gap: .9rem; padding: 0; list-style: none; }
.category-bars a { display: flex; justify-content: space-between; align-items: baseline; gap: .7rem; font-size: .8rem; margin-bottom: .35rem; }
.category-bars a:hover { color: var(--primary); }
.bar-track { height: 5px; background: rgb(255 255 255 / .05); border-radius: 5px; overflow: hidden; }
.bar { height: 100%; background: var(--primary); opacity: .8; border-radius: inherit; }
</style>
