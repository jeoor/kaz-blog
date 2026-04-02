import { SITE } from "@/app/site-config";

/**
 * Resolve site base URL for server-side generation (sitemap/feed/metadata).
 */
export function getSiteUrl(): string {
    const configured =
        process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL || "";
    const normalized = String(configured).trim().replace(/\/+$/g, "");
    return normalized || "http://localhost:3000";
}
