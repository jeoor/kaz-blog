import { Client } from "@notionhq/client";
import { authenticateRequest, envValue, isOwnerRole, statusFromError as authStatusFromError } from "./auth-store.js";

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

function normalizeSlug(input) {
    return String(input || "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function isPrivilegedAuth(auth) {
    if (!auth || !auth.user) return false;
    return isOwnerRole(auth.user.role);
}

function normalizedIdentitySet(auth) {
    const out = new Set();
    const displayName = String(auth?.user?.displayName || "").trim().toLowerCase();
    const username = String(auth?.user?.username || "").trim().toLowerCase();
    if (displayName) out.add(displayName);
    if (username) out.add(username);
    return out;
}

function canAccessByAuthor(auth, postAuthor) {
    if (isPrivilegedAuth(auth)) return true;
    const current = String(postAuthor || "").trim().toLowerCase();
    if (!current) return false;
    return normalizedIdentitySet(auth).has(current);
}

function resolveAuthorForPublish(auth, requestedAuthor) {
    const fallback = String(auth?.user?.displayName || auth?.user?.username || "").trim();
    if (isPrivilegedAuth(auth)) {
        return String(requestedAuthor || fallback).trim();
    }
    return fallback;
}

function getNotionEnv(context) {
    const token = envValue("NOTION_TOKEN", context).trim();
    const databaseId = envValue("NOTION_DATABASE_ID", context).trim();
    if (!token || !databaseId) throw new Error("Notion is not configured");

    return {
        token,
        databaseId,
        propSlug: envValue("NOTION_PROP_SLUG", context).trim() || "Slug",
        propPublished: envValue("NOTION_PROP_PUBLISHED", context).trim() || "Published",
        propDate: envValue("NOTION_PROP_DATE", context).trim() || "Date",
        propDescription: envValue("NOTION_PROP_DESCRIPTION", context).trim() || "Description",
        propAuthor: envValue("NOTION_PROP_AUTHOR", context).trim() || "Author",
        propKeywords: envValue("NOTION_PROP_KEYWORDS", context).trim() || "Keywords",
        propTitle: envValue("NOTION_PROP_TITLE", context).trim(),
        propType: envValue("NOTION_PROP_TYPE", context).trim() || "Type",
    };
}

function firstNonEmptyLine(text) {
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) return trimmed;
    }
    return "";
}

function buildMomentSlug() {
    const random = Math.random().toString(36).slice(2, 8);
    return `moment-${Date.now().toString(36)}-${random}`;
}

function buildPhotoSlug() {
    const random = Math.random().toString(36).slice(2, 8);
    return `photo-${Date.now().toString(36)}-${random}`;
}

function propertyPayloadForSingleValue(def, value) {
    const text = String(value || "").trim();
    if (!def || !text) return null;
    if (def.type === "rich_text") return { rich_text: richText(text) };
    if (def.type === "title") return { title: richText(text) };
    if (def.type === "select") return { select: { name: text } };
    if (def.type === "status") return { status: { name: text } };
    if (def.type === "multi_select") return { multi_select: [{ name: text }] };
    return null;
}

function richText(text) {
    return [{ type: "text", text: { content: String(text || "") } }];
}

function plainFromRich(rich) {
    if (!Array.isArray(rich)) return "";
    return rich.map((x) => String(x.plain_text || "")).join("");
}

function readTextProperty(prop) {
    if (!prop || typeof prop !== "object") return "";
    if (prop.type === "title") return plainFromRich(prop.title);
    if (prop.type === "rich_text") return plainFromRich(prop.rich_text);
    if (prop.type === "date") return prop.date?.start || "";
    if (prop.type === "formula") {
        const f = prop.formula;
        if (!f) return "";
        if (f.type === "string") return String(f.string || "");
        if (f.type === "number") return Number.isFinite(f.number) ? String(f.number) : "";
        if (f.type === "boolean") return f.boolean ? "true" : "false";
        if (f.type === "date") return f.date?.start || "";
    }
    return "";
}

function readKeywordsProperty(prop) {
    if (!prop || typeof prop !== "object") return [];
    if (prop.type === "multi_select") {
        return (prop.multi_select || []).map((x) => String(x.name || "").trim()).filter(Boolean);
    }
    const text = readTextProperty(prop);
    return text.split(",").map((x) => x.trim()).filter(Boolean);
}

function isActivePage(page) {
    return !Boolean(page?.archived) && !Boolean(page?.in_trash);
}

function parseImageReference(text) {
    const trimmed = String(text || "").trim();
    const markdownMatch = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+(?:\?[^\s)]*)?(?:#[^\s)]*)?)(?:\s+"([^"]*)")?\)$/.exec(trimmed);
    if (!markdownMatch) return null;

    return {
        alt: String(markdownMatch[1] || "").trim(),
        url: String(markdownMatch[2] || "").trim(),
        title: String(markdownMatch[3] || "").trim(),
    };
}

function classifyLine(line) {
    const raw = String(line || "");
    const trimmed = raw.trim();
    if (!trimmed) return { kind: "blank" };

    const image = parseImageReference(trimmed);
    if (image) return { kind: "image", ...image };

    const fence = /^```\s*(\S*)\s*$/.exec(trimmed);
    if (fence) {
        const lang = fence[1] || "";
        return { kind: lang ? "code_fence_start" : "code_fence_end", lang };
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) return { kind: "heading", level: h[1].length, text: h[2] };

    const q = /^>\s?(.*)$/.exec(trimmed);
    if (q) return { kind: "quote", text: q[1] };

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bullet) return { kind: "bulleted", text: bullet[1] };

    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (numbered) return { kind: "numbered", text: numbered[1] };

    return { kind: "paragraph", text: raw };
}

function markdownToNotionBlocks(markdown) {
    const normalized = String(markdown || "").replace(/\r\n/g, "\n");
    const lines = normalized.split("\n");
    const blocks = [];

    let inCode = false;
    let codeLang = "";
    let codeLines = [];
    let paragraphBuf = [];

    const flushParagraph = () => {
        const text = paragraphBuf.join("\n").trimEnd();
        paragraphBuf = [];
        if (!text.trim()) return;
        blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: richText(text) } });
    };

    const flushCode = () => {
        const text = codeLines.join("\n");
        codeLines = [];
        blocks.push({ object: "block", type: "code", code: { rich_text: richText(text), language: codeLang || "plain text" } });
    };

    for (const line of lines) {
        const c = classifyLine(line);

        if (inCode) {
            if (c.kind === "code_fence_end") {
                inCode = false;
                flushCode();
            } else {
                codeLines.push(line);
            }
            continue;
        }

        if (c.kind === "code_fence_start") {
            flushParagraph();
            inCode = true;
            codeLang = c.lang || "";
            continue;
        }

        if (c.kind === "blank") {
            flushParagraph();
            continue;
        }

        if (c.kind === "image") {
            flushParagraph();
            blocks.push({
                object: "block",
                type: "image",
                image: {
                    type: "external",
                    external: { url: c.url || "" },
                    caption: richText(c.alt || c.title || ""),
                },
            });
            continue;
        }

        if (c.kind === "heading") {
            flushParagraph();
            const key = c.level === 1 ? "heading_1" : c.level === 2 ? "heading_2" : "heading_3";
            blocks.push({ object: "block", type: key, [key]: { rich_text: richText(c.text || "") } });
            continue;
        }

        if (c.kind === "quote") {
            flushParagraph();
            blocks.push({ object: "block", type: "quote", quote: { rich_text: richText(c.text || "") } });
            continue;
        }

        if (c.kind === "bulleted") {
            flushParagraph();
            blocks.push({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: richText(c.text || "") } });
            continue;
        }

        if (c.kind === "numbered") {
            flushParagraph();
            blocks.push({ object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: richText(c.text || "") } });
            continue;
        }

        paragraphBuf.push(c.text || "");
    }

    if (inCode) flushCode();
    flushParagraph();

    return blocks;
}

function blockText(block) {
    const value = block?.[block.type];
    if (!value) return "";
    const rich = value.rich_text || value.text || value.title || value.caption || undefined;
    return plainFromRich(rich);
}

function notionBlocksToMarkdown(blocks) {
    const out = [];
    const emit = (line = "") => out.push(line);

    for (const b of blocks || []) {
        switch (b.type) {
            case "heading_1":
                emit(`# ${blockText(b)}`.trimEnd());
                emit();
                break;
            case "heading_2":
                emit(`## ${blockText(b)}`.trimEnd());
                emit();
                break;
            case "heading_3":
                emit(`### ${blockText(b)}`.trimEnd());
                emit();
                break;
            case "paragraph": {
                const t = blockText(b);
                if (t.trim()) {
                    emit(t.trimEnd());
                    emit();
                }
                break;
            }
            case "quote":
                emit(`> ${blockText(b)}`.trimEnd());
                emit();
                break;
            case "code": {
                const lang = b?.code?.language || "";
                emit(`\`\`\`${lang}`.trimEnd());
                emit(blockText(b).trimEnd());
                emit("\`\`\`");
                emit();
                break;
            }
            case "image": {
                const img = b?.image;
                const url = img?.type === "external" ? img.external?.url : img?.file?.url;
                const caption = plainFromRich(img?.caption);
                if (url) {
                    emit(`![${caption}](${url})`);
                    emit();
                }
                break;
            }
            case "bulleted_list_item":
                emit(`- ${blockText(b)}`.trimEnd());
                break;
            case "numbered_list_item":
                emit(`1. ${blockText(b)}`.trimEnd());
                break;
            default:
                break;
        }
    }

    return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

async function listBlocksRecursively(notion, blockId) {
    let cursor = undefined;
    const all = [];

    do {
        const resp = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 });
        all.push(...(resp.results || []));
        cursor = resp.has_more ? resp.next_cursor : undefined;
    } while (cursor);

    return all;
}

async function findPageBySlug(notion, env, slug) {
    const target = normalizeSlug(slug);
    if (!target) return null;

    let cursor = undefined;
    do {
        const resp = await notion.databases.query({
            database_id: env.databaseId,
            start_cursor: cursor,
            page_size: 100,
        });

        for (const page of resp.results || []) {
            const prop = page?.properties?.[env.propSlug];
            const current = normalizeSlug(readTextProperty(prop));
            if (current === target && isActivePage(page)) return page;
        }

        cursor = resp.has_more ? resp.next_cursor : undefined;
    } while (cursor);

    cursor = undefined;
    do {
        const resp = await notion.databases.query({
            database_id: env.databaseId,
            start_cursor: cursor,
            page_size: 100,
        });

        for (const page of resp.results || []) {
            const prop = page?.properties?.[env.propSlug];
            const current = normalizeSlug(readTextProperty(prop));
            if (current === target) return page;
        }

        cursor = resp.has_more ? resp.next_cursor : undefined;
    } while (cursor);

    return null;
}

function titlePropertyName(page, env) {
    if (env.propTitle && page?.properties?.[env.propTitle]) return env.propTitle;
    const entries = Object.entries(page?.properties || {});
    for (const [name, prop] of entries) {
        if (prop?.type === "title") return name;
    }
    return null;
}

function buildCreatePropertiesFromPayload(frontmatter, env, titleProp, databaseProperties, contentType) {
    const keywords = Array.isArray(frontmatter.keywords) ? frontmatter.keywords : [];
    const properties = {
        [titleProp]: { title: richText(frontmatter.title) },
        [env.propSlug]: { rich_text: richText(frontmatter.slug) },
        [env.propDate]: { date: { start: frontmatter.date } },
        [env.propDescription]: { rich_text: richText(frontmatter.description) },
        [env.propAuthor]: { rich_text: richText(frontmatter.author) },
        [env.propKeywords]: { multi_select: keywords.map((name) => ({ name: String(name) })) },
        [env.propPublished]: { checkbox: true },
    };

    const typeDef = databaseProperties?.[env.propType];
    const typePayload = propertyPayloadForSingleValue(typeDef, contentType);
    if (typePayload) {
        properties[env.propType] = typePayload;
    }

    return properties;
}

function statusFromError(err) {
    if (typeof err?.status === "number") return err.status;
    return authStatusFromError(err);
}

export async function onRequestGet(context) {
    const { request } = context;
    try {
        const url = new URL(request.url);
        const intent = url.searchParams.get("intent") || "";
        const auth = await authenticateRequest(context, request);

        if (intent === "auth-check") {
            return json({ ok: true, user: auth.user, mode: auth.mode });
        }

        const slug = normalizeSlug(url.searchParams.get("slug") || "");
        if (!slug) return json({ message: "Missing slug" }, 400);

        const env = getNotionEnv(context);
        const notion = new Client({ auth: env.token });
        const page = await findPageBySlug(notion, env, slug);
        if (!page) return json({ message: "Not found" }, 404);

        const postAuthor = readTextProperty(page.properties?.[env.propAuthor]);
        if (!canAccessByAuthor(auth, postAuthor)) {
            throw httpError(403, "Forbidden");
        }

        const blocks = await listBlocksRecursively(notion, page.id);
        const body = notionBlocksToMarkdown(blocks);
        const titleKey = titlePropertyName(page, env);
        const postTypeRaw = readTextProperty(page.properties?.[env.propType]).trim().toLowerCase();
        const inferredType = postTypeRaw
            || (slug.startsWith("moment-") || slug.startsWith("m-")
                ? "moment"
                : slug.startsWith("photo-")
                    ? "photo"
                    : "article");

        return json({
            slug,
            pageId: page.id,
            frontmatter: {
                type: inferredType,
                title: titleKey ? readTextProperty(page.properties?.[titleKey]) : "",
                date: readTextProperty(page.properties?.[env.propDate]),
                description: readTextProperty(page.properties?.[env.propDescription]),
                author: readTextProperty(page.properties?.[env.propAuthor]),
                keywords: readKeywordsProperty(page.properties?.[env.propKeywords]),
            },
            body,
        });
    } catch (err) {
        const message = String(err?.message || "Error");
        return json({ message }, statusFromError(err));
    }
}

export async function onRequestPost(context) {
    const { request } = context;
    try {
        const auth = await authenticateRequest(context, request);

        const payload = await request.json();
        const requestedType = String(payload?.type || "article").trim().toLowerCase();
        const contentType = requestedType === "moment"
            ? "moment"
            : requestedType === "photo"
                ? "photo"
                : "article";
        let slug = normalizeSlug(payload?.slug || "");
        if (!slug && contentType === "moment") {
            slug = buildMomentSlug();
        }
        if (!slug && contentType === "photo") {
            slug = buildPhotoSlug();
        }
        if (!slug) return json({ message: "Missing slug" }, 400);

        const fm = payload?.frontmatter || {};
        const author = resolveAuthorForPublish(auth, fm.author);
        const body = String(payload?.body || "");
        const bodySummary = firstNonEmptyLine(body).slice(0, 140);
        const frontmatter = {
            slug,
            title: String(fm.title || "").trim(),
            date: String(fm.date || "").trim(),
            description: String(fm.description || "").trim(),
            author,
            keywords: Array.isArray(fm.tags)
                ? fm.tags.map((x) => String(x).trim()).filter(Boolean)
                : Array.isArray(fm.keywords)
                    ? fm.keywords.map((x) => String(x).trim()).filter(Boolean)
                    : [],
        };

        if (contentType === "moment") {
            if (!frontmatter.title) {
                frontmatter.title = bodySummary || `说说 ${frontmatter.date || ""}`.trim();
            }
            if (!frontmatter.description) {
                frontmatter.description = bodySummary || frontmatter.title;
            }
        }

        if (contentType === "photo") {
            if (!frontmatter.title) {
                frontmatter.title = bodySummary || `照片 ${frontmatter.date || ""}`.trim();
            }
            if (!frontmatter.description) {
                frontmatter.description = bodySummary || frontmatter.title;
            }
        }

        if (!frontmatter.title || !frontmatter.date || !frontmatter.description || !frontmatter.author) {
            return json({ message: "Missing frontmatter fields" }, 400);
        }

        const env = getNotionEnv(context);
        const notion = new Client({ auth: env.token });

        const existing = await findPageBySlug(notion, env, slug);
        if (existing) {
            const existingAuthor = readTextProperty(existing.properties?.[env.propAuthor]);
            if (!canAccessByAuthor(auth, existingAuthor)) {
                throw httpError(403, "Forbidden");
            }
            await notion.pages.update({ page_id: existing.id, archived: true });
        }

        const db = await notion.databases.retrieve({ database_id: env.databaseId });
        const titleKey = env.propTitle && db?.properties?.[env.propTitle]
            ? env.propTitle
            : Object.keys(db?.properties || {}).find((name) => db.properties[name]?.type === "title");
        if (!titleKey) {
            return json({ message: "Notion database has no title property" }, 400);
        }

        const page = await notion.pages.create({
            parent: { database_id: env.databaseId },
            properties: buildCreatePropertiesFromPayload(frontmatter, env, titleKey, db?.properties || {}, contentType),
            children: markdownToNotionBlocks(body),
        });

        return json({ ok: true, slug, type: contentType, pageId: page.id });
    } catch (err) {
        const message = String(err?.message || "Error");
        return json({ message }, statusFromError(err));
    }
}

export async function onRequestDelete(context) {
    const { request } = context;
    try {
        const auth = await authenticateRequest(context, request);

        const url = new URL(request.url);
        const slug = normalizeSlug(url.searchParams.get("slug") || "");
        if (!slug) return json({ message: "Missing slug" }, 400);

        const env = getNotionEnv(context);
        const notion = new Client({ auth: env.token });
        const existing = await findPageBySlug(notion, env, slug);
        if (!existing) return json({ message: "Not found" }, 404);

        const existingAuthor = readTextProperty(existing.properties?.[env.propAuthor]);
        if (!canAccessByAuthor(auth, existingAuthor)) {
            throw httpError(403, "Forbidden");
        }

        await notion.pages.update({ page_id: existing.id, archived: true });
        return json({ ok: true, slug });
    } catch (err) {
        const message = String(err?.message || "Error");
        return json({ message }, statusFromError(err));
    }
}
