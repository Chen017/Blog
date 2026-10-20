import { url } from './url';
import { createRetryableLoader } from './lazy-resource';

export const loadSearchIndex = createRetryableLoader(async attempt => {
    const scriptUrl = url('/pagefind/pagefind.js') + (attempt ? `?retry=${attempt}` : '');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        const pagefind = await Promise.race([
            import(/* @vite-ignore */ scriptUrl),
            new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Search loading timed out')), 10000); }),
        ]);
        await pagefind.options({ excerptLength: 20 });
        window.pagefind = pagefind;
        return pagefind;
    } finally {
        clearTimeout(timeout);
    }
});
