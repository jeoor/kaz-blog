import { isNotionEnabled } from "@/lib/notion";
import { getSortedPostsDataLocal, getPostDataLocal } from "@/lib/posts-local";
import { getPostDataNotion, getSortedPostsDataNotion } from "@/lib/posts-notion";

export async function getSortedPostsData(): Promise<BlogPost[]> {
    if (isNotionEnabled()) {
        try {
            return await getSortedPostsDataNotion();
        } catch (error) {
            console.error("[posts] Failed to fetch posts from Notion; falling back to local posts.", error);
        }
    }

    try {
        return getSortedPostsDataLocal();
    } catch (error) {
        console.error("[posts] Failed to fetch posts from local filesystem; returning an empty list.", error);
        return [];
    }
}

export async function getPostData(id: string): Promise<BlogPost & { contentHtml: string; toc: PostTocItem[] }> {
    if (isNotionEnabled()) {
        try {
            return await getPostDataNotion(id);
        } catch (error) {
            console.error(`[posts] Failed to fetch post '${id}' from Notion; falling back to local posts.`, error);
        }
    }

    return getPostDataLocal(id);
}
