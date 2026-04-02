import { type NotionBlock } from "@/lib/notion";
type RichTextItem = any;

function rt(content: string): Array<{ type: "text"; text: { content: string } }> {
    const text = content || "";
    const parts: string[] = [];
    const chunkSize = 1800;
    for (let i = 0; i < text.length; i += chunkSize) {
        parts.push(text.slice(i, i + chunkSize));
    }
    return parts.map((p) => ({ type: "text", text: { content: p } }));
}

function richToPlain(rich: RichTextItem[] | undefined): string {
    if (!rich || rich.length === 0) return "";
    return rich.map((r) => r.plain_text).join("");
}

function blockText(block: any): string {
    const value = block?.[block.type];
    if (!value) return "";

    const rich =
        value.rich_text ||
        value.text ||
        value.title ||
        value.caption ||
        undefined;

    return Array.isArray(rich) ? richToPlain(rich) : "";
}

function parseImageReference(text: string): { alt: string; url: string; title: string } | null {
    const trimmed = (text || "").trim();
    const markdownMatch = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+(?:\?[^\s)]*)?(?:#[^\s)]*)?)(?:\s+"([^"]*)")?\)$/.exec(trimmed);
    if (!markdownMatch) return null;

    return {
        alt: String(markdownMatch[1] || "").trim(),
        url: String(markdownMatch[2] || "").trim(),
        title: String(markdownMatch[3] || "").trim(),
    };
}

export function notionBlocksToMarkdown(blocks: NotionBlock[]): string {
    const out: string[] = [];

    const emit = (line: string = "") => out.push(line);

    const walk = (list: NotionBlock[], indent: string = "") => {
        for (const b of list) {
            switch (b.type) {
                case "heading_1":
                    emit(`${indent}# ${blockText(b)}`.trimEnd());
                    emit();
                    break;
                case "heading_2":
                    emit(`${indent}## ${blockText(b)}`.trimEnd());
                    emit();
                    break;
                case "heading_3":
                    emit(`${indent}### ${blockText(b)}`.trimEnd());
                    emit();
                    break;
                case "paragraph": {
                    const t = blockText(b);
                    if (t.trim()) {
                        emit(`${indent}${t}`.trimEnd());
                        emit();
                    }
                    break;
                }
                case "quote":
                    emit(`${indent}> ${blockText(b)}`.trimEnd());
                    emit();
                    break;
                case "divider":
                    emit(`${indent}---`);
                    emit();
                    break;
                case "code": {
                    const v = (b as any).code;
                    const lang = v?.language || "";
                    emit(`${indent}\`\`\`${lang}`.trimEnd());
                    emit(`${indent}${blockText(b)}`.trimEnd());
                    emit(`${indent}\`\`\``);
                    emit();
                    break;
                }
                case "image": {
                    const img = (b as any).image;
                    const url = img?.type === "external" ? img.external?.url : img?.file?.url;
                    const caption = richToPlain(img?.caption);
                    if (url) {
                        emit(`${indent}![${caption}](${url})`);
                        emit();
                    }
                    break;
                }
                case "bulleted_list": {
                    const children = ((b as any).bulleted_list?.children || []) as NotionBlock[];
                    for (const li of children) {
                        emit(`${indent}- ${blockText(li)}`.trimEnd());
                        if (li.children && li.children.length > 0) {
                            walk(li.children, indent + "  ");
                        }
                    }
                    emit();
                    break;
                }
                case "numbered_list": {
                    const children = ((b as any).numbered_list?.children || []) as NotionBlock[];
                    let i = 1;
                    for (const li of children) {
                        emit(`${indent}${i}. ${blockText(li)}`.trimEnd());
                        i += 1;
                        if (li.children && li.children.length > 0) {
                            walk(li.children, indent + "  ");
                        }
                    }
                    emit();
                    break;
                }
                case "bulleted_list_item":
                    emit(`${indent}- ${blockText(b)}`.trimEnd());
                    if (b.children && b.children.length > 0) walk(b.children, indent + "  ");
                    break;
                case "numbered_list_item":
                    emit(`${indent}1. ${blockText(b)}`.trimEnd());
                    if (b.children && b.children.length > 0) walk(b.children, indent + "  ");
                    break;
                default:
                    // 暂时忽略不支持的 block 类型
                    break;
            }
        }
    };

    walk(blocks);

    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

type MarkdownLine = {
    kind:
    | "blank"
    | "image"
    | "heading"
    | "quote"
    | "code_fence_start"
    | "code_fence_end"
    | "bulleted"
    | "numbered"
    | "paragraph";
    level?: 1 | 2 | 3;
    text?: string;
    lang?: string;
    alt?: string;
    url?: string;
    title?: string;
};

function classifyLine(line: string): MarkdownLine {
    const raw = line;
    const trimmed = raw.trim();
    if (!trimmed) return { kind: "blank" };

    const image = parseImageReference(trimmed);
    if (image) return { kind: "image", ...image };

    const fence = /^```\s*(\S*)\s*$/.exec(trimmed);
    if (fence) {
        const lang = fence[1] || "";
        return { kind: lang ? "code_fence_start" : "code_fence_end", lang };
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
        return { kind: "heading", level: h[1].length as 1 | 2 | 3, text: h[2] };
    }

    const q = /^>\s?(.*)$/.exec(trimmed);
    if (q) return { kind: "quote", text: q[1] };

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bullet) return { kind: "bulleted", text: bullet[1] };

    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (numbered) return { kind: "numbered", text: numbered[1] };

    return { kind: "paragraph", text: raw };
}

export function markdownToNotionBlocks(markdown: string): any[] {
    const normalized = (markdown || "").replace(/\r\n/g, "\n");
    const lines = normalized.split("\n");
    const blocks: any[] = [];

    let inCode = false;
    let codeLang = "";
    let codeLines: string[] = [];
    let paragraphBuf: string[] = [];

    const flushParagraph = () => {
        const text = paragraphBuf.join("\n").trimEnd();
        paragraphBuf = [];
        if (!text.trim()) return;
        blocks.push({
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: rt(text) },
        });
    };

    const flushCode = () => {
        const text = codeLines.join("\n");
        codeLines = [];
        blocks.push({
            object: "block",
            type: "code",
            code: {
                rich_text: rt(text),
                language: codeLang || "plain text",
            },
        });
    };

    for (const line of lines) {
        const c = classifyLine(line);

        if (inCode) {
            if (c.kind === "code_fence_end") {
                inCode = false;
                flushCode();
                continue;
            }
            codeLines.push(line);
            continue;
        }

        if (c.kind === "code_fence_start") {
            flushParagraph();
            inCode = true;
            codeLang = c.lang || "";
            codeLines = [];
            continue;
        }

        if (c.kind === "blank") {
            flushParagraph();
            continue;
        }

        if (c.kind === "image") {
            flushParagraph();
            blocks.push({
                object: "block",
                type: "image",
                image: {
                    type: "external",
                    external: { url: c.url || "" },
                    caption: rt(c.alt || c.title || ""),
                },
            });
            continue;
        }

        if (c.kind === "heading") {
            flushParagraph();
            const type = c.level === 1 ? "heading_1" : c.level === 2 ? "heading_2" : "heading_3";
            blocks.push({
                object: "block",
                type,
                [type]: { rich_text: rt(c.text || "") },
            });
            continue;
        }

        if (c.kind === "quote") {
            flushParagraph();
            blocks.push({
                object: "block",
                type: "quote",
                quote: { rich_text: rt(c.text || "") },
            });
            continue;
        }

        if (c.kind === "bulleted") {
            flushParagraph();
            blocks.push({
                object: "block",
                type: "bulleted_list_item",
                bulleted_list_item: { rich_text: rt(c.text || "") },
            });
            continue;
        }

        if (c.kind === "numbered") {
            flushParagraph();
            blocks.push({
                object: "block",
                type: "numbered_list_item",
                numbered_list_item: { rich_text: rt(c.text || "") },
            });
            continue;
        }

        // 段落（可能包含多行）
        paragraphBuf.push(c.text || "");
    }

    if (inCode) {
        // 代码围栏未闭合：仍然输出缓存内容
        inCode = false;
        flushCode();
    }
    flushParagraph();

    return blocks;
}
