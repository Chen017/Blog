<script lang="ts">
import { onMount } from "svelte";

import { getPostUrl } from "@utils/url";
import { getCategoryPathLabel, getCategoryPathParts } from "@utils/category";
import { i18n } from "@i18n/translation";
import I18nKey from "@i18n/i18nKey";


interface Post {
    id: string;
    data: {
        title: string;
        category?: string | string[] | null;
        published: Date | string;
        routeName?: string;
    };
}

interface Group {
    year: number;
    posts: Post[];
}

interface Props {
    sortedPosts?: Post[];
}

let { sortedPosts = [] }: Props = $props();

let categories = $state<string[]>([]);
let uncategorized = $state<string | null>(null);

onMount(() => {
    const params = new URLSearchParams(window.location.search);
    categories = params.has("category") ? params.getAll("category") : [];
    uncategorized = params.get("uncategorized");
});

function formatDate(date: Date | string) {
    const d = new Date(date);
    const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = d.getUTCDate().toString().padStart(2, "0");
    return `${month}-${day}`;
}


function isCategoryMatch(category: string | string[] | null | undefined, targets: string[]) {
    const postParts = getCategoryPathParts(category);
    if (!postParts || postParts.length === 0) return false;
    return targets.some((target) => {
        const targetParts = target
            .split(" / ")
            .map((part) => part.trim())
            .filter((part) => part.length > 0);
        if (targetParts.length === 0) return false;
        if (targetParts.length > postParts.length) return false;
        return targetParts.every((part, index) => part === postParts[index]);
    });
}

let groups = $derived.by(() => {
    let filteredPosts = sortedPosts.map((post) => ({
        ...post,
        data: {
            ...post.data,
            published: new Date(post.data.published),
        },
    }));

    if (categories.length > 0) {
        filteredPosts = filteredPosts.filter(
            (post) => isCategoryMatch(post.data.category, categories),
        );
    }

    if (uncategorized !== null) {
        filteredPosts = filteredPosts.filter((post) => !getCategoryPathLabel(post.data.category));
    }

    // 按发布时间倒序排序，确保不受置顶影响
    filteredPosts = filteredPosts.slice().sort((a, b) => b.data.published.getTime() - a.data.published.getTime());

    const grouped = filteredPosts.reduce(
        (acc, post) => {
            const year = post.data.published.getUTCFullYear();
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(post);
            return acc;
        },
        {} as Record<number, Post[]>,
    );

    const groupedPostsArray = Object.keys(grouped).map((yearStr) => ({
        year: Number.parseInt(yearStr, 10),
        posts: grouped[Number.parseInt(yearStr, 10)],
    }));

    groupedPostsArray.sort((a, b) => b.year - a.year);

    return groupedPostsArray;
});

let categoryOptions = $derived([...new Set(sortedPosts.map(post => getCategoryPathLabel(post.data.category)).filter(Boolean))] as string[]);
let hasUncategorized = $derived(sortedPosts.some(post => !getCategoryPathLabel(post.data.category)));
function chooseCategory(name: string | null) {
    categories = name && name !== "__uncategorized" ? [name] : [];
    uncategorized = name === "__uncategorized" ? "true" : null;
    const address = new URL(window.location.href);
    address.searchParams.delete("category"); address.searchParams.delete("uncategorized");
    if (categories[0]) address.searchParams.set("category", categories[0]);
    if (uncategorized) address.searchParams.set("uncategorized", "true");
    history.replaceState(null, "", address);
}
</script>
<div class="archive-filters" role="group" aria-label="Filter archive">
    <button type="button" aria-pressed={categories.length === 0 && uncategorized === null} onclick={() => chooseCategory(null)}>Everything <span>{sortedPosts.length}</span></button>
    {#each categoryOptions as category}<button type="button" aria-pressed={categories.includes(category)} onclick={() => chooseCategory(category)}>{category === "Recommended Projects" ? "Discoveries" : category}</button>{/each}
    {#if hasUncategorized}<button type="button" aria-pressed={uncategorized !== null} onclick={() => chooseCategory("__uncategorized")}>Uncategorized</button>{/if}
</div>
<p class="archive-count" role="status">{groups.reduce((sum, group) => sum + group.posts.length, 0)} entries</p>
{#each groups as group}
    <section class="archive-year" aria-label={String(group.year)}><header><h2>{group.year}</h2><span>{group.posts.length} {group.posts.length === 1 ? "entry" : "entries"}</span></header><div>{#each group.posts as post}<a class="archive-entry" href={getPostUrl(post)}><time datetime={new Date(post.data.published).toISOString()}>{formatDate(post.data.published)}</time><span class="archive-title">{post.data.title}</span><span class="archive-category">{getCategoryPathLabel(post.data.category) || "Uncategorized"}</span><span aria-hidden="true">↗</span></a>{/each}</div></section>
{:else}<p class="archive-empty">No entries match this category. <button type="button" onclick={() => chooseCategory(null)}>Show all writing</button></p>{/each}
<style>
.archive-filters{display:flex;gap:12px 28px;flex-wrap:wrap;padding:0 0 15px;border-bottom:1px solid #a7bedb26}.archive-filters button{position:relative;padding:10px 0;color:#91a3bd;font-size:12px;min-height:44px}.archive-filters button[aria-pressed=true]{color:#e1e7ee}.archive-filters button[aria-pressed=true]::after{content:"";position:absolute;left:0;right:0;bottom:3px;height:1px;background:#b3d3cd}.archive-filters span{font-size:11px;margin-left:7px;color:#8394ad}.archive-count{font:11px/1.5 Consolas,monospace;color:#91a3bd;margin:20px 0 32px}.archive-year{display:grid;grid-template-columns:130px minmax(0,1fr);gap:32px;margin:0 0 50px}.archive-year header{padding-top:15px}.archive-year h2{font:400 60px/1 var(--font-voyage-serif),Georgia,serif!important;color:#cad0df;letter-spacing:-1px;margin:0 0 12px!important}.archive-year header>span{color:#8394ad;font-size:11px}.archive-entry{display:grid;grid-template-columns:52px minmax(0,1fr) 130px 14px;align-items:center;gap:20px;min-height:72px;padding:20px 0;border-bottom:1px solid #a7bedb20;transition:color 180ms,background 180ms}.archive-entry time{font:11px/1.5 Consolas,monospace;color:#8e9eb9}.archive-title{font-size:16px;line-height:1.6;overflow-wrap:anywhere}.archive-category{color:#8293b0;font-size:11px}.archive-entry:hover .archive-title{color:#badcd3}.archive-entry>span:last-child{color:#91a3bd}.archive-empty{margin:50px 0;color:#a9b4cb}.archive-empty button{text-decoration:underline;color:#c0ded5;padding:8px}@media(max-width:820px){.archive-year{grid-template-columns:95px minmax(0,1fr);gap:22px}.archive-category{display:none}.archive-entry{grid-template-columns:45px minmax(0,1fr) 14px;gap:15px}}@media(max-width:570px){.archive-year{display:block;margin-bottom:35px}.archive-year header{display:flex;gap:18px;align-items:baseline;padding-top:0;margin:25px 0 8px}.archive-year h2{font-size:47px!important}.archive-title{font-size:15px}.archive-entry{gap:12px;min-height:72px}.archive-filters{gap:5px 23px}.archive-count{margin-bottom:22px}}
</style>
