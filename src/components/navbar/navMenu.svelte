<script lang="ts">
import Icon from "@iconify/svelte/dist/OfflineIcon.svelte";
import type { IconifyIcon } from "@iconify/svelte";
import { onMount } from "svelte";

import type { NavbarLink } from "@/types/config";
import { url } from "@utils/url";
import { onClickOutside } from "@utils/widget";
import { bindPanelLifecycle } from "@utils/panel-lifecycle";


interface Props {
    links: NavbarLink[];
    icons: Record<string, IconifyIcon>;
}

let { links, icons }: Props = $props();
let isOpen = $state(false);

function togglePanel() {
    isOpen = !isOpen;
}

// 点击外部关闭面板
function handleClickOutside(event: MouseEvent) {
    if (!isOpen) return;
    onClickOutside(event, "nav-menu-panel", "nav-menu-switch", () => {
        isOpen = false;
    });
}

onMount(() => {
    const unbind = bindPanelLifecycle({ isOpen: () => isOpen, close: () => { isOpen = false; }, triggerId: "nav-menu-switch" });
    document.addEventListener("click", handleClickOutside);
    return () => {
        unbind();
        document.removeEventListener("click", handleClickOutside);
    };
});
</script>

<div class="relative md:hidden">
    <button aria-label="Menu" name="Nav Menu" class="btn-plain scale-animation rounded-lg w-11 h-11 active:scale-90" 
        id="nav-menu-switch"
        aria-expanded={isOpen}
        aria-controls="nav-menu-panel"
        onclick={togglePanel}
    >
        <Icon icon={icons["material-symbols:menu-rounded"]} class="text-[1.25rem]"></Icon>
    </button>
    <div id="nav-menu-panel" 
        inert={!isOpen}
        aria-hidden={!isOpen}
        class="float-panel fixed transition-all right-4 px-2 py-2 max-h-[80vh] overflow-y-auto"
        class:float-panel-closed={!isOpen}
    >
        {#each links as link}
            <div class="mobile-menu-item">
                <a href={link.external ? link.url : url(link.url)} 
                    onclick={() => { isOpen = false; }}
                    class="group flex justify-between items-center py-2 pl-3 pr-1 rounded-lg gap-8 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active) transition"
                    target={link.external ? "_blank" : null}
                >
                    <div class="flex items-center transition text-black/75 dark:text-white/75 font-bold group-hover:text-(--primary) group-active:text-(--primary)">
                        {#if link.icon}
                            <Icon icon={icons[link.icon]} class="text-[1.1rem] mr-2" />
                        {/if}
                        {link.name}
                    </div>
                    {#if !link.external}
                        <Icon icon={icons["material-symbols:chevron-right-rounded"]} class="transition text-[1.25rem] text-(--primary)" />
                    {:else}
                        <Icon icon={icons["fa6-solid:arrow-up-right-from-square"]} class="transition text-[0.75rem] text-black/25 dark:text-white/25 -translate-x-1" />
                    {/if}
                </a>
            </div>
        {/each}
    </div>
</div>
