<script lang="ts">
import { buildActivitySeries, type ActivityCounts, type TimeScale } from '@utils/statistics';
let { activity = {}, categories = [], class: className = '', style = '' }: {
    activity: ActivityCounts; categories: {name: string; count: number; url: string}[]; class?: string; style?: string;
} = $props();
let scale = $state<TimeScale>('year');
const series = $derived(buildActivitySeries(activity, scale));
const maximum = $derived(Math.max(1, ...series.map(point => point.count)));
const points = $derived(series.map((point, index) => ({ ...point, x: 4 + index * (92 / Math.max(1, series.length - 1)), y: 84 - point.count / maximum * 68 })));
const line = $derived(points.map(point => `${point.x},${point.y}`).join(' '));
const categoryList = $derived([...categories].sort((a,b) => b.count - a.count));
const categoryMax = $derived(Math.max(1, ...categories.map(category => category.count)));
const total = $derived(Object.values(activity).reduce((sum, value) => sum + value, 0));
</script>
<section id="statistics" class={`statistics ${className}`} {style} aria-labelledby="statistics-title">
    <h2 id="statistics-title">Writing activity <span>{total} entries</span></h2>
    <div class="stats-columns">
        <div class="stats-history">
            <div class="activity-heading">
                <h3>Published over time</h3>
                <label><span class="sr-only">Activity period</span><select aria-label="Activity period" bind:value={scale}><option value="year">Year</option><option value="month">Month</option><option value="day">Day</option></select></label>
            </div>
            <div class="activity-plot" role="img" aria-label={`Posts by ${scale}`}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <defs><linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--primary)" stop-opacity=".12"/><stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
                    {#each [16,50,84] as y}<line x1="4" y1={y} x2="96" y2={y} stroke="currentColor" opacity=".1" stroke-dasharray="3 5" vector-effect="non-scaling-stroke" />{/each}
                    <polygon points={`4,84 ${line} 96,84`} fill="url(#activity-fill)" />
                    <polyline points={line} fill="none" stroke="var(--primary)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                </svg>
                {#each points as point}<span class="activity-point" style={`left:${point.x}%;top:${point.y}%`} title={`${point.key}: ${point.count} posts`} aria-hidden="true"></span>{/each}
            </div>
            <div class="activity-axis" aria-hidden="true">{#each points as point,index}{#if index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 5) === 0}<span style={`left:${point.x}%`}>{point.label}</span>{/if}{/each}</div>
            <details class="activity-data"><summary>View activity counts</summary><ul>{#each series as point}<li><span>{point.key}</span><span>{point.count}</span></li>{/each}</ul></details>
        </div>
        {#if categoryList.length > 0}
            <div class="stats-categories"><h3>By subject</h3><ul class="category-bars">{#each categoryList as category}<li><a href={category.url}><span>{category.name === 'Recommended Projects' ? 'Discoveries' : category.name}</span><span>{category.count}</span></a><div class="bar-track" aria-hidden="true"><div class="bar" style={`width:${category.count / categoryMax * 100}%`}></div></div></li>{/each}</ul></div>
        {/if}
    </div>
</section>
<style>
.statistics { container-type: inline-size; color: #b4c0d1; }
h2 { display: flex; align-items: baseline; gap: 14px; font-size: 16px; font-weight: 500; }
h2 span { font: 11px/1.5 Consolas,monospace; color: #8e9eb9; }
.stats-columns { display: grid; grid-template-columns: minmax(0,1.65fr) minmax(0,1fr); gap: 64px; }
.stats-history,.stats-categories { min-width: 0; }
h3 { font-size: 12px; font-weight: 400; color: #a9b4cb; }
.activity-heading { display: flex; align-items: center; justify-content: space-between; min-height: 36px; gap: 16px; }
select { background: #111a2b; color: inherit; font-size: 12px; border-radius: 4px; padding: 5px 10px; border: 1px solid #a7bedb26; min-height: 36px; }
.activity-plot { position: relative; height: 124px; margin-top: 12px; }
.activity-plot svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.activity-point { position: absolute; width: 5px; height: 5px; translate: -50% -50%; border-radius: 50%; background: var(--primary); }
.activity-axis { position: relative; height: 24px; font: 11px/1.5 Consolas,monospace; color: #899ab3; }
.activity-axis span { position: absolute; translate: -50% 0; white-space: nowrap; }
.activity-data { font-size: 11px; color: #899ab3; margin-top: 7px; }
summary { cursor: pointer; padding: 6px 0; width: max-content; max-width: 100%; }
.activity-data ul { max-height: 160px; overflow: auto; padding: 10px 0; margin: 0; }
.activity-data li { display: flex; justify-content: space-between; padding: 4px 0; font: 11px/1.5 Consolas,monospace; }
.stats-categories > h3 { display: flex; align-items: center; min-height: 36px; }
.category-bars { display: grid; gap: 22px; margin: 20px 0 0; padding: 0; list-style: none; }
.category-bars a { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; font-size: 12px; margin-bottom: 9px; }
.category-bars a span:last-child { font: 11px/1.5 Consolas,monospace; color: #9ebfb9; }
.category-bars a:hover { color: var(--primary); }
.bar-track { height: 3px; background: #a7bedb18; border-radius: 3px; overflow: hidden; }
.bar { height: 100%; background: var(--primary); opacity: .65; border-radius: inherit; }
@container(max-width:720px) { .stats-columns { grid-template-columns: 1fr; gap: 28px; } }
@media(pointer:coarse) { select,summary { min-height: 44px; } }
</style>
