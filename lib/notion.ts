import { Client } from "@notionhq/client";
import { cache } from "react";

export type NotionEnv = {
    token: string;
    databaseId: string;
    propSlug: string;
    propPublished: string;
    propDate: string;
    propDescription: string;
    propAuthor: string;
    propKeywords: string;
    propTitle?: string;
};

export type NotionPostMeta = {
    pageId: string;
    slug: string;
    title: string;
    date: string;
    description: string;
    author: string;
    keywords: string[];
    published: boolean;
};

type NotionPage = any;
type NotionRichText = any;
type NotionBlockObject = any;

export type NotionBlock = NotionBlockObject & { children?: NotionBlock[] };

function getNotionEnv(): NotionEnv | null {
    const token = (process.env.NOTION_TOKEN || "").trim();
    const databaseId = (process.env.NOTION_DATABASE_ID || "").trim();
    if (!token || !databaseId) return null;

    return {
        token,
        databaseId,
        propSlug: (process.env.NOTION_PROP_SLUG || "Slug").trim(),
        propPublished: (process.env.NOTION_PROP_PUBLISHED || "Published").trim(),
        propDate: (process.env.NOTION_PROP_DATE || "Date").trim(),
        propDescription: (process.env.NOTION_PROP_DESCRIPTION || "Description").trim(),
        propAuthor: (process.env.NOTION_PROP_AUTHOR || "Author").trim(),
        propKeywords: (process.env.NOTION_PROP_KEYWORDS || "Keywords").trim(),
        propTitle: (process.env.NOTION_PROP_TITLE || "").trim() || undefined,
    };
}

export function isNotionEnabled(): boolean {
    return getNotionEnv() !== null;
}

function getClient(): Client {
    const env = getNotionEnv();
    if (!env) {
        throw new Error("Notion is not configured: set NOTION_TOKEN and NOTION_DATABASE_ID");
    }
    return new Client({ auth: env.token });
}

function richTextToPlain(rich: NotionRichText[] | undefined): string {
    if (!rich || rich.length === 0) return "";
    return rich.map((r) => r.plain_text).join("");
}

function propertyString(page: NotionPage, name: string): string {
    const prop = page.properties[name];
    if (!prop) return "";

    switch (prop.type) {
        case "title":
            return richTextToPlain(prop.title);
        case "rich_text":
            return richTextToPlain(prop.rich_text);
        case "select":
            return prop.select?.name || "";
        case "status":
            return prop.status?.name || "";
        case "formula":
            return prop.formula.type === "string" ? prop.formula.string || "" : "";
        case "date":
            return prop.date?.start || "";
        case "url":
            return prop.url || "";
        case "email":
            return prop.email || "";
        case "phone_number":
            return prop.phone_number || "";
        default:
            return "";
    }
}

function propertyBoolean(page: NotionPage, name: string): boolean | null {
    const prop = page.properties[name];
    if (!prop) return null;

    if (prop.type === "checkbox") return prop.checkbox;
    if (prop.type === "formula" && prop.formula.type === "boolean") return prop.formula.boolean;

    return null;
}

function propertyKeywords(page: NotionPage, name: string): string[] {
    const prop = page.properties[name];
    if (!prop) return [];

    if (prop.type === "multi_select") {
        return (prop.multi_select as Array<{ name?: string }>).map((it) => it.name || "").filter(Boolean);
    }

    if (prop.type === "rich_text") {
        const v = richTextToPlain(prop.rich_text);
        return v
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
    }

    if (prop.type === "formula" && prop.formula.type === "string") {
        const v = prop.formula.string || "";
        return v
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
    }

    return [];
}

function getTitleFromPage(page: NotionPage, env: NotionEnv): string {
    if (env.propTitle) {
        const v = propertyString(page, env.propTitle);
        if (v) return v;
    }

    const props = Object.values(page.properties) as any[];
    const titleProp = props.find((p) => p && typeof p === "object" && p.type === "title");
    if (titleProp?.type === "title") return richTextToPlain(titleProp.title);

    return "";
}

export function pageToMeta(page: NotionPage, env: NotionEnv): NotionPostMeta {
    const slug = propertyString(page, env.propSlug).trim();
    const title = getTitleFromPage(page, env).trim();
    const date = propertyString(page, env.propDate).trim();
    const description = propertyString(page, env.propDescription).trim();
    const author = propertyString(page, env.propAuthor).trim();
    const keywords = propertyKeywords(page, env.propKeywords);

    const publishedProp = propertyBoolean(page, env.propPublished);
    const published = publishedProp === null ? true : publishedProp;

    return {
        pageId: page.id,
        slug,
        title,
        date,
        description,
        author,
        keywords,
        published,
    };
}

async function queryAllDatabasePages(params: {
    client: Client;
    databaseId: string;
}): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];
    let cursor: string | undefined;

    for (; ;) {
        const res = await params.client.databases.query({
            database_id: params.databaseId,
            page_size: 100,
            ...(cursor ? { start_cursor: cursor } : {}),
        });

        for (const r of res.results) {
            if (r && typeof r === "object" && "properties" in (r as any)) {
                pages.push(r as any);
            }
        }

        if (!res.has_more) break;
        cursor = res.next_cursor || undefined;
        if (!cursor) break;
    }

    return pages;
}

export const getAllPostMetas = cache(async (): Promise<NotionPostMeta[]> => {
    const env = getNotionEnv();
    if (!env) return [];

    const client = getClient();
    const pages = await queryAllDatabasePages({ client, databaseId: env.databaseId });

    const metas = pages
        .map((p) => pageToMeta(p, env))
        .filter((m) => Boolean(m.slug))
        .filter((m) => m.published);

    metas.sort((a, b) => (a.date < b.date ? 1 : -1));
    return metas;
});

export const findPageBySlug = cache(async (slug: string): Promise<NotionPage | null> => {
    const env = getNotionEnv();
    if (!env) return null;

    const client = getClient();

    const tryQuery = async (filter: any): Promise<NotionPage | null> => {
        const res = await client.databases.query({
            database_id: env.databaseId,
            filter,
            page_size: 1,
        });
        const first = res.results[0];
        if (first && typeof first === "object" && "properties" in (first as any)) return first as any;
        return null;
    };

    try {
        return await tryQuery({
            property: env.propSlug,
            formula: { string: { equals: slug } },
        });
    } catch {
        // ignore
    }

    try {
        return await tryQuery({
            property: env.propSlug,
            rich_text: { equals: slug },
        });
    } catch {
        // ignore
    }

    try {
        return await tryQuery({
            property: env.propSlug,
            title: { equals: slug },
        });
    } catch {
        // ignore
    }

    return null;
});

async function listAllBlockChildren(params: {
    client: Client;
    blockId: string;
}): Promise<NotionBlockObject[]> {
    const blocks: NotionBlockObject[] = [];
    let cursor: string | undefined;

    for (; ;) {
        const res = await params.client.blocks.children.list({
            block_id: params.blockId,
            page_size: 100,
            ...(cursor ? { start_cursor: cursor } : {}),
        });

        for (const b of res.results) {
            if (b && typeof b === "object" && "type" in (b as any)) blocks.push(b as any);
        }

        if (!res.has_more) break;
        cursor = res.next_cursor || undefined;
        if (!cursor) break;
    }

    return blocks;
}

function randomId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function groupListBlocks(blocks: NotionBlock[]): NotionBlock[] {
    const acc: NotionBlock[] = [];

    for (const blk of blocks) {
        if (blk.type === "bulleted_list_item") {
            const last = acc[acc.length - 1] as any;
            if (last?.type === "bulleted_list") {
                last.bulleted_list.children.push(blk);
            } else {
                acc.push({
                    id: randomId(),
                    type: "bulleted_list",
                    has_children: true as any,
                    bulleted_list: { children: [blk] },
                } as any);
            }
            continue;
        }

        if (blk.type === "numbered_list_item") {
            const last = acc[acc.length - 1] as any;
            if (last?.type === "numbered_list") {
                last.numbered_list.children.push(blk);
            } else {
                acc.push({
                    id: randomId(),
                    type: "numbered_list",
                    has_children: true as any,
                    numbered_list: { children: [blk] },
                } as any);
            }
            continue;
        }

        acc.push(blk);
    }

    return acc;
}

export const getBlocksWithChildren = cache(async (pageId: string): Promise<NotionBlock[]> => {
    const env = getNotionEnv();
    if (!env) return [];

    const client = getClient();
    const rootChildren = await listAllBlockChildren({ client, blockId: pageId });

    const inflate = async (block: NotionBlockObject): Promise<NotionBlock> => {
        const full = block as NotionBlock;
        if (!block.has_children) return full;

        const kids = await listAllBlockChildren({ client, blockId: block.id });
        full.children = await Promise.all(kids.map(inflate));
        return full;
    };

    const inflated = await Promise.all(rootChildren.map(inflate));
    return groupListBlocks(inflated);
});

function splitRichText(content: string): NotionRichText[] {
    const text = content || "";
    const parts: string[] = [];
    const chunkSize = 1800;
    for (let i = 0; i < text.length; i += chunkSize) {
        parts.push(text.slice(i, i + chunkSize));
    }

    return parts.map((p) => ({
        type: "text",
        text: { content: p },
        plain_text: p,
    }));
}

export function buildPageProperties(params: {
    env: NotionEnv;
    slug: string;
    title: string;
    date: string;
    description: string;
    author: string;
    keywords: string[];
    published?: boolean;
}): Record<string, any> {
    const { env } = params;

    const properties: Record<string, any> = {
        [env.propSlug]: {
            rich_text: splitRichText(params.slug),
        },
        [env.propDate]: {
            date: params.date ? { start: params.date } : null,
        },
        [env.propDescription]: {
            rich_text: splitRichText(params.description),
        },
        [env.propAuthor]: {
            rich_text: splitRichText(params.author),
        },
        [env.propKeywords]: {
            multi_select: (params.keywords || []).map((k) => ({ name: k })),
        },
    };

    if (env.propPublished) {
        properties[env.propPublished] = {
            checkbox: params.published ?? true,
        };
    }

    if (env.propTitle) {
        properties[env.propTitle] = {
            title: splitRichText(params.title),
        };
        return properties;
    }

    // best-effort: find the first title property name is unknown; pages.create requires it
    // So we default to "Name" which is Notion's default title field.
    properties.Name = { title: splitRichText(params.title) };

    return properties;
}

export async function upsertPage(params: {
    slug: string;
    title: string;
    date: string;
    description: string;
    author: string;
    keywords: string[];
    children: any[];
}): Promise<{ pageId: string }> {
    const env = getNotionEnv();
    if (!env) throw new Error("Notion is not configured");

    const client = getClient();
    const existing = await findPageBySlug(params.slug);

    if (!existing) {
        const created = await client.pages.create({
            parent: { database_id: env.databaseId },
            properties: buildPageProperties({
                env,
                slug: params.slug,
                title: params.title,
                date: params.date,
                description: params.description,
                author: params.author,
                keywords: params.keywords,
                published: true,
            }),
            children: params.children,
        });

        return { pageId: created.id };
    }

    await client.pages.update({
        page_id: existing.id,
        properties: buildPageProperties({
            env,
            slug: params.slug,
            title: params.title,
            date: params.date,
            description: params.description,
            author: params.author,
            keywords: params.keywords,
            published: true,
        }),
    });

    // Clear existing children (archive first-level blocks)
    const children = await listAllBlockChildren({ client, blockId: existing.id });
    for (const blk of children) {
        await client.blocks.update({
            block_id: blk.id,
            archived: true,
        });
    }

    // Append new children (chunked)
    const chunkSize = 100;
    for (let i = 0; i < params.children.length; i += chunkSize) {
        const slice = params.children.slice(i, i + chunkSize);
        await client.blocks.children.append({
            block_id: existing.id,
            children: slice,
        });
    }

    return { pageId: existing.id };
}

export async function archivePageBySlug(slug: string): Promise<boolean> {
    const env = getNotionEnv();
    if (!env) throw new Error("Notion is not configured");

    const client = getClient();
    const page = await findPageBySlug(slug);
    if (!page) return false;

    await client.pages.update({ page_id: page.id, archived: true });
    return true;
}
