import { SITE } from "@/site-config";

/**
 * 解析服务端生成（sitemap/feed/metadata）使用的站点基础 URL。
 */
export function getSiteUrl(): string {
    const configured = SITE.url || "";
    const normalized = String(configured).trim().replace(/\/+$/g, "");
    return normalized || "http://localhost:3000";
}
