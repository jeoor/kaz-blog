import { isNotionEnabled } from "@/lib/notion";
import { getSortedPostsDataLocal, getPostDataLocal } from "@/lib/posts-local";
import { getPostDataNotion, getSortedPostsDataNotion } from "@/lib/posts-notion";

export async function getSortedPostsData(): Promise<BlogPost[]> {
    if (isNotionEnabled()) {
        return getSortedPostsDataNotion();
    }
    return getSortedPostsDataLocal();
}

export async function getPostData(id: string): Promise<BlogPost & { contentHtml: string; toc: PostTocItem[] }> {
    if (isNotionEnabled()) {
        return getPostDataNotion(id);
    }
    return getPostDataLocal(id);
}
