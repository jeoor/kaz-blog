import { Client } from "@notionhq/client";

import type { ShuoshuoItem } from "@/content/shuoshuo";
import { isNotionEnabled } from "@/lib/notion";

type NotionPage = any;
type NotionBlock = any;

type MomentNotionEnv = {
    token: string;
    databaseId: string;
    propSlug: string;
    propDate: string;
    propAuthor: string;
    propKeywords: string;
    propPublished: string;
    propType: string;
    propCategory: string;
};

function getEnv(): MomentNotionEnv | null {
    const token = String(process.env.NOTION_TOKEN || "").trim();
    const databaseId = String(process.env.NOTION_DATABASE_ID || "").trim();
    if (!token || !databaseId) return null;

    return {
        token,
        databaseId,
        propSlug: String(process.env.NOTION_PROP_SLUG || "Slug").trim(),
        propDate: String(process.env.NOTION_PROP_DATE || "Date").trim(),
        propAuthor: String(process.env.NOTION_PROP_AUTHOR || "Author").trim(),
        propKeywords: String(process.env.NOTION_PROP_KEYWORDS || "Keywords").trim(),
        propPublished: String(process.env.NOTION_PROP_PUBLISHED || "Published").trim(),
        propType: String(process.env.NOTION_PROP_TYPE || "Type").trim(),
        propCategory: String(process.env.NOTION_PROP_CATEGORY || "Category").trim(),
    };
}

function richTextToPlain(rich: any[] | undefined): string {
    if (!Array.isArray(rich)) return "";
    return rich.map((x) => String(x?.plain_text || "")).join("");
}

function propertyString(page: NotionPage, name: string): string {
    const prop = page?.properties?.[name];
    if (!prop) return "";

    if (prop.type === "title") return richTextToPlain(prop.title);
    if (prop.type === "rich_text") return richTextToPlain(prop.rich_text);
    if (prop.type === "select") return String(prop.select?.name || "");
    if (prop.type === "status") return String(prop.status?.name || "");
    if (prop.type === "date") return String(prop.date?.start || "");
    if (prop.type === "formula") {
        if (prop.formula?.type === "string") return String(prop.formula?.string || "");
        if (prop.formula?.type === "date") return String(prop.formula?.date?.start || "");
    }

    return "";
}

function propertyBoolean(page: NotionPage, name: string): boolean | null {
    const prop = page?.properties?.[name];
    if (!prop) return null;
    if (prop.type === "checkbox") return Boolean(prop.checkbox);
    if (prop.type === "formula" && prop.formula?.type === "boolean") return Boolean(prop.formula.boolean);
    return null;
}

function propertyKeywords(page: NotionPage, name: string): string[] {
    const prop = page?.properties?.[name];
    if (!prop) return [];

    if (prop.type === "multi_select") {
        return (prop.multi_select || []).map((x: any) => String(x?.name || "").trim()).filter(Boolean);
    }

    const text = propertyString(page, name);
    return text.split(",").map((x) => x.trim()).filter(Boolean);
}

function isActivePage(page: NotionPage): boolean {
    return !Boolean(page?.archived) && !Boolean(page?.in_trash);
}

function isMomentPage(page: NotionPage, env: MomentNotionEnv): boolean {
    const type = propertyString(page, env.propType).trim().toLowerCase();
    if (type === "moment" || type === "说说") return true;

    const slug = propertyString(page, env.propSlug).trim().toLowerCase();
    return slug.startsWith("moment-") || slug.startsWith("m-");
}

function markdownFromBlocks(blocks: NotionBlock[]): string {
    const lines: string[] = [];

    const blockText = (block: NotionBlock) => {
        const value = block?.[block.type];
        if (!value) return "";
        const rich = value.rich_text || value.text || value.title || value.caption;
        return richTextToPlain(rich);
    };

    blocks.forEach((block) => {
        switch (block?.type) {
            case "paragraph": {
                const text = blockText(block).trim();
                if (text) {
                    lines.push(text);
                    lines.push("");
                }
                break;
            }
            case "quote": {
                const text = blockText(block).trim();
                if (text) {
                    lines.push(`> ${text}`);
                    lines.push("");
                }
                break;
            }
            case "heading_1":
            case "heading_2":
            case "heading_3": {
                const text = blockText(block).trim();
                if (!text) break;
                const prefix = block.type === "heading_1" ? "#" : block.type === "heading_2" ? "##" : "###";
                lines.push(`${prefix} ${text}`);
                lines.push("");
                break;
            }
            case "bulleted_list_item": {
                const text = blockText(block).trim();
                if (text) lines.push(`- ${text}`);
                break;
            }
            case "numbered_list_item": {
                const text = blockText(block).trim();
                if (text) lines.push(`1. ${text}`);
                break;
            }
            case "image": {
                const image = block?.image;
                const url = image?.type === "external" ? image?.external?.url : image?.file?.url;
                const caption = richTextToPlain(image?.caption).trim();
                if (url) {
                    lines.push(`![${caption}](${url})`);
                    lines.push("");
                }
                break;
            }
            default:
                break;
        }
    });

    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function listAllPages(client: Client, databaseId: string): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];
    let cursor: string | undefined;

    for (; ;) {
        const res = await client.databases.query({
            database_id: databaseId,
            page_size: 100,
            ...(cursor ? { start_cursor: cursor } : {}),
        });

        for (const result of res.results) {
            if (result && typeof result === "object" && "properties" in (result as any)) {
                pages.push(result as NotionPage);
            }
        }

        if (!res.has_more) break;
        cursor = res.next_cursor || undefined;
        if (!cursor) break;
    }

    return pages;
}

async function listBlockChildren(client: Client, blockId: string): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    for (; ;) {
        const res = await client.blocks.children.list({
            block_id: blockId,
            page_size: 100,
            ...(cursor ? { start_cursor: cursor } : {}),
        });

        for (const result of res.results) {
            blocks.push(result as NotionBlock);
        }

        if (!res.has_more) break;
        cursor = res.next_cursor || undefined;
        if (!cursor) break;
    }

    const expanded = await Promise.all(
        blocks.map(async (block) => {
            if (!block?.has_children) return block;
            const children = await listBlockChildren(client, block.id);
            return { ...block, children };
        })
    );

    return expanded;
}

export async function getShuoshuoEntriesNotion(): Promise<ShuoshuoItem[]> {
    if (!isNotionEnabled()) return [];

    const env = getEnv();
    if (!env) return [];

    const client = new Client({ auth: env.token, ...(typeof globalThis.fetch === "function" ? { fetch: globalThis.fetch.bind(globalThis) as any } : {}) });
    const pages = await listAllPages(client, env.databaseId);

    const moments = pages
        .filter((page) => isActivePage(page))
        .filter((page) => {
            const published = propertyBoolean(page, env.propPublished);
            return published === null ? true : published;
        })
        .filter((page) => isMomentPage(page, env));

    const entries = await Promise.all(
        moments.map(async (page) => {
            const slug = propertyString(page, env.propSlug).trim();
            const date = propertyString(page, env.propDate).trim() || new Date().toISOString();
            const author = propertyString(page, env.propAuthor).trim();
            const category = propertyString(page, env.propCategory).trim() || "说说";
            const tags = propertyKeywords(page, env.propKeywords);
            const blocks = await listBlockChildren(client, page.id);
            const body = markdownFromBlocks(blocks);

            return {
                id: slug || page.id,
                date,
                author,
                category,
                tags,
                body,
            } satisfies ShuoshuoItem;
        })
    );

    entries.sort((a, b) => (a.date < b.date ? 1 : -1));
    return entries;
}
