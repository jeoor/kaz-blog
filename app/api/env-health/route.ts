import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    return NextResponse.json({
        ok: true,
        hasAdminToken: Boolean((process.env.ADMIN_TOKEN || "").trim()),
        hasNotionToken: Boolean((process.env.NOTION_TOKEN || "").trim()),
        hasNotionDatabaseId: Boolean((process.env.NOTION_DATABASE_ID || "").trim()),
    });
}