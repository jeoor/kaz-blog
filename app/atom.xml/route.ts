import { SITE } from "@/app/site-config";
import { getSortedPostsData } from "@/lib/posts";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function normalizeBaseUrl(value: string): string {
    return String(value || "").trim().replace(/\/+$/g, "");
}

function isLocalhostBase(value: string): boolean {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
}

function isProxyBase(value: string): boolean {
    const host = String(value || "").replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
    return host.endsWith(".qcloudteo.com") || host.endsWith(".pages.dev");
}

function splitHeaderValues(value: string | null): string[] {
    return String(value || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
}

function toBaseFromHost(host: string, protoHint: string): string {
    const proto = protoHint || (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return normalizeBaseUrl(`${proto}://${host}`);
}

function pickBestBase(candidates: string[]): string {
    const normalized = candidates.map(normalizeBaseUrl).filter(Boolean);
    const publicBase = normalized.find((item) => !isLocalhostBase(item) && !isProxyBase(item));
    if (publicBase) return publicBase;

    const nonLocal = normalized.find((item) => !isLocalhostBase(item));
    if (nonLocal) return nonLocal;

    return normalized[0] || "";
}

function resolveSiteUrlFromRequest(request: Request): string {
    const configured = normalizeBaseUrl(
        process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || getSiteUrl(),
    );

    const forwardedProto = splitHeaderValues(request.headers.get("x-forwarded-proto"))[0] || "";
    const forwardedHosts = splitHeaderValues(request.headers.get("x-forwarded-host"));
    const originalHosts = splitHeaderValues(request.headers.get("x-original-host"));
    const realHosts = splitHeaderValues(request.headers.get("x-real-host"));
    const host = String(request.headers.get("host") || "").trim();

    let urlHost = "";
    try {
        urlHost = new URL(request.url).host;
    } catch {
        urlHost = "";
    }

    const hostCandidates = [...forwardedHosts, ...originalHosts, ...realHosts, host, urlHost].filter(Boolean);
    const requestBases = hostCandidates.map((h) => toBaseFromHost(h, forwardedProto));

    const requestBase = pickBestBase(requestBases);
    const configuredBase = pickBestBase([configured]);

    if (configuredBase && !isProxyBase(configuredBase) && !isLocalhostBase(configuredBase)) return configuredBase;
    if (requestBase) return requestBase;
    if (configuredBase) return configuredBase;
    return "http://localhost:3000";
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function toIsoDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
        return new Date().toISOString();
    }
    return d.toISOString();
}

export async function GET(request: Request) {
    const siteUrl = resolveSiteUrlFromRequest(request);
    const feedId = siteUrl;
    const feedUrl = `${siteUrl}/atom.xml`;

    const posts = await getSortedPostsData();
    const updated = posts.length > 0 ? toIsoDate(posts[0].date) : new Date().toISOString();

    const entries = posts.slice(0, 50).map((post) => {
        const url = `${siteUrl}/posts/${encodeURIComponent(post.id)}`;
        return [
            "  <entry>",
            `    <title>${escapeXml(post.title)}</title>`,
            `    <id>${escapeXml(url)}</id>`,
            `    <link href=\"${escapeXml(url)}\" />`,
            `    <updated>${escapeXml(toIsoDate(post.date))}</updated>`,
            `    <summary>${escapeXml(post.description || "")}</summary>`,
            `    <author><name>${escapeXml(post.author || "")}</name></author>`,
            "  </entry>",
        ].join("\n");
    });

    const xml = [
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
        "<feed xmlns=\"http://www.w3.org/2005/Atom\">",
        `  <id>${escapeXml(feedId)}</id>`,
        `  <title>${escapeXml(SITE.title)}</title>`,
        `  <subtitle>${escapeXml(SITE.description)}</subtitle>`,
        `  <updated>${escapeXml(updated)}</updated>`,
        `  <link href=\"${escapeXml(siteUrl)}\" />`,
        `  <link rel=\"self\" type=\"application/atom+xml\" href=\"${escapeXml(feedUrl)}\" />`,
        ...entries,
        "</feed>",
        "",
    ].join("\n");

    return new Response(xml, {
        headers: {
            "content-type": "application/xml; charset=utf-8",
        },
    });
}
