import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
    return NextResponse.json({
        ok: true,
        url: request.url,
        method: request.method,
    });
}