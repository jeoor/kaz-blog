import { type NextRequest, NextResponse } from "next/server";
import { createPhotoInNotion } from "@/lib/photos-notion";

/**
 * Verify the request session by forwarding the cookie to the admin session
 * endpoint (EdgeOne cloud function). Returns true if authenticated.
 */
async function verifySession(request: NextRequest): Promise<boolean> {
    const sessionToken = request.cookies.get("eo_admin_session")?.value?.trim();
    if (!sessionToken) return false;

    const adminBase = (process.env.NEXT_PUBLIC_ADMIN_API_BASE || "").trim().replace(/\/+$/, "");
    const requestOrigin = request.nextUrl.origin.replace(/\/+$/, "");

    // Build absolute session URL.
    const relPath = adminBase || "/cfapi";
    const sessionUrl = relPath.startsWith("http")
        ? `${relPath}/api/admin/session`
        : `${requestOrigin}${relPath}/api/admin/session`;

    try {
        const res = await fetch(sessionUrl, {
            headers: {
                cookie: `eo_admin_session=${encodeURIComponent(sessionToken)}`,
            },
            cache: "no-store",
        });
        if (!res.ok) return false;
        const data: Record<string, unknown> = await res.json().catch(() => ({}));
        return Boolean(data?.authenticated);
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    const isAuth = await verifySession(request);
    if (!isAuth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { src?: string; alt?: string; caption?: string };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
    }

    const src = (body.src || "").trim();
    if (!src) {
        return NextResponse.json({ error: "图片地址不能为空" }, { status: 400 });
    }

    // Basic URL validation.
    try {
        const url = new URL(src);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("Invalid protocol");
        }
    } catch {
        return NextResponse.json({ error: "图片地址格式不正确，需为 http(s):// 开头的完整 URL" }, { status: 400 });
    }

    try {
        await createPhotoInNotion({
            src,
            alt: (body.alt || "").trim(),
            caption: (body.caption || "").trim() || undefined,
        });
        return NextResponse.json({ ok: true });
    } catch (err) {
        const message = String((err as Error)?.message || "添加失败");
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
