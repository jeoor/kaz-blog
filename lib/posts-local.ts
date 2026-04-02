import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { enhanceArticleHtml } from "@/lib/content-html";

function getPostsDirectory(): string {
    const dir = process.env.POSTS_DIR || process.env.GITHUB_POSTS_DIR || "posts";
    return path.join(process.cwd(), dir);
}

/**
 * Gets all posts data sorted by date in descending order.
 */
export function getSortedPostsDataLocal(): BlogPost[] {
    const postsDirectory = getPostsDirectory();
    if (!fs.existsSync(postsDirectory)) {
        console.error(`[posts-local] Posts directory not found: ${postsDirectory}`);
        return [];
    }

    const fileNames = fs.readdirSync(postsDirectory).filter((name) => name.toLowerCase().endsWith(".md"));

    const allPostsData = fileNames.map((fileName) => {
        const id = fileName.replace(/\.md$/, "");

        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, "utf8");

        const matterResult = matter(fileContents);

        const blogPost: BlogPost = {
            id,
            title: String(matterResult.data.title || ""),
            date: String(matterResult.data.date || ""),
            description: String(matterResult.data.description || ""),
            author: String(matterResult.data.author || ""),
            keywords: Array.isArray(matterResult.data.keywords)
                ? matterResult.data.keywords.map((k: unknown) => String(k))
                : [],
            cover: String(matterResult.data.cover || "").trim() || undefined,
        };

        return blogPost;
    });

    return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Retrieves the metadata and content for a blog post by ID, converts the content from Markdown to HTML,
 * and returns a BlogPost object enriched with the generated HTML content.
 */
export async function getPostDataLocal(id: string): Promise<BlogPost & { contentHtml: string; toc: PostTocItem[] }> {
    const postsDirectory = getPostsDirectory();
    const fullPath = path.join(postsDirectory, `${id}.md`);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`[posts-local] Post file not found: ${fullPath}`);
    }

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const matterResult = matter(fileContents);

    const processedContent = await remark().use(html).process(matterResult.content);
    const enhanced = enhanceArticleHtml(processedContent.toString());

    return {
        id,
        title: String(matterResult.data.title || ""),
        date: String(matterResult.data.date || ""),
        description: String(matterResult.data.description || ""),
        author: String(matterResult.data.author || ""),
        cover: String(matterResult.data.cover || "").trim() || undefined,
        contentHtml: enhanced.contentHtml,
        toc: enhanced.toc,
        keywords: Array.isArray(matterResult.data.keywords)
            ? matterResult.data.keywords.map((k: unknown) => String(k))
            : [],
    };
}
