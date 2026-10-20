interface ListSource {
    id: string;
    data: {
        title: string;
        published: Date;
        category?: string | string[] | null;
        tags: string[];
        routeName?: string;
    };
}

// An allowlist prevents private frontmatter from reaching hydrated islands.
export function toPublicPostListItem(post: ListSource) {
    return {
        id: post.id,
        data: {
            title: post.data.title,
            published: post.data.published,
            category: post.data.category,
            tags: [...post.data.tags],
            routeName: post.data.routeName,
        },
    };
}
