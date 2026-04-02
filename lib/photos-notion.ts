import { Client } from "@notionhq/client";
import type { PhotoItem } from "@/app/photos.config";
import { isNotionEnabled } from "@/lib/notion";

type NotionPage = any;
type NotionBlock = any;

type PhotoEnv = {
    token: string;
    databaseId: string;
    propSlug: string;
    propDate: string;
    propAuthor: string;
    propPublished: string;
    propType: string;
    photoTypeValue: string;
};

function getPhotoEnv(): PhotoEnv | null {
    const token = String(process.env.NOTION_TOKEN || "").trim();
    const databaseId = String(process.env.NOTION_DATABASE_ID || "").trim();
    if (!token || !databaseId) return null;

    return {
        token,
        databaseId,
        propSlug: String(process.env.NOTION_PROP_SLUG || "Slug").trim(),
        propDate: String(process.env.NOTION_PROP_DATE || "Date").trim(),
        propAuthor: String(process.env.NOTION_PROP_AUTHOR || "Author").trim(),
        propPublished: String(process.env.NOTION_PROP_PUBLISHED || "Published").trim(),
        propType: String(process.env.NOTION_PROP_TYPE || "Type").trim(),
        // 在 Type 列中用于标记照片条目的值。
        photoTypeValue: String(process.env.NOTION_PHOTO_TYPE || "photo").trim(),
    };
}

/** 判断该数据库页面是否为相册条目 */
export function isPhotoPage(
    page: NotionPage,
    env: { propType: string; propSlug: string; photoTypeValue: string },
): boolean {
    const prop = page?.properties?.[env.propType];
    const typeVal = (() => {
        if (!prop) return "";
        if (prop.type === "select") return String(prop.select?.name || "");
        if (prop.type === "status") return String(prop.status?.name || "");
        if (prop.type === "rich_text")
            return (prop.rich_text ?? []).map((r: any) => String(r.plain_text || "")).join("");
        if (prop.type === "title")
            return (prop.title ?? []).map((r: any) => String(r.plain_text || "")).join("");
        return "";
    })()
        .trim()
        .toLowerCase();

    if (
        typeVal === env.photoTypeValue.toLowerCase() ||
        typeVal === "照片" ||
        typeVal === "gallery"
    )
        return true;

    const slugProp = page?.properties?.[env.propSlug];
    const slug = (() => {
        if (!slugProp) return "";
        if (slugProp.type === "rich_text")
            return (slugProp.rich_text ?? [])
                .map((r: any) => String(r.plain_text || ""))
                .join("");
        if (slugProp.type === "title")
            return (slugProp.title ?? [])
                .map((r: any) => String(r.plain_text || ""))
                .join("");
        if (slugProp.type === "formula" && slugProp.formula?.type === "string")
            return String(slugProp.formula.string || "");
        return "";
    })()
        .trim()
        .toLowerCase();

    return slug.startsWith("photo-");
}

// 匹配：![alt](https://url) 或 ![alt](https://url "caption")
const MD_IMG_RE = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)$/;

function richTextToPlain(rich: any[] | undefined): string {
    return (rich ?? []).map((r: any) => String(r?.plain_text || "")).join("");
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
        if (prop.formula?.type === "string") return String(prop.formula.string || "");
        if (prop.formula?.type === "date") return String(prop.formula.date?.start || "");
    }

    return "";
}

function buildClient(token: string): Client {
    const supportedFetch =
        typeof globalThis.fetch === "function"
            ? globalThis.fetch.bind(globalThis)
            : undefined;
    return new Client({
        auth: token,
        ...(supportedFetch ? { fetch: supportedFetch as any } : {}),
    });
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
        for (const r of res.results) {
            if (r && typeof r === "object" && "properties" in (r as any))
                pages.push(r as NotionPage);
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
        for (const r of res.results) blocks.push(r as NotionBlock);
        if (!res.has_more) break;
        cursor = res.next_cursor || undefined;
        if (!cursor) break;
    }
    return blocks;
}

/** 从照片页面的 blocks 中提取 PhotoItem。 */
async function photoPageToItem(
    env: PhotoEnv,
    client: Client,
    page: NotionPage,
): Promise<PhotoItem | null> {
    const slug = propertyString(page, env.propSlug).trim();
    const author = propertyString(page, env.propAuthor).trim();
    const date = propertyString(page, env.propDate).trim();
    const blocks = await listBlockChildren(client, page.id);

    for (const block of blocks) {
        // Notion 原生图片 block
        if (block?.type === "image") {
            const img = block.image;
            const src: string =
                img?.type === "external"
                    ? img.external?.url
                    : img?.file?.url ?? "";
            const captionText = richTextToPlain(img?.caption).trim();
            if (src)
                return {
                    src,
                    alt: captionText,
                    caption: captionText || undefined,
                    slug: slug || undefined,
                    author: author || undefined,
                    date: date || undefined,
                };
        }
        // 包含 Markdown 图片语法的段落
        if (block?.type === "paragraph") {
            const text = richTextToPlain(block.paragraph?.rich_text).trim();
            const match = MD_IMG_RE.exec(text);
            if (match)
                return {
                    alt: match[1] || "",
                    src: match[2],
                    caption: match[3] || undefined,
                    slug: slug || undefined,
                    author: author || undefined,
                    date: date || undefined,
                };
        }
    }
    return null;
}

/**
 * 从 Notion 数据库加载照片（每张照片对应一个数据库页面，Type="photo"）。
 * 当 Notion 已配置但没有已发布照片页面时返回 []。
 * 仅在 Notion 未配置或请求失败时返回 null，
 * 以便调用方决定是否回退到本地 photos.config.ts。
 */
export async function getPhotosFromNotion(): Promise<PhotoItem[] | null> {
    if (!isNotionEnabled()) return null;

    const env = getPhotoEnv();
    if (!env) return null;

    try {
        const client = buildClient(env.token);
        const pages = await listAllPages(client, env.databaseId);

        const photoPages = pages.filter((page) => {
            if (page?.archived || page?.in_trash) return false;
            const publishedProp = page?.properties?.[env.propPublished];
            const published =
                publishedProp?.type === "checkbox"
                    ? Boolean(publishedProp.checkbox)
                    : publishedProp?.type === "formula" &&
                        publishedProp.formula?.type === "boolean"
                        ? Boolean(publishedProp.formula.boolean)
                        : true;
            if (!published) return false;
            return isPhotoPage(page, env);
        });

        if (photoPages.length === 0) return [];

        const items = await Promise.all(
            photoPages.map((page) => photoPageToItem(env, client, page)),
        );
        const photos = items.filter((item): item is PhotoItem => item !== null);

        return photos.sort((a, b) => {
            const da = String(a.date || "");
            const db = String(b.date || "");
            return da < db ? 1 : -1;
        });
    } catch {
        return null;
    }
}

function buildPhotoSlug(): string {
    const random = Math.random().toString(36).slice(2, 8);
    return `photo-${Date.now().toString(36)}-${random}`;
}

/**
 * 为单张照片创建一个新的 Notion 数据库页面。
 * 每张照片在同一数据库中对应一个 Type="photo" 的页面。
 * 页面正文包含 `![alt](url "caption")` 的段落 block。
 */
export async function createPhotoInNotion(params: {
    src: string;
    alt: string;
    caption?: string;
}): Promise<void> {
    const env = getPhotoEnv();
    if (!env) throw new Error("Notion 未配置");

    const client = buildClient(env.token);
    const slug = buildPhotoSlug();
    const { src, alt, caption } = params;
    const captionPart = caption ? ` "${caption}"` : "";
    const markdownText = `![${alt || ""}](${src}${captionPart})`;

    // 从数据库 schema 中找出标题字段名
    const db = (await client.databases.retrieve({ database_id: env.databaseId })) as any;
    const titlePropName: string = (() => {
        for (const [name, def] of Object.entries<any>(db?.properties ?? {})) {
            if (def?.type === "title") return name;
        }
        return "Name";
    })();

    const properties: Record<string, any> = {
        [titlePropName]: { title: [{ type: "text", text: { content: alt || slug } }] },
        [env.propSlug]: { rich_text: [{ type: "text", text: { content: slug } }] },
        [env.propDate]: { date: { start: new Date().toISOString().slice(0, 10) } },
        [env.propPublished]: { checkbox: true },
    };

    // 若 Type 字段存在且可写，则写入 Type 值
    const typePropDef = db?.properties?.[env.propType];
    if (typePropDef?.type === "select" || typePropDef?.type === "status") {
        properties[env.propType] = { [typePropDef.type]: { name: env.photoTypeValue } };
    } else if (typePropDef?.type === "rich_text") {
        properties[env.propType] = {
            rich_text: [{ type: "text", text: { content: env.photoTypeValue } }],
        };
    }

    await client.pages.create({
        parent: { database_id: env.databaseId },
        properties,
        children: [
            {
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text: [{ type: "text", text: { content: markdownText } }],
                },
            } as any,
        ],
    });
}
