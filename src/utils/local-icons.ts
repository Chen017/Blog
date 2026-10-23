// Build-time only: serialize just the icons used by each navbar island.
import material from "@iconify-json/material-symbols/icons.json";
import solid from "@iconify-json/fa6-solid/icons.json";
import regular from "@iconify-json/fa6-regular/icons.json";
import brands from "@iconify-json/fa6-brands/icons.json";
import mdi from "@iconify-json/mdi/icons.json";
import type { IconifyIcon } from "@iconify/svelte";

type Collection = { width?: number; height?: number; icons: Record<string, IconifyIcon> };
const collections: Record<string, Collection> = {
    "material-symbols": material, "fa6-solid": solid,
    "fa6-regular": regular, "fa6-brands": brands, mdi,
};

export function localIcons(names: string[]): Record<string, IconifyIcon> {
    return Object.fromEntries([...new Set(names)].map(name => {
        const [prefix, key] = name.split(":");
        const collection = collections[prefix];
        const icon = collection?.icons[key];
        if (!icon) throw new Error(`Navbar icon must exist in a locally installed icon set: ${name}`);
        return [name, { width: collection.width ?? 16, height: collection.height ?? 16, ...icon }];
    }));
}
