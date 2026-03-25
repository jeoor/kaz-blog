function normalizeSearchText(value: string): string {
    return value.trim().toLocaleLowerCase("zh-CN");
}

function buildPostSearchText(post: BlogPost): string {
    return [post.title, post.description, post.author, post.id, ...(post.keywords || [])]
        .join("\n")
        .toLocaleLowerCase("zh-CN");
}

export function searchPosts(posts: BlogPost[], query: string): BlogPost[] {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return posts;

    return posts.filter((post) => buildPostSearchText(post).includes(normalizedQuery));
}

export function getNormalizedSearchQuery(query: string | null | undefined): string {
    return normalizeSearchText(query || "");
}
