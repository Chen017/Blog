/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

interface Window {
	__voyageHomeTransition?: {
		id: number;
		from: string;
		finished: Promise<void>;
	} | null;
}
