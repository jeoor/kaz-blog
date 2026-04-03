import { type NotionBlock } from "@/lib/notion";
import { renderMarkdownInlineToHtml, renderMarkdownToHtml } from "@/lib/markdown";
type RichTextItem = any;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderRichTextItem(item: RichTextItem): string {
    const text = "plain_text" in item ? item.plain_text : "";
    const content = escapeHtml(text);

    let inner = content;

    const href = (item as any).href || (item.type === "text" ? item.text.link?.url : null);
    if (href) {
        inner = `<a href=\"${escapeHtml(String(href))}\" rel=\"noreferrer\" target=\"_blank\">${inner}</a>`;
    }

    const ann = (item as any).annotations;
    if (ann?.code) inner = `<code>${inner}</code>`;
    if (ann?.bold) inner = `<strong>${inner}</strong>`;
    if (ann?.italic) inner = `<em>${inner}</em>`;
    if (ann?.strikethrough) inner = `<del>${inner}</del>`;
    if (ann?.underline) inner = `<u>${inner}</u>`;

    return inner;
}

function renderRichText(rich: RichTextItem[] | undefined): string {
    if (!rich || rich.length === 0) return "";
    return rich.map(renderRichTextItem).join("");
}

function richTextToPlain(rich: RichTextItem[] | undefined): string {
    if (!rich || rich.length === 0) return "";
    return rich.map((item) => ("plain_text" in item ? item.plain_text : "")).join("");
}

function parseImageReference(text: string): { alt: string; url: string; title: string } | null {
    const trimmed = String(text || "").trim();
    const markdownMatch = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+(?:\?[^\s)]*)?(?:#[^\s)]*)?)(?:\s+"([^"]*)")?\)$/.exec(trimmed);
    if (!markdownMatch) return null;

    return {
        alt: String(markdownMatch[1] || "").trim(),
        url: String(markdownMatch[2] || "").trim(),
        title: String(markdownMatch[3] || "").trim(),
    };
}

function renderChildren(children: NotionBlock[] | undefined): string {
    if (!children || children.length === 0) return "";
    return children.map(renderBlock).join("");
}

function hasRichFormatting(rich: RichTextItem[] | undefined): boolean {
    if (!rich || rich.length === 0) return false;

    return rich.some((item) => {
        const ann = (item as any).annotations;
        const color = String(ann?.color || "default").toLowerCase();
        return Boolean(
            (item as any).href
            || (item?.type === "text" && item?.text?.link?.url)
            || ann?.bold
            || ann?.italic
            || ann?.code
            || ann?.strikethrough
            || ann?.underline
            || color !== "default"
        );
    });
}

function renderTaskListItem(text: string): string | null {
    const match = /^\[(x|X| )\]\s+([\s\S]*)$/.exec(String(text || "").trim());
    if (!match) return null;

    const checked = String(match[1] || "").toLowerCase() === "x";
    const label = String(match[2] || "").trim();
    const body = label ? renderMarkdownInlineToHtml(label) : "";
    const checkedAttr = checked ? " checked" : "";

    return `<span class="task-list-item-wrap"><input type="checkbox" disabled${checkedAttr} /> <span>${body}</span></span>`;
}

function renderListItemText(li: NotionBlock): string {
    const rich = (li as any)?.[li.type]?.rich_text as RichTextItem[] | undefined;

    if (hasRichFormatting(rich)) {
        return renderRichText(rich);
    }

    const plain = richTextToPlain(rich);
    const task = renderTaskListItem(plain);
    if (task) return task;

    return renderMarkdownInlineToHtml(plain);
}

function renderList(children: NotionBlock[], ordered: boolean): string {
    const tag = ordered ? "ol" : "ul";
    const lis = children
        .map((li) => {
            const text = renderListItemText(li);
            const nested = renderChildren(li.children);
            return `<li>${text}${nested ? nested : ""}</li>`;
        })
        .join("");
    return `<${tag}>${lis}</${tag}>`;
}

export function renderBlock(block: NotionBlock): string {
    switch (block.type) {
        case "paragraph": {
            const rich = (block as any).paragraph?.rich_text as RichTextItem[] | undefined;
            const plain = richTextToPlain(rich);
            const image = parseImageReference(plain);
            if (image) {
                const captionText = image.alt || image.title;
                const figcaption = captionText ? `<figcaption>${escapeHtml(captionText)}</figcaption>` : "";
                return `<figure><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" />${figcaption}</figure>`;
            }

            if (hasRichFormatting(rich)) {
                const html = renderRichText(rich);
                if (!html.trim()) return "";
                return `<p>${html}</p>`;
            }

            const html = renderMarkdownToHtml(plain).trim();
            return html;
        }
        case "heading_1":
            return `<h1>${renderRichText((block as any).heading_1?.rich_text)}</h1>`;
        case "heading_2":
            return `<h2>${renderRichText((block as any).heading_2?.rich_text)}</h2>`;
        case "heading_3":
            return `<h3>${renderRichText((block as any).heading_3?.rich_text)}</h3>`;
        case "quote":
            {
                const rich = (block as any).quote?.rich_text as RichTextItem[] | undefined;
                if (hasRichFormatting(rich)) {
                    return `<blockquote><p>${renderRichText(rich)}</p></blockquote>`;
                }

                const plain = richTextToPlain(rich).trim();
                if (!plain) return "";

                return `<blockquote><p>${renderMarkdownInlineToHtml(plain)}</p></blockquote>`;
            }
        case "divider":
            return `<hr />`;
        case "code": {
            const lang = String((block as any).code?.language || "");
            const code = renderRichText((block as any).code?.rich_text);
            const cls = lang ? ` class=\"language-${escapeHtml(lang)}\"` : "";
            // code 的富文本内容已完成转义
            return `<pre><code${cls}>${code}</code></pre>`;
        }
        case "image": {
            const img = (block as any).image;
            const url = img?.type === "external" ? img.external?.url : img?.file?.url;
            if (!url) return "";
            const caption = renderRichText(img?.caption);
            const figcaption = caption ? `<figcaption>${caption}</figcaption>` : "";
            return `<figure><img src=\"${escapeHtml(String(url))}\" alt=\"\" />${figcaption}</figure>`;
        }
        case "callout": {
            const html = renderRichText((block as any).callout?.rich_text);
            const children = renderChildren(block.children);
            return `<blockquote><p>${html}</p>${children}</blockquote>`;
        }
        case "bulleted_list": {
            const kids = ((block as any).bulleted_list?.children || []) as NotionBlock[];
            return renderList(kids, false);
        }
        case "numbered_list": {
            const kids = ((block as any).numbered_list?.children || []) as NotionBlock[];
            return renderList(kids, true);
        }
        case "bulleted_list_item": {
            const html = renderListItemText(block);
            const nested = renderChildren(block.children);
            return `<ul><li>${html}${nested}</li></ul>`;
        }
        case "numbered_list_item": {
            const html = renderListItemText(block);
            const nested = renderChildren(block.children);
            return `<ol><li>${html}${nested}</li></ol>`;
        }
        default:
            return "";
    }
}

export function renderBlocksToHtml(blocks: NotionBlock[]): string {
    return blocks.map(renderBlock).filter(Boolean).join("");
}
