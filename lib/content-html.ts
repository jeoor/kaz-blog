import hljs from "highlight.js";
import { parse, HTMLElement } from "node-html-parser";

export type TocItem = {
    id: string;
    text: string;
    level: 2 | 3;
};

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[\s\u3000]+/g, "-")
        .replace(/[^\w\u4e00-\u9fa5-]+/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "section";
}

function getCodeLanguage(className: string | undefined): string | null {
    if (!className) return null;

    const match = className.match(/language-([\w-]+)/);
    if (!match) return null;

    return match[1] || null;
}

function decodeHtmlEntities(value: string): string {
    return value
        .replace(/&#x3C;/gi, "<")
        .replace(/&#x3E;/gi, ">")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}

function enhanceCodeBlocks(inputHtml: string): string {
    return inputHtml.replace(/<pre><code(?: class="([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_match, className, rawCodeHtml) => {
        const language = getCodeLanguage(className);
        const rawCode = decodeHtmlEntities(String(rawCodeHtml || ""));

        const highlighted = language && hljs.getLanguage(language)
            ? hljs.highlight(rawCode, { language, ignoreIllegals: true })
            : hljs.highlightAuto(rawCode);

        const codeClass = `hljs${highlighted.language ? ` language-${highlighted.language}` : ""}`;
        const dataLanguage = highlighted.language ? ` data-language="${highlighted.language}"` : "";

        return `<pre${dataLanguage}><code class="${codeClass}">${highlighted.value}</code></pre>`;
    });
}

export function enhanceArticleHtml(inputHtml: string): { contentHtml: string; toc: TocItem[] } {
    const htmlWithHighlightedCode = enhanceCodeBlocks(inputHtml);

    const root = parse(htmlWithHighlightedCode, {
        comment: true,
    });
    const toc: TocItem[] = [];
    const usedIds = new Map<string, number>();

    root.querySelectorAll("h2, h3").forEach((heading) => {
        const text = heading.text.trim();
        if (!text) return;

        const baseId = slugify(text);
        const count = usedIds.get(baseId) || 0;
        usedIds.set(baseId, count + 1);
        const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

        heading.setAttribute("id", id);
        toc.push({
            id,
            text,
            level: heading.tagName.toLowerCase() === "h3" ? 3 : 2,
        });
    });

    root.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src");
        if (!src) return;

        const figure = img.closest("figure");
        const caption = figure?.querySelector("figcaption")?.text.trim() || "";
        img.setAttribute("data-lightbox-src", src);
        img.setAttribute("data-lightbox-alt", img.getAttribute("alt") || "");
        img.setAttribute("data-lightbox-caption", caption);
        img.setAttribute("loading", "lazy");
        img.setAttribute("decoding", "async");
        img.setAttribute("sizes", "(min-width: 1280px) 768px, (min-width: 768px) 82vw, 100vw");

        const currentClass = img.getAttribute("class") || "";
        img.setAttribute("class", [currentClass, "article-image"].filter(Boolean).join(" "));
    });

    return {
        contentHtml: root.toString(),
        toc,
    };
}