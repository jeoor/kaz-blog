import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getAdminTokenFromRequest(request: Request): string | null {
    const header = request.headers.get("x-admin-token");
    if (header) return header;

    const auth = request.headers.get("authorization");
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
        return auth.slice("bearer ".length).trim();
    }

    return null;
}

function isAdminTokenValid(provided: string | null): boolean {
    const expected = (process.env.ADMIN_TOKEN || "").trim();
    if (!expected || !provided) return false;
    return provided === expected;
}

function normalizeSlug(input: string): string {
    return input
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function getSlugFromUrl(request: Request): string {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") || "";
    const normalized = normalizeSlug(slug);
    if (!normalized) {
        throw new Error("Missing slug");
    }
    return normalized;
}

function getAdminToken(request: Request): string | null {
    return getAdminTokenFromRequest(request);
}

function assertAdmin(request: Request): void {
    const headerToken = getAdminToken(request);
    if (isAdminTokenValid(headerToken)) return;

    throw new Error("Unauthorized");
}

function getNotionEnvFromProcess() {
    const token = (process.env.NOTION_TOKEN || "").trim();
    const databaseId = (process.env.NOTION_DATABASE_ID || "").trim();
    if (!token || !databaseId) {
        throw new Error("Notion is not configured");
    }

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

type PostFrontmatter = {
    title: string;
    date: string;
    description: string;
    author: string;
    keywords: string[];
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        if (searchParams.get("intent") === "auth-check") {
            assertAdmin(request);
            return NextResponse.json({ ok: true });
        }

        assertAdmin(request);

        const [{ findPageBySlug, getBlocksWithChildren, pageToMeta }, { notionBlocksToMarkdown }] = await Promise.all([
            import("@/lib/notion"),
            import("@/lib/notion-markdown"),
        ]);

        const slug = getSlugFromUrl(request);
        const env = getNotionEnvFromProcess();
        const page = await findPageBySlug(slug);
        if (!page) return NextResponse.json({ message: "Not found" }, { status: 404 });

        const meta = pageToMeta(page, env);
        const blocks = await getBlocksWithChildren(page.id);
        const body = notionBlocksToMarkdown(blocks);

        const frontmatter: PostFrontmatter = {
            title: meta.title,
            date: meta.date,
            description: meta.description,
            author: meta.author,
            keywords: meta.keywords,
        };

        return NextResponse.json({
            slug,
            pageId: page.id,
            frontmatter,
            body,
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Error";
        const status = message === "Unauthorized" ? 401 : 400;
        return NextResponse.json({ message }, { status });
    }
}

export async function POST(request: Request) {
    try {
        assertAdmin(request);

        const [{ markdownToNotionBlocks }, { upsertPage }] = await Promise.all([
            import("@/lib/notion-markdown"),
            import("@/lib/notion"),
        ]);

        const payload = (await request.json()) as {
            slug?: string;
            frontmatter?: Partial<PostFrontmatter>;
            body?: string;
        };

        const slug = normalizeSlug(payload.slug || "");
        if (!slug) {
            return NextResponse.json({ message: "Missing slug" }, { status: 400 });
        }

        const fm = payload.frontmatter || {};

        const required = (key: keyof PostFrontmatter): string => {
            const val = fm[key];
            if (typeof val !== "string" || !val.trim()) {
                throw new Error(`Missing ${key}`);
            }
            return val.trim();
        };

        const frontmatter: PostFrontmatter = {
            title: required("title"),
            date: required("date"),
            description: required("description"),
            author: required("author"),
            keywords: Array.isArray(fm.keywords)
                ? fm.keywords.map((k) => String(k)).map((k) => k.trim()).filter(Boolean)
                : [],
        };

        const body = typeof payload.body === "string" ? payload.body : "";
        const children = markdownToNotionBlocks(body);

        const result = await upsertPage({
            slug,
            title: frontmatter.title,
            date: frontmatter.date,
            description: frontmatter.description,
            author: frontmatter.author,
            keywords: frontmatter.keywords,
            children,
        });

        return NextResponse.json({
            ok: true,
            slug,
            pageId: result.pageId,
        });
    } catch (e) {
        const raw = e instanceof Error ? e.message : "Error";
        const anyErr = e as any;
        const code = String(anyErr?.code || anyErr?.errno || "");
        const notionCode = String(anyErr?.code || "");
        const statusFromNotion = Number(anyErr?.status || 0);

        let message = raw;
        let status = raw === "Unauthorized" ? 401 : 400;

        if (code === "ECONNRESET" || raw.includes("ECONNRESET")) {
            message = "Notion 请求被网络重置（ECONNRESET）。通常是代理/防火墙/VPN/网络抖动导致，建议稍后重试或更换网络。";
            status = 503;
        } else if (statusFromNotion === 429) {
            message = "Notion 触发限流（429）。请稍后重试。";
            status = 503;
        } else if (notionCode === "validation_error" || raw.includes("validation_error") || raw.includes("Could not find property") || raw.includes("is not a property")) {
            message =
                "Notion 数据库字段不匹配（validation_error）。\n" +
                "你当前数据库的列名/类型和项目期望的不一致。\n\n" +
                "解决：\n" +
                "- 方案 A：在 Notion 数据库里创建这些列：Slug / Date / Description / Author / Keywords / Published（类型按项目默认）；\n" +
                "- 方案 B：在 .env.local 里设置 NOTION_PROP_SLUG/DATE/DESCRIPTION/AUTHOR/KEYWORDS/PUBLISHED 映射到你数据库的真实列名。\n\n" +
                "建议先运行：npm run notion:check（会打印数据库的列名）。";
            status = 400;
        } else if (statusFromNotion === 404 || notionCode === "object_not_found" || raw.includes("Could not find database")) {
            message = "Notion 数据库找不到（404）。请确认 NOTION_DATABASE_ID 正确，并在 Notion 的数据库页面 Share/Connections 把数据库共享给你的 integration（kaz-blog）。";
            status = 400;
        } else if (statusFromNotion === 401 || statusFromNotion === 403) {
            message = "Notion 鉴权失败（401/403）。请确认 NOTION_TOKEN 正确且 integration 有权限访问该数据库。";
            status = 400;
        }

        return NextResponse.json({ message }, { status });
    }
}

export async function DELETE(request: Request) {
    try {
        assertAdmin(request);

        const { archivePageBySlug } = await import("@/lib/notion");

        const slug = getSlugFromUrl(request);
        await archivePageBySlug(slug);

        return NextResponse.json({ ok: true, slug });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Error";
        const status = message === "Unauthorized" ? 401 : 400;
        return NextResponse.json({ message }, { status });
    }
}
