import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export function renderMarkdownToHtml(markdown: string): string {
    const content = String(markdown || "");
    return String(remark().use(remarkGfm).use(remarkHtml).processSync(content));
}

export function renderMarkdownInlineToHtml(markdown: string): string {
    const html = renderMarkdownToHtml(markdown);
    const trimmed = html.trim();

    const match = /^<p>([\s\S]*)<\/p>$/i.exec(trimmed);
    if (!match) return trimmed;

    return String(match[1] || "").trim();
}
