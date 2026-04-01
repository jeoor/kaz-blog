import { Client } from "@notionhq/client";
import { cache } from "react";

type RetryDecision = { retry: boolean; delayMs: number; reason: string };

const RETRYABLE_NETWORK_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND", "ECONNREFUSED"]);

type NotionGlobalState = {
    lastLogAtByKey: Map<string, number>;
    notionReadyMemo: { key: string; value: boolean; at: number } | null;
    metasMemo: { key: string; value: NotionPostMeta[]; at: number } | null;
};

function getNotionGlobalState(): NotionGlobalState {
    const g = globalThis as any;
    if (!g.__kazBlogNotion) {
        g.__kazBlogNotion = {
            lastLogAtByKey: new Map<string, number>(),
            notionReadyMemo: null,
            metasMemo: null,
        } satisfies NotionGlobalState;
    }
    return g.__kazBlogNotion as NotionGlobalState;
}

function shouldLog(key: string, intervalMs: number): boolean {
    const state = getNotionGlobalState();
    const now = Date.now();
    const last = state.lastLogAtByKey.get(key) ?? 0;
    if (now - last < intervalMs) return false;
    state.lastLogAtByKey.set(key, now);
    return true;
}

function getHeader(err: any, name: string): string | undefined {
    const headers = err?.headers;
    if (!headers) return undefined;

    if (typeof headers.get === "function") return headers.get(name) || undefined;
    const lower = name.toLowerCase();
    return headers[lower] ?? headers[name];
}

function isNotionDebugEnabled(): boolean {
    return String(process.env.NOTION_DEBUG || "").trim() === "1";
}

function isNpmBuildLifecycle(): boolean {
    return String(process.env.npm_lifecycle_event || "").trim() === "build";
}

function isSlugQueryableType(t: string | null): boolean {
    // Types we can safely filter with equals in `findPageBySlug`.
    return t === "rich_text" || t === "title" || t === "formula";
}

function isTextLikeType(t: string | null): boolean {
    return t === "rich_text" || t === "title" || t === "formula";
}

function isKeywordsType(t: string | null): boolean {
    // We can read keywords from multi_select; also allow comma text via rich_text/formula.
    return t === "multi_select" || t === "rich_text" || t === "formula";
}

function isPublishedReadableType(t: string | null): boolean {
    // We can read published from checkbox or formula(boolean).
    return t === "checkbox" || t === "formula";
}

function isPublishedWritableType(t: string | null): boolean {
    // Formula is computed and not writable.
    return t === "checkbox";
}

function summarizeNotionError(err: any): string {
    const code = String(err?.code || err?.errno || "");
    const status = Number(err?.status || 0);
    const message = String(err?.message || "").split("\n")[0];
    const bits = [code && `code=${code}`, status ? `status=${status}` : "", message && `msg=${message}`].filter(Boolean);
    return bits.join(" ").trim();
}

function classifyRetry(err: any, attempt: number): RetryDecision {
    const code = String(err?.code || err?.errno || "");
    const status = Number(err?.status || 0);
    const message = String(err?.message || "");

    // Rate limit
    if (status === 429) {
        const retryAfter = getHeader(err, "retry-after");
        const retryAfterSec = retryAfter ? Number.parseFloat(retryAfter) : NaN;
        const delayMs = Number.isFinite(retryAfterSec)
            ? Math.max(250, Math.floor(retryAfterSec * 1000))
            : Math.min(4000, 400 * Math.pow(2, attempt - 1));
        return { retry: true, delayMs, reason: "rate_limited" };
    }

    // 5xx transient
    if (status >= 500 && status <= 599) {
        const delayMs = Math.min(4000, 400 * Math.pow(2, attempt - 1));
        return { retry: true, delayMs, reason: `http_${status}` };
    }

    // Network / socket resets
    if (RETRYABLE_NETWORK_CODES.has(code) || message.includes("ECONNRESET") || message.includes("socket hang up")) {
        const delayMs = Math.min(4000, 400 * Math.pow(2, attempt - 1));
        return { retry: true, delayMs, reason: code || "network" };
    }

    return { retry: false, delayMs: 0, reason: "non_retryable" };
}

async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withNotionRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const maxAttempts = 4;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const decision = classifyRetry(err, attempt);
            if (!decision.retry || attempt === maxAttempts) break;
            const warnKey = `notion.retry:${label}:${decision.reason}`;
            if (isNotionDebugEnabled() && shouldLog(warnKey, 5_000)) {
                console.warn(`[notion] ${label} failed (${decision.reason}); retry ${attempt}/${maxAttempts - 1} in ${decision.delayMs}ms`);
            }
            await sleep(decision.delayMs);
        }
    }

    throw lastErr;
}

type NotionDatabase = any;

const getDatabaseSchema = cache(async (): Promise<{ env: NotionEnv; database: NotionDatabase } | null> => {
    const env = getNotionEnv();
    if (!env) return null;

    const client = getClient();
    const database = await withNotionRetry("databases.retrieve", () => client.databases.retrieve({ database_id: env.databaseId }));
    return { env, database };
});

function listDatabasePropertyNames(database: NotionDatabase): string[] {
    const props = database?.properties;
    if (!props || typeof props !== "object") return [];
    return Object.keys(props);
}

function getDatabasePropertyDef(database: NotionDatabase, name: string): any | null {
    const props = database?.properties;
    if (!props || typeof props !== "object") return null;
    return (props as Record<string, any>)[name] ?? null;
}

function getDatabasePropertyType(database: NotionDatabase, name: string): string | null {
    const def = getDatabasePropertyDef(database, name);
    const t = def && typeof def === "object" ? String(def.type || "") : "";
    return t || null;
}

function findDatabaseTitlePropertyName(database: NotionDatabase): string | null {
    const props = database?.properties;
    if (!props || typeof props !== "object") return null;

    for (const [name, def] of Object.entries(props as Record<string, any>)) {
        if (def && typeof def === "object" && (def as any).type === "title") return name;
    }
    return null;
}

function isNotionValidationError(err: any): boolean {
    return String(err?.code || "") === "validation_error" || String(err?.name || "") === "APIResponseError" && String(err?.code || "") === "validation_error";
}

function formatMissingPropsError(params: {
    missing: string[];
    existing: string[];
}): string {
    const missing = params.missing.join(", ");
    const existingPreview = params.existing.slice(0, 20).join(", ");
    const more = params.existing.length > 20 ? ` …(+${params.existing.length - 20})` : "";
    return (
        "Notion 数据库字段不匹配：缺少这些属性列：" +
        missing +
        "。\n\n" +
        "解决方式二选一：\n" +
        "1) 在 Notion 数据库里创建这些列（列名与上面一致）；或\n" +
        "2) 在 .env.local 里设置 NOTION_PROP_* 映射到你数据库的真实列名。\n\n" +
        "当前数据库已有列（部分）：" +
        existingPreview +
        more
    );
}

function formatTypeMismatchError(params: {
    mismatches: Array<{ name: string; expected: string[]; actual: string | null }>;
    existing: string[];
}): string {
    const lines = params.mismatches.map((m) => `- ${m.name}: 当前=${m.actual || "(unknown)"}，期望=${m.expected.join("/")}`);
    const existingPreview = params.existing.slice(0, 20).join(", ");
    const more = params.existing.length > 20 ? ` …(+${params.existing.length - 20})` : "";
    return (
        "Notion 数据库字段类型不匹配：\n" +
        lines.join("\n") +
        "\n\n" +
        "解决方式：Notion 不支持直接改列类型时，建议新建正确类型的列，并在 .env.local 里用 NOTION_PROP_* 映射到新列名。\n\n" +
        "当前数据库已有列（部分）：" +
        existingPreview +
        more
    );
}

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

function getEnvCacheKey(env: NotionEnv): string {
    // Keep it deterministic but avoid leaking secrets into logs.
    return [
        env.databaseId,
        env.propSlug,
        env.propPublished,
        env.propDate,
        env.propDescription,
        env.propAuthor,
        env.propKeywords,
        env.propTitle || "",
    ].join("|");
}

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

// In `next build` (SSG) React's `cache()` doesn't reliably share results across page generations.
// Use a small process-level memo to avoid hammering Notion and spamming logs.
const NOTION_READY_TTL_MS = 20_000;
const METAS_HOT_CACHE_TTL_MS = 45_000;

export async function isNotionReady(): Promise<boolean> {
    const env = getNotionEnv();
    if (!env) return false;

    const key = getEnvCacheKey(env);
    const state = getNotionGlobalState();
    const memo = state.notionReadyMemo;
    if (memo && memo.key === key && Date.now() - memo.at < NOTION_READY_TTL_MS) return memo.value;

    try {
        const schema = await getDatabaseSchema();
        const db = schema?.database;
        if (!db) {
            state.notionReadyMemo = { key, value: false, at: Date.now() };
            return false;
        }

        const props = listDatabasePropertyNames(db);
        // Minimal requirement: slug property must exist and be queryable.
        if (!props.includes(env.propSlug)) {
            state.notionReadyMemo = { key, value: false, at: Date.now() };
            return false;
        }

        const slugType = getDatabasePropertyType(db, env.propSlug);
        const ready = isSlugQueryableType(slugType);

        if (!ready && !isNpmBuildLifecycle() && shouldLog(`notion.schema.typeMismatch:${key}`, 30_000)) {
            console.warn(
                `[notion] Database schema mismatch: ${env.propSlug} is ${slugType || "(unknown)"}; expected rich_text/title/formula. Treating Notion as disabled.`
            );
        }
        state.notionReadyMemo = { key, value: ready, at: Date.now() };
        return ready;
    } catch (err) {
        // `next build` uses multiple parallel workers; logging here can explode output.
        // Keep it silent by default during build; opt-in via NOTION_DEBUG=1.
        if (!isNpmBuildLifecycle() && shouldLog(`notion.schema.verify:${key}`, 30_000)) {
            const info = summarizeNotionError(err);
            if (isNotionDebugEnabled()) {
                console.error("[notion] Failed to verify database schema; treating Notion as disabled.", err);
            } else {
                console.warn(
                    "[notion] Failed to verify database schema; treating Notion as disabled." + (info ? ` (${info})` : "")
                );
            }
        }
        state.notionReadyMemo = { key, value: false, at: Date.now() };
        return false;
    }
}

function getClient(): Client {
    const env = getNotionEnv();
    if (!env) {
        throw new Error("Notion is not configured: set NOTION_TOKEN and NOTION_DATABASE_ID");
    }

    // Prefer Node 18+ built-in fetch (undici) over node-fetch to:
    // - avoid DEP0169 url.parse() deprecation warnings
    // - improve connection stability in some environments
    const supportedFetch = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : undefined;

    return new Client({
        auth: env.token,
        ...(supportedFetch ? { fetch: supportedFetch as any } : {}),
    });
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

function isActivePage(page: NotionPage): boolean {
    return !Boolean((page as any)?.archived) && !Boolean((page as any)?.in_trash);
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
        const res = await withNotionRetry("databases.query(all)", () =>
            params.client.databases.query({
                database_id: params.databaseId,
                page_size: 100,
                ...(cursor ? { start_cursor: cursor } : {}),
            })
        );

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

    const state = getNotionGlobalState();
    const key = getEnvCacheKey(env);

    const memo = state.metasMemo;
    if (memo && memo.key === key && Date.now() - memo.at < METAS_HOT_CACHE_TTL_MS) {
        return memo.value;
    }

    const client = getClient();

    let pages: NotionPage[] = [];
    try {
        pages = await queryAllDatabasePages({ client, databaseId: env.databaseId });
    } catch (err) {
        // Transient network errors are common in some environments.
        // If we have a recent successful snapshot, serve it instead of throwing (avoids falling back to local).
        const memo = state.metasMemo;
        const maxAgeMs = 5 * 60_000;
        if (memo && memo.key === key && Date.now() - memo.at < maxAgeMs) {
            const warnKey = `notion.metas.stale:${key}`;
            if (isNotionDebugEnabled() && shouldLog(warnKey, 10_000)) {
                console.warn("[notion] getAllPostMetas failed; using cached metas.", err);
            }
            return memo.value;
        }
        throw err;
    }

    const propType = (process.env.NOTION_PROP_TYPE || "Type").trim();

    const metas = pages
        .filter((p) => isActivePage(p))
        .filter((p) => {
            // Exclude moment/shuoshuo pages from article list
            const typeVal = propertyString(p, propType).trim().toLowerCase();
            if (typeVal === "moment" || typeVal === "说说") return false;
            const slug = propertyString(p, env.propSlug).trim().toLowerCase();
            if (slug.startsWith("moment-") || slug.startsWith("m-")) return false;
            return true;
        })
        .map((p) => pageToMeta(p, env))
        .filter((m) => Boolean(m.slug))
        .filter((m) => m.published);

    metas.sort((a, b) => (a.date < b.date ? 1 : -1));

    state.metasMemo = { key, value: metas, at: Date.now() };
    return metas;
});

export const findPageBySlug = cache(async (slug: string): Promise<NotionPage | null> => {
    const env = getNotionEnv();
    if (!env) return null;

    // Reject moment/shuoshuo slugs from article detail pages
    const slugLower = slug.toLowerCase();
    if (slugLower.startsWith("moment-") || slugLower.startsWith("m-")) {
        return null;
    }

    let slugType: string | null = null;

    // Avoid Notion validation errors when the database schema doesn't have the slug property.
    try {
        const schema = await getDatabaseSchema();
        const db = schema?.database;
        if (db) {
            const props = listDatabasePropertyNames(db);
            if (!props.includes(env.propSlug)) return null;

            slugType = getDatabasePropertyType(db, env.propSlug);
            if (!isSlugQueryableType(slugType)) return null;
        }
    } catch {
        // If we can't read schema (e.g. transient ECONNRESET), still try querying.
        // We'll swallow validation_error in the query attempts below.
    }

    const client = getClient();

    const tryQuery = async (filter: any): Promise<NotionPage | null> => {
        const res = await withNotionRetry("databases.query(slug)", () =>
            client.databases.query({
                database_id: env.databaseId,
                filter,
                page_size: 3,
            })
        );
        const firstActive = res.results.find((result) => result && typeof result === "object" && "properties" in (result as any) && isActivePage(result as any));
        if (firstActive) {
            const page = firstActive as any;
            // Double-check this isn't a moment page
            const propType = (process.env.NOTION_PROP_TYPE || "Type").trim();
            const typeVal = propertyString(page, propType).trim().toLowerCase();
            if (typeVal === "moment" || typeVal === "说说") return null;
            return page;
        }

        const first = res.results.find((result) => result && typeof result === "object" && "properties" in (result as any));
        if (first) {
            const page = first as any;
            // Double-check this isn't a moment page
            const propType = (process.env.NOTION_PROP_TYPE || "Type").trim();
            const typeVal = propertyString(page, propType).trim().toLowerCase();
            if (typeVal === "moment" || typeVal === "说说") return null;
            return page;
        }
        return null;
    };

    const filterByKind = (kind: "formula" | "rich_text" | "title") => {
        if (kind === "formula") {
            return {
                property: env.propSlug,
                formula: { string: { equals: slug } },
            };
        }
        if (kind === "rich_text") {
            return {
                property: env.propSlug,
                rich_text: { equals: slug },
            };
        }
        return {
            property: env.propSlug,
            title: { equals: slug },
        };
    };

    // If schema is known, only run the query shape matching actual property type.
    if (slugType === "formula" || slugType === "rich_text" || slugType === "title") {
        try {
            return await tryQuery(filterByKind(slugType));
        } catch {
            return null;
        }
    }

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
        const res = await withNotionRetry("blocks.children.list", () =>
            params.client.blocks.children.list({
                block_id: params.blockId,
                page_size: 100,
                ...(cursor ? { start_cursor: cursor } : {}),
            })
        );

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
    titlePropName?: string;
    keywordsType?: string | null;
    publishedType?: string | null;
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
    };

    if (params.keywordsType === "rich_text") {
        properties[env.propKeywords] = {
            rich_text: splitRichText((params.keywords || []).join(", ")),
        };
    } else {
        // default: multi_select
        properties[env.propKeywords] = {
            multi_select: (params.keywords || []).map((k) => ({ name: k })),
        };
    }

    if (env.propPublished) {
        // Formula is computed and not writable; only write if it's a checkbox.
        if (params.publishedType !== "formula") {
            properties[env.propPublished] = {
                checkbox: params.published ?? true,
            };
        }
    }

    const titlePropName = params.titlePropName || env.propTitle;
    if (titlePropName) {
        properties[titlePropName] = {
            title: splitRichText(params.title),
        };
        return properties;
    }

    // Fallback to Notion's default title field name.
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

    // Detect the real title property name from database schema to avoid assuming it's "Name".
    let schema: { env: NotionEnv; database: NotionDatabase } | null = null;
    try {
        schema = await getDatabaseSchema();
    } catch (err) {
        // Writing requires schema; without it we can't reliably set properties (and we'd trigger validation errors).
        throw new Error(
            "无法读取 Notion 数据库 schema（可能是网络 ECONNRESET/代理/防火墙导致）。写入需要先能成功访问 databases.retrieve。\n\n" +
            "建议：先运行 npm run notion:check 验证连通性；或稍后重试。"
        );
    }

    const db = schema?.database;
    if (!db) {
        throw new Error(
            "Notion 数据库 schema 不可用（databases.retrieve 未返回有效 database）。写入已中止，避免触发 validation_error。\n\n" +
            "建议：先运行 npm run notion:check。"
        );
    }
    const existingPropNames = db ? listDatabasePropertyNames(db) : [];
    const titlePropName = db ? findDatabaseTitlePropertyName(db) : null;

    // Ensure required properties exist (except title, which we auto-detect).
    const required = [env.propSlug, env.propDate, env.propDescription, env.propAuthor, env.propKeywords, env.propPublished].filter(Boolean);
    const missing = required.filter((name) => !existingPropNames.includes(name));
    if (missing.length > 0) {
        throw new Error(formatMissingPropsError({ missing, existing: existingPropNames }));
    }

    const mismatches: Array<{ name: string; expected: string[]; actual: string | null }> = [];

    const slugType = getDatabasePropertyType(db, env.propSlug);
    // We write slug as rich_text.
    if (slugType !== "rich_text") mismatches.push({ name: env.propSlug, expected: ["rich_text"], actual: slugType });

    const dateType = getDatabasePropertyType(db, env.propDate);
    if (dateType !== "date") mismatches.push({ name: env.propDate, expected: ["date"], actual: dateType });

    const descType = getDatabasePropertyType(db, env.propDescription);
    if (descType !== "rich_text") mismatches.push({ name: env.propDescription, expected: ["rich_text"], actual: descType });

    const authorType = getDatabasePropertyType(db, env.propAuthor);
    if (authorType !== "rich_text") mismatches.push({ name: env.propAuthor, expected: ["rich_text"], actual: authorType });

    const keywordsType = getDatabasePropertyType(db, env.propKeywords);
    if (!(keywordsType === "multi_select" || keywordsType === "rich_text")) {
        mismatches.push({ name: env.propKeywords, expected: ["multi_select", "rich_text"], actual: keywordsType });
    }

    const publishedType = getDatabasePropertyType(db, env.propPublished);
    // Published can be a checkbox (writable) or formula (read-only). We'll only write when it's checkbox.
    if (!isPublishedReadableType(publishedType)) mismatches.push({ name: env.propPublished, expected: ["checkbox", "formula"], actual: publishedType });

    if (mismatches.length > 0) {
        throw new Error(formatTypeMismatchError({ mismatches, existing: existingPropNames }));
    }
    const existing = await findPageBySlug(params.slug);

    if (!existing) {
        const created = await withNotionRetry("pages.create", () =>
            client.pages.create({
                parent: { database_id: env.databaseId },
                properties: buildPageProperties({
                    env,
                    titlePropName: env.propTitle || titlePropName || undefined,
                    keywordsType,
                    publishedType,
                    slug: params.slug,
                    title: params.title,
                    date: params.date,
                    description: params.description,
                    author: params.author,
                    keywords: params.keywords,
                    published: true,
                }),
                children: params.children,
            })
        );

        return { pageId: created.id };
    }

    await withNotionRetry("pages.update", () =>
        client.pages.update({
            page_id: existing.id,
            properties: buildPageProperties({
                env,
                titlePropName: env.propTitle || titlePropName || undefined,
                keywordsType,
                publishedType,
                slug: params.slug,
                title: params.title,
                date: params.date,
                description: params.description,
                author: params.author,
                keywords: params.keywords,
                published: true,
            }),
        })
    );

    // Clear existing children (archive first-level blocks)
    const children = await listAllBlockChildren({ client, blockId: existing.id });
    for (const blk of children) {
        await withNotionRetry("blocks.update(archive)", () =>
            client.blocks.update({
                block_id: blk.id,
                archived: true,
            })
        );
    }

    // Append new children (chunked)
    const chunkSize = 100;
    for (let i = 0; i < params.children.length; i += chunkSize) {
        const slice = params.children.slice(i, i + chunkSize);
        await withNotionRetry("blocks.children.append", () =>
            client.blocks.children.append({
                block_id: existing.id,
                children: slice,
            })
        );
    }

    return { pageId: existing.id };
}

export async function archivePageBySlug(slug: string): Promise<boolean> {
    const env = getNotionEnv();
    if (!env) throw new Error("Notion is not configured");

    const client = getClient();
    const page = await findPageBySlug(slug);
    if (!page) return false;

    await withNotionRetry("pages.update(archive)", () => client.pages.update({ page_id: page.id, archived: true }));
    return true;
}
