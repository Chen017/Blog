interface ListSource {
	id: string;
	data: {
		title: string;
		displayTitle?: string;
		published: Date;
		category?: string | string[] | null;
		routeName?: string;
	};
}

// An allowlist prevents private frontmatter from reaching hydrated islands.
export function toPublicPostListItem(post: ListSource) {
	return {
		id: post.id,
		data: {
			title: post.data.displayTitle?.trim() || post.data.title,
			published: post.data.published,
			category: post.data.category,
			routeName: post.data.routeName,
		},
	};
}
