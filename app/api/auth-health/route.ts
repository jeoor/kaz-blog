import { NextResponse } from "next/server";

import { getAdminTokenFromRequest, isAdminTokenValid } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const token = getAdminTokenFromRequest(request);
    return NextResponse.json({
        ok: true,
        hasToken: Boolean(token),
        isValid: isAdminTokenValid(token),
    });
}