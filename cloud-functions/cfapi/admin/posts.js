import { Client } from "@notionhq/client";

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

function getAdminTokenFromRequest(request) {
    const header = request.headers.get("x-admin-token");
    if (header) return header;

    const auth = request.headers.get("authorization");
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
        return auth.slice("bearer ".length).trim();
    }

    return null;
}

function assertAdmin(request) {
    const expected = String(process.env.ADMIN_TOKEN || "").trim();
    const provided = String(getAdminTokenFromRequest(request) || "").trim();
    if (!expected) throw new Error("Missing env: ADMIN_TOKEN");
    if (provided !== expected) throw new Error("Unauthorized");
}

function getNotionEnv() {
    const token = String(process.env.NOTION_TOKEN || "").trim();
    const databaseId = String(process.env.NOTION_DATABASE_ID || "").trim();
    if (!token || !databaseId) throw new Error("Notion is not configured");

    return {
        token,
        databaseId,
        propSlug: String(process.env.NOTION_PROP_SLUG || "Slug").trim(),
        propPublished: String(process.env.NOTION_PROP_PUBLISHED || "Published").trim(),
        propDate: String(process.env.NOTION_PROP_DATE || "Date").trim(),
        propDescription: String(process.env.NOTION_PROP_DESCRIPTION || "Description").trim(),
        propAuthor: String(process.env.NOTION_PROP_AUTHOR || "Author").trim(),
        propKeywords: String(process.env.NOTION_PROP_KEYWORDS || "Keywords").trim(),
        propTitle: String(process.env.NOTION_PROP_TITLE || "").trim(),
    };
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

function classifyLine(line) {
    const raw = String(line || "");
    const trimmed = raw.trim();
    if (!trimmed) return { kind: "blank" };

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

function buildCreatePropertiesFromPayload(frontmatter, env, titleProp) {
    const keywords = Array.isArray(frontmatter.keywords) ? frontmatter.keywords : [];
    return {
        [titleProp]: { title: richText(frontmatter.title) },
        [env.propSlug]: { rich_text: richText(frontmatter.slug) },
        [env.propDate]: { date: { start: frontmatter.date } },
        [env.propDescription]: { rich_text: richText(frontmatter.description) },
        [env.propAuthor]: { rich_text: richText(frontmatter.author) },
        [env.propKeywords]: { multi_select: keywords.map((name) => ({ name: String(name) })) },
        [env.propPublished]: { checkbox: true },
    };
}

function statusFromError(err) {
    const msg = String(err?.message || "Error");
    if (msg === "Unauthorized") return 401;
    if (msg.startsWith("Missing env:")) return 500;
    return 400;
}

export async function onRequestGet({ request }) {
    try {
        const url = new URL(request.url);
        const intent = url.searchParams.get("intent") || "";

        assertAdmin(request);
        if (intent === "auth-check") {
            return json({ ok: true });
        }

        const slug = normalizeSlug(url.searchParams.get("slug") || "");
        if (!slug) return json({ message: "Missing slug" }, 400);

        const env = getNotionEnv();
        const notion = new Client({ auth: env.token });
        const page = await findPageBySlug(notion, env, slug);
        if (!page) return json({ message: "Not found" }, 404);

        const blocks = await listBlocksRecursively(notion, page.id);
        const body = notionBlocksToMarkdown(blocks);
        const titleKey = titlePropertyName(page, env);

        return json({
            slug,
            pageId: page.id,
            frontmatter: {
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

export async function onRequestPost({ request }) {
    try {
        assertAdmin(request);

        const payload = await request.json();
        const slug = normalizeSlug(payload?.slug || "");
        if (!slug) return json({ message: "Missing slug" }, 400);

        const fm = payload?.frontmatter || {};
        const frontmatter = {
            slug,
            title: String(fm.title || "").trim(),
            date: String(fm.date || "").trim(),
            description: String(fm.description || "").trim(),
            author: String(fm.author || "").trim(),
            keywords: Array.isArray(fm.keywords) ? fm.keywords.map((x) => String(x).trim()).filter(Boolean) : [],
        };

        if (!frontmatter.title || !frontmatter.date || !frontmatter.description || !frontmatter.author) {
            return json({ message: "Missing frontmatter fields" }, 400);
        }

        const env = getNotionEnv();
        const notion = new Client({ auth: env.token });

        const existing = await findPageBySlug(notion, env, slug);
        if (existing) {
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
            properties: buildCreatePropertiesFromPayload(frontmatter, env, titleKey),
            children: markdownToNotionBlocks(String(payload?.body || "")),
        });

        return json({ ok: true, slug, pageId: page.id });
    } catch (err) {
        const message = String(err?.message || "Error");
        return json({ message }, statusFromError(err));
    }
}

export async function onRequestDelete({ request }) {
    try {
        assertAdmin(request);

        const url = new URL(request.url);
        const slug = normalizeSlug(url.searchParams.get("slug") || "");
        if (!slug) return json({ message: "Missing slug" }, 400);

        const env = getNotionEnv();
        const notion = new Client({ auth: env.token });
        const existing = await findPageBySlug(notion, env, slug);
        if (!existing) return json({ message: "Not found" }, 404);

        await notion.pages.update({ page_id: existing.id, archived: true });
        return json({ ok: true, slug });
    } catch (err) {
        const message = String(err?.message || "Error");
        return json({ message }, statusFromError(err));
    }
}
