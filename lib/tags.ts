export function normalizeTag(tag: string) {
    return tag.trim().toLocaleLowerCase();
}

export function decodeTagParam(tag: string) {
    try {
        return decodeURIComponent(tag).trim();
    } catch {
        return tag.trim();
    }
}

export function getTagHref(tag: string) {
    return `/tags/${encodeURIComponent(tag.trim())}`;
}

export function filterPostsByTag(posts: BlogPost[], tag: string) {
    const normalizedTag = normalizeTag(tag);

    return posts.filter((post) =>
        post.keywords.some((keyword) => normalizeTag(keyword) === normalizedTag),
    );
}

export function getAllTags(posts: BlogPost[]) {
    return Array.from(
        new Set(posts.flatMap((post) => post.keywords.map((keyword) => keyword.trim()).filter(Boolean))),
    ).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}