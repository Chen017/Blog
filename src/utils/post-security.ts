export function hasValidPostPassword(post: { encrypted?: boolean; password?: string }): boolean {
    return !post.encrypted || Boolean(post.password?.trim());
}

export function publicPostDescription(post: { encrypted?: boolean; description?: string }, excerpt = ""): string {
    return post.description || (post.encrypted ? "This content is password protected." : excerpt);
}
