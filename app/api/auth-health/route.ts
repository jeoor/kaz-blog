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

export async function GET(request: Request) {
    const token = getAdminTokenFromRequest(request);
    return NextResponse.json({
        ok: true,
        hasToken: Boolean(token),
        isValid: isAdminTokenValid(token),
    });
}