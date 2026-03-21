import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { archivePageBySlug, findPageBySlug, getBlocksWithChildren, pageToMeta } from "@/lib/notion";
import { markdownToNotionBlocks, notionBlocksToMarkdown } from "@/lib/notion-markdown";
import { upsertPage } from "@/lib/notion";
import {
    ADMIN_SESSION_COOKIE,
    getAdminTokenFromRequest,
    isAdminTokenValid,
    verifyAdminSessionJwt,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

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

async function assertAdmin(request: Request): Promise<void> {
    // 1) header token fallback (useful for scripts)
    const headerToken = getAdminToken(request);
    if (isAdminTokenValid(headerToken)) return;

    // 2) cookie session
    const session = cookies().get(ADMIN_SESSION_COOKIE)?.value;
    const ok = await verifyAdminSessionJwt(session);
    if (!ok) {
        throw new Error("Unauthorized");
    }
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
        await assertAdmin(request);

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
        await assertAdmin(request);

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
        const message = e instanceof Error ? e.message : "Error";
        const status = message === "Unauthorized" ? 401 : 400;
        return NextResponse.json({ message }, { status });
    }
}

export async function DELETE(request: Request) {
    try {
        await assertAdmin(request);

        const slug = getSlugFromUrl(request);
        await archivePageBySlug(slug);

        return NextResponse.json({ ok: true, slug });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Error";
        const status = message === "Unauthorized" ? 401 : 400;
        return NextResponse.json({ message }, { status });
    }
}
