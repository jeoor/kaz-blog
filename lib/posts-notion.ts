import { findPageBySlug, getAllPostMetas, getBlocksWithChildren, isNotionEnabled, pageToMeta } from "@/lib/notion";
import { enhanceArticleHtml } from "@/lib/content-html";
import { renderBlocksToHtml } from "@/lib/notion-render-html";

export async function getSortedPostsDataNotion(): Promise<BlogPost[]> {
    if (!isNotionEnabled()) return [];

    const metas = await getAllPostMetas();
    return metas.map((m) => ({
        id: m.slug,
        title: m.title,
        date: m.date,
        description: m.description,
        author: m.author,
        keywords: m.keywords,
        cover: m.cover,
    }));
}

export async function getPostDataNotion(id: string): Promise<BlogPost & { contentHtml: string; toc: PostTocItem[] }> {
    if (!isNotionEnabled()) {
        throw new Error("Notion is not configured");
    }

    const page = await findPageBySlug(id);
    if (!page) {
        throw new Error("Not found");
    }

    const env = {
        token: process.env.NOTION_TOKEN || "",
        databaseId: process.env.NOTION_DATABASE_ID || "",
        propSlug: (process.env.NOTION_PROP_SLUG || "Slug").trim(),
        propPublished: (process.env.NOTION_PROP_PUBLISHED || "Published").trim(),
        propDate: (process.env.NOTION_PROP_DATE || "Date").trim(),
        propDescription: (process.env.NOTION_PROP_DESCRIPTION || "Description").trim(),
        propAuthor: (process.env.NOTION_PROP_AUTHOR || "Author").trim(),
        propKeywords: (process.env.NOTION_PROP_KEYWORDS || "Keywords").trim(),
        propCover: (process.env.NOTION_PROP_COVER || "Cover").trim(),
        propTitle: (process.env.NOTION_PROP_TITLE || "").trim() || undefined,
    };

    const meta = pageToMeta(page, env);
    const blocks = await getBlocksWithChildren(page.id);
    const enhanced = enhanceArticleHtml(renderBlocksToHtml(blocks));

    return {
        id: meta.slug || id,
        title: meta.title,
        date: meta.date,
        description: meta.description,
        author: meta.author,
        keywords: meta.keywords,
        cover: meta.cover,
        contentHtml: enhanced.contentHtml,
        toc: enhanced.toc,
    };
}
