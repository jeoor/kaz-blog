import { NextResponse } from "next/server";

import {
    ADMIN_SESSION_COOKIE,
    createAdminSessionJwt,
    getAdminTokenFromRequest,
    isAdminTokenValid,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
    try {
        const payload = (await request.json().catch(() => ({}))) as { token?: string; password?: string; noCookie?: boolean };
        const provided = (payload.token || payload.password || getAdminTokenFromRequest(request) || "").trim();

        if (!isAdminTokenValid(provided)) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (payload.noCookie) {
            // Validate only (no session cookie) for per-visit password entry flows.
            return NextResponse.json({ ok: true });
        }

        const jwt = await createAdminSessionJwt();
        const res = NextResponse.json({ ok: true });

        res.cookies.set(ADMIN_SESSION_COOKIE, jwt, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        return res;
    } catch (e) {
        const message = e instanceof Error ? e.message : "Error";
        return NextResponse.json({ message }, { status: 400 });
    }
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
    return res;
}
