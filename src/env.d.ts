/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare module 'crypto-js';

interface Window {
	__voyageHomeTransition?: {
		id: number;
		from: string;
		finished: Promise<void>;
	} | null;
	__voyageTransitionFinished?: Promise<void> | null;
	__voyageLoadedCovers?: Set<string>;
}
