import { umamiConfig } from '@/config';
import { createUmamiStatsClient } from './umami-stats';

// Import this module from Astro frontmatter only.
export const getUmamiStats = createUmamiStatsClient({
    baseUrl: umamiConfig.baseUrl,
    websiteId: umamiConfig.websiteId,
    apiKey: import.meta.env.UMAMI_API_KEY || '',
});
