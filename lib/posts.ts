import { isNotionEnabled } from "@/lib/notion";
import { getSortedPostsDataLocal, getPostDataLocal } from "@/lib/posts-local";
import { getPostDataNotion, getSortedPostsDataNotion } from "@/lib/posts-notion";

function isBuildLifecycle(): boolean {
    return String(process.env.npm_lifecycle_event || "").trim() === "build";
}

function isNotionDebugEnabled(): boolean {
    return String(process.env.NOTION_DEBUG || "").trim() === "1";
}

function logPostsSourceOnce(source: "notion" | "local"): void {
    if (process.env.NODE_ENV !== "development") return;
    const g = globalThis as any;
    if (g.__kazBlogPostsSourceLogged) return;
    g.__kazBlogPostsSourceLogged = true;
    // Keep it short; this is a diagnostic signal.
    console.log(`[posts] source=${source}`);
}

function warnBuildFallbackOnce(): void {
    if (!isBuildLifecycle()) return;
    const g = globalThis as any;
    if (g.__kazBlogBuildNotionFallbackWarned) return;
    g.__kazBlogBuildNotionFallbackWarned = true;
    console.warn("[posts] Notion 请求在构建期不可用，已回退到本地文章（posts/）。如不希望回退，请检查网络/代理或开启 NOTION_DEBUG=1 看详细原因。 ");
}

export async function getSortedPostsData(): Promise<BlogPost[]> {
    const canTryNotion = isNotionEnabled();
    if (canTryNotion) {
        try {
            const notionPosts = await getSortedPostsDataNotion();
            logPostsSourceOnce("notion");
            return notionPosts;
        } catch (error) {
            // Build can generate pages in parallel; avoid noisy logs unless explicitly debugging.
            if (!isBuildLifecycle() || isNotionDebugEnabled()) {
                console.error("[posts] Failed to fetch posts from Notion; falling back to local posts.", error);
            } else {
                warnBuildFallbackOnce();
            }
        }
    }

    try {
        logPostsSourceOnce("local");
        return getSortedPostsDataLocal();
    } catch (error) {
        console.error("[posts] Failed to fetch posts from local filesystem; returning an empty list.", error);
        return [];
    }
}

export async function getPostData(id: string): Promise<BlogPost & { contentHtml: string; toc: PostTocItem[] }> {
    const canTryNotion = isNotionEnabled();
    if (canTryNotion) {
        try {
            return await getPostDataNotion(id);
        } catch (error) {
            if (!isBuildLifecycle() || isNotionDebugEnabled()) {
                console.error(`[posts] Failed to fetch post '${id}' from Notion; falling back to local posts.`, error);
            } else {
                warnBuildFallbackOnce();
            }
        }
    }

    return getPostDataLocal(id);
}
