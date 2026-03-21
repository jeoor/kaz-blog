import { SITE } from "@/app/site-config";

/**
 * Resolve site base URL for server-side generation (sitemap/feed/metadata).
 */
export function getSiteUrl(): string {
    const isProduction = process.env.NODE_ENV === "production";
    return isProduction ? process.env.NEXT_PUBLIC_URL || "http://localhost:3000" : "http://localhost:3000";
}
