<script lang="ts">
import { onMount, tick } from "svelte";
import Icon from "@iconify/svelte/dist/OfflineIcon.svelte";
import type { IconifyIcon } from "@iconify/svelte";
import { bindPanelLifecycle } from "@utils/panel-lifecycle";
import type { SearchResult } from "@/global";
import { loadSearchIndex } from '@utils/search-index';

let { icons }: { icons: Record<string, IconifyIcon> } = $props();
let open = $state(false);
let keyword = $state("");
let results: SearchResult[] = $state([]);
let indexState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
let searching = $state(false);
let searched = $state(false);
let queryError = $state(false);
let version = 0;
let indexRequest = 0;

const initializeSearch = async () => {
    if (indexState === 'ready') return;
    if (import.meta.env.DEV) { indexState = 'error'; return; }
    const request = ++indexRequest;
    indexState = 'loading';
    try {
        await loadSearchIndex();
        if (request === indexRequest) indexState = 'ready';
    } catch {
        if (request === indexRequest) indexState = 'error';
    }
};

const close = () => { open = false; keyword = ''; results = []; version++; };
const toggle = async () => {
    if (open) { close(); return; }
    open = true;
    await tick();
    document.getElementById('search-input')?.focus();
    void initializeSearch();
};
onMount(() => {
    const unbind = bindPanelLifecycle({ isOpen: () => open, close, triggerId: 'search-switch' });
    const outside = (event: MouseEvent) => {
        const inside = event.composedPath().some(target => target instanceof Element && (target.id === 'search-panel' || target.id === 'search-switch'));
        if (open && !inside) close();
    };
    document.addEventListener('click', outside);
    return () => {
        version++; indexRequest++; unbind();
        document.removeEventListener('click', outside);
    };
});
$effect(() => {
    const query = keyword.trim();
    const active = open;
    const usable = indexState === 'ready';
    const request = ++version;
    results = []; searched = false; queryError = false;
    searching = active && usable && !!query;
    if (!active || !usable || !query) return;
    const timer = window.setTimeout(async () => {
        try {
            const response = await window.pagefind.search(query);
            const next = await Promise.all(response.results.slice(0, 20).map(item => item.data()));
            if (request !== version) return;
            results = next; searched = true;
        } catch {
            if (request === version) queryError = true;
        } finally { if (request === version) searching = false; }
    }, 220);
    return () => clearTimeout(timer);
});
</script>

<button id="search-switch" aria-label="Search" aria-expanded={open} aria-controls="search-panel"
    onclick={toggle} class="btn-plain scale-animation rounded-lg w-11 h-11 active:scale-90">
    <Icon icon={icons["material-symbols:search"]} class="text-[1.25rem]" />
</button>
<section id="search-panel" aria-label="Site search" aria-hidden={!open} inert={!open}
    class="card-base float-panel search-panel absolute top-20 left-4 md:left-auto right-4 p-3 z-50"
    class:float-panel-closed={!open}>
    <label class="search-field" for="search-input">
        <Icon icon={icons["material-symbols:search"]} class="text-xl shrink-0" />
        <input id="search-input" aria-label="Search" type="search" autocomplete="off" placeholder="Search posts" bind:value={keyword} />
    </label>
    <div class="search-status" role="status" aria-live="polite" aria-atomic="true">
        {#if indexState === 'loading'}Loading search index…
        {:else if indexState === 'error'}{import.meta.env.DEV ? 'Search is available in the production preview.' : 'Search could not load.'}
        {:else if queryError}Search failed. Try another query or refresh the page.
        {:else if searching}Searching…
        {:else if searched && results.length === 0}No posts found for “{keyword.trim()}”.
        {:else if searched}{results.length} {results.length === 1 ? 'result' : 'results'}
        {:else}Search titles and article content.
        {/if}
    </div>
    {#if indexState === 'error' && !import.meta.env.DEV}
        <button type="button" class="btn-regular rounded-lg px-3 py-2 text-sm" onclick={() => { document.getElementById('search-input')?.focus(); void initializeSearch(); }}>Retry loading search</button>
    {/if}
    <div aria-busy={searching}>
        {#each results as item}
            <a href={item.url} class="search-result" onclick={close}>
                <span class="search-result-title">{item.meta.title}</span>
                <span class="search-result-excerpt">{@html item.excerpt}</span>
            </a>
        {/each}
    </div>
</section>
<style>
:global(.search-panel) { width: min(30rem, calc(100vw - 2rem)); max-height: min(70vh, 36rem); overflow-y: auto; }
.search-field { display: flex; gap: .65rem; align-items: center; padding: .7rem .8rem; border-radius: .65rem; background: rgb(255 255 255 / .06); color: var(--primary); }
input { flex: 1; width: 0; min-width: 0; color: rgb(255 255 255 / .9); background: transparent; outline-offset: 6px; font-size: .95rem; }
input::placeholder { color: rgb(255 255 255 / .45); }
.search-status { padding: .8rem .5rem .45rem; font-size: .8rem; color: rgb(255 255 255 / .65); }
.search-result { display: flex; flex-direction: column; gap: .35rem; padding: .8rem .65rem; border-radius: .65rem; transition: background-color 140ms ease; }
.search-result:hover { background: var(--btn-plain-bg-hover); }
.search-result-title { font-size: .95rem; font-weight: 600; color: rgb(255 255 255 / .9); overflow-wrap: anywhere; }
.search-result-excerpt { font-size: .85rem; line-height: 1.6; color: rgb(255 255 255 / .65); }
</style>
