import { type NotionBlock } from "@/lib/notion";
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
    if (markdownMatch) {
        return {
            alt: String(markdownMatch[1] || "").trim(),
            url: String(markdownMatch[2] || "").trim(),
            title: String(markdownMatch[3] || "").trim(),
        };
    }

    const urlMatch = /^(https?:\/\/\S+)$/i.exec(trimmed);
    if (!urlMatch) return null;

    const url = String(urlMatch[1] || "").trim();
    if (!/\.(?:png|jpe?g|gif|webp|svg|avif|bmp)(?:[?#].*)?$/i.test(url)) return null;

    return {
        alt: "",
        url,
        title: "",
    };
}

function renderChildren(children: NotionBlock[] | undefined): string {
    if (!children || children.length === 0) return "";
    return children.map(renderBlock).join("");
}

function renderList(children: NotionBlock[], ordered: boolean): string {
    const tag = ordered ? "ol" : "ul";
    const lis = children
        .map((li) => {
            const text = renderRichText((li as any)[li.type]?.rich_text);
            const nested = renderChildren(li.children);
            return `<li>${text}${nested ? nested : ""}</li>`;
        })
        .join("");
    return `<${tag}>${lis}</${tag}>`;
}

export function renderBlock(block: NotionBlock): string {
    switch (block.type) {
        case "paragraph": {
            const plain = richTextToPlain((block as any).paragraph?.rich_text);
            const image = parseImageReference(plain);
            if (image) {
                const captionText = image.alt || image.title;
                const figcaption = captionText ? `<figcaption>${escapeHtml(captionText)}</figcaption>` : "";
                return `<figure><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" />${figcaption}</figure>`;
            }
            const html = renderRichText((block as any).paragraph?.rich_text);
            if (!html.trim()) return "";
            return `<p>${html}</p>`;
        }
        case "heading_1":
            return `<h1>${renderRichText((block as any).heading_1?.rich_text)}</h1>`;
        case "heading_2":
            return `<h2>${renderRichText((block as any).heading_2?.rich_text)}</h2>`;
        case "heading_3":
            return `<h3>${renderRichText((block as any).heading_3?.rich_text)}</h3>`;
        case "quote":
            return `<blockquote><p>${renderRichText((block as any).quote?.rich_text)}</p></blockquote>`;
        case "divider":
            return `<hr />`;
        case "code": {
            const lang = String((block as any).code?.language || "");
            const code = renderRichText((block as any).code?.rich_text);
            const cls = lang ? ` class=\"language-${escapeHtml(lang)}\"` : "";
            // code rich text is already escaped
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
            const html = renderRichText((block as any).bulleted_list_item?.rich_text);
            const nested = renderChildren(block.children);
            return `<ul><li>${html}${nested}</li></ul>`;
        }
        case "numbered_list_item": {
            const html = renderRichText((block as any).numbered_list_item?.rich_text);
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
