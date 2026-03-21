import { NextRequest, NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminSessionJwt } from "@/lib/admin-auth";

function isApiPath(pathname: string): boolean {
    return pathname.startsWith("/api/");
}

function isProtectedPath(pathname: string): boolean {
    if (pathname.startsWith("/write")) return true;
    if (pathname.startsWith("/api/admin/")) {
        // allow login/logout
        if (pathname.startsWith("/api/admin/session")) return false;
        return true;
    }
    return false;
}

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (!isProtectedPath(pathname)) {
        return NextResponse.next();
    }

    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const ok = await verifyAdminSessionJwt(session);

    if (ok) {
        return NextResponse.next();
    }

    if (isApiPath(pathname)) {
        return new Response(JSON.stringify({ message: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
        });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ["/write/:path*", "/api/admin/:path*"],
};
