import { SITE } from "@/app/site-config";
import { getSortedPostsData } from "@/lib/posts";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-static";

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

export async function GET() {
    const siteUrl = getSiteUrl().replace(/\/+$/g, "");
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
