<script lang="ts">
import { onMount, onDestroy, tick } from "svelte";
import { bindPanelLifecycle } from "@utils/panel-lifecycle";
import Icon from "@iconify/svelte";

import type { SearchResult } from "@/global";
import { url } from "@utils/url";
import { navigateToPage } from "@utils/navigation";
import { onClickOutside } from "@utils/widget";
import { i18n } from "@i18n/translation";
import I18nKey from "@i18n/i18nKey";
import DropdownPanel from "@/components/common/DropdownPanel.svelte";


let keywordDesktop = $state("");
let keywordMobile = $state("");
let result: SearchResult[] = $state([]);
let isSearching = $state(false);
let pagefindLoaded = false;
let initialized = $state(false);
let isDesktopSearchExpanded = $state(false);
let panelOpen = $state(false);
let requestVersion = 0;
let disposed = false;
let debounceTimer: NodeJS.Timeout;

const fakeResult: SearchResult[] = [
    {
        url: url("/"),
        meta: {
            title: "This Is a Fake Search Result",
        },
        excerpt:
            "Because the search cannot work in the <mark>dev</mark> environment.",
    },
    {
        url: url("/"),
        meta: {
            title: "If You Want to Test the Search",
        },
        excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
    },
];

const togglePanel = () => {
    panelOpen = !panelOpen;
    if (panelOpen) tick().then(() => document.getElementById("search-input-mobile")?.focus());
};

const toggleDesktopSearch = () => {
    isDesktopSearchExpanded = !isDesktopSearchExpanded;
    if (isDesktopSearchExpanded) {
        tick().then(() => {
            const input = document.getElementById("search-input-desktop") as HTMLInputElement;
            input?.focus();
        });
    }
};

const collapseDesktopSearch = () => {
    if (!keywordDesktop) {
        isDesktopSearchExpanded = false;
    }
};

const handleBlur = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && document.getElementById("search-panel")?.contains(next)) return;
    requestVersion++;
    clearTimeout(debounceTimer);
    isDesktopSearchExpanded = false;
    setPanelVisibility(false, true);
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
    if (isDesktop) panelOpen = show;
};

const closeSearchPanel = (): void => {
    panelOpen = false;
    isDesktopSearchExpanded = false;
    requestVersion++;
    // 清空搜索关键词和结果
    keywordDesktop = "";
    keywordMobile = "";
    result = [];
};

const handleResultClick = (event: Event, url: string): void => {
    event.preventDefault();
    closeSearchPanel();
    navigateToPage(url);
};

const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
    const version = ++requestVersion;
    if (!keyword) {
        setPanelVisibility(false, isDesktop);
        result = [];
        return;
    }
    if (!initialized) {
        return;
    }
    isSearching = true;
    try {
        let searchResults: SearchResult[] = [];
        if (import.meta.env.PROD && pagefindLoaded && window.pagefind) {
            const response = await window.pagefind.search(keyword);
            searchResults = await Promise.all(
                response.results.map((item) => item.data()),
            );
        } else if (import.meta.env.DEV) {
            searchResults = fakeResult;
        } else {
            searchResults = [];
            console.error("Pagefind is not available in production environment.");
        }
        if (disposed || version !== requestVersion) return;
        result = searchResults;
        setPanelVisibility(result.length > 0, isDesktop);
    } catch (error) {
        if (disposed || version !== requestVersion) return;
        console.error("Search error:", error);
        result = [];
        setPanelVisibility(false, isDesktop);
    } finally {
        if (!disposed && version === requestVersion) isSearching = false;
    }
};

const handleClickOutside = (event: MouseEvent) => {
    if (!panelOpen) {
        return;
    }
    onClickOutside(event, "search-panel", ["search-switch", "search-bar"], () => {
        requestVersion++;
        clearTimeout(debounceTimer);
        panelOpen = false;
        isDesktopSearchExpanded = false;
    });
};

onMount(() => {
    const unbind = bindPanelLifecycle({
        isOpen: () => panelOpen || isDesktopSearchExpanded,
        close: closeSearchPanel,
        triggerId: () => window.innerWidth >= 1280 ? "search-bar" : "search-switch",
    });
    document.addEventListener("click", handleClickOutside);
    const initializeSearch = () => {
        initialized = true;
        pagefindLoaded =
            typeof window !== "undefined" &&
            !!window.pagefind &&
            typeof window.pagefind.search === "function";
        console.log("Pagefind status on init:", pagefindLoaded);
    };
    const onReady = () => initializeSearch();
    const onError = () => initializeSearch();
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if (import.meta.env.DEV) {
        console.log(
            "Pagefind is not available in development mode. Using mock data.",
        );
        initializeSearch();
    } else {
        document.addEventListener("pagefindready", onReady);
        document.addEventListener("pagefindloaderror", onError);
        // Fallback in case events are not caught or pagefind is already loaded by the time this script runs
        fallbackTimer = setTimeout(() => {
            if (!initialized) {
                console.log("Fallback: Initializing search after timeout.");
                initializeSearch();
            }
        }, 2000); // Adjust timeout as needed
    }
    return () => {
        unbind();
        clearTimeout(fallbackTimer);
        document.removeEventListener("pagefindready", onReady);
        document.removeEventListener("pagefindloaderror", onError);
    };
});

$effect(() => {
    if (initialized) {
        const keyword = keywordDesktop || keywordMobile;
        const isDesktop = !!keywordDesktop || isDesktopSearchExpanded;
        
        requestVersion++;
        clearTimeout(debounceTimer);
        if (keyword) {
            debounceTimer = setTimeout(() => {
                search(keyword, isDesktop);
            }, 300);
        } else {
            requestVersion++;
            result = [];
            setPanelVisibility(false, isDesktop);
        }
    }
});

$effect(() => {
    if (typeof document !== 'undefined') {
        const navbar = document.getElementById('navbar');
        if (isDesktopSearchExpanded) {
            navbar?.classList.add('is-searching');
        } else {
            navbar?.classList.remove('is-searching');
        }
    }
});

onDestroy(() => {
    disposed = true;
    requestVersion++;
    if (typeof document !== 'undefined') {
        document.removeEventListener("click", handleClickOutside);
        const navbar = document.getElementById('navbar');
        navbar?.classList.remove('is-searching');
    }
    clearTimeout(debounceTimer);
});
</script>

<!-- search bar for desktop view (collapsed by default) -->
<div
    id="search-bar"
    class="hidden lg:flex transition-all items-center h-11 rounded-lg
        {isDesktopSearchExpanded ? 'bg-black/4 hover:bg-black/6 focus-within:bg-black/6 dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10' : 'btn-plain scale-animation active:scale-90'}
        {isDesktopSearchExpanded ? 'w-48' : 'w-11'}"
    role="button"
    tabindex="0"
    aria-label="Search"
    aria-expanded={panelOpen || isDesktopSearchExpanded}
    aria-controls="search-panel"
    onkeydown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (!isDesktopSearchExpanded) toggleDesktopSearch(); } }}
    onmouseenter={() => {if (!isDesktopSearchExpanded) toggleDesktopSearch()}}
    onmouseleave={collapseDesktopSearch}
>
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none {isDesktopSearchExpanded ? 'ml-3' : 'left-1/2 -translate-x-1/2'} transition my-auto {isDesktopSearchExpanded ? 'text-black/30 dark:text-white/30' : ''}"></Icon>
    <input id="search-input-desktop" placeholder="{i18n(I18nKey.search)}" bind:value={keywordDesktop}
        tabindex={isDesktopSearchExpanded ? 0 : -1}
        onfocus={() => {if (!isDesktopSearchExpanded) toggleDesktopSearch(); search(keywordDesktop, true)}}
        onblur={handleBlur}
        class="transition-all pl-10 text-sm bg-transparent outline-0
            h-full {isDesktopSearchExpanded ? 'w-36' : 'w-0'} text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button onclick={togglePanel} aria-label="Search Panel" id="search-switch"
        aria-expanded={panelOpen} aria-controls="search-panel"
        class="btn-plain scale-animation lg:hidden! rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<DropdownPanel
        id="search-panel"
        inert={!panelOpen}
        aria-hidden={!panelOpen}
        class="{panelOpen ? '' : 'float-panel-closed'} absolute md:w-120 top-20 left-4 md:left-[unset] right-4 z-50 search-panel"
>
    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/4 hover:bg-black/6 focus-within:bg-black/6
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input id="search-input-mobile" aria-label="Search" placeholder="Search" bind:value={keywordMobile}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>
    <!-- search results -->
    {#each result as item}
        <a href={item.url}
           onclick={(e) => handleResultClick(e, item.url)}
           class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active)">
            <div class="transition text-90 inline-flex font-bold group-hover:text-(--primary)">
                {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-(--primary)"></Icon>
            </div>
            <div class="transition text-sm text-50">
                {@html item.excerpt}
            </div>
        </a>
    {/each}
</DropdownPanel>

<style>
    input:focus {
        outline: 0;
    }
    :global(.search-panel) {
        max-height: calc(100vh - 100px);
        overflow-y: auto;
    }
</style>
