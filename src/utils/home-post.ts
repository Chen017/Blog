import { getCategoryPathLabel } from "./category.ts";
import { publicPostDescription } from "./post-security.ts";

interface HomePostSource {
	title: string;
	description?: string;
	displayTitle?: string;
	displayDescription?: string;
	category?: string | string[] | null;
	encrypted?: boolean;
}

export function homePostCopy(data: HomePostSource) {
	return {
		title: data.displayTitle?.trim() || data.title,
		description: publicPostDescription({
			encrypted: data.encrypted,
			description: data.displayDescription?.trim() || data.description,
		}),
		category: getCategoryPathLabel(data.category) || "Uncategorized",
	};
}

export function compareHomeEntries(
	a: { date: string; pinned: boolean },
	b: { date: string; pinned: boolean },
	oldestFirst = false,
) {
	if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
	return oldestFirst
		? a.date.localeCompare(b.date)
		: b.date.localeCompare(a.date);
}
