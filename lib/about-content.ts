import fs from "fs";
import path from "path";

import matter from "gray-matter";
import { parse, HTMLElement } from "node-html-parser";
import { remark } from "remark";
import remarkHtml from "remark-html";

import { enhanceArticleHtml } from "@/lib/content-html";

export type AboutProfile = {
    name: string;
    role: string;
    note: string;
};

export type AboutSection = {
    title: string;
    contentHtml: string;
};

export type AboutContent = {
    title: string;
    description: string;
    profile: AboutProfile;
    introHtml: string;
    sections: AboutSection[];
};

function getAboutMarkdownPath() {
    const envPath = process.env.ABOUT_MD_PATH;
    if (envPath && typeof envPath === "string") {
        return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
    }
    return path.join(process.cwd(), "content", "about.md");
}

function readString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function readProfile(value: unknown): AboutProfile {
    const raw = (value ?? {}) as Record<string, unknown>;
    return {
        name: readString(raw.name),
        role: readString(raw.role),
        note: readString(raw.note),
    };
}

function splitHtmlByH2(html: string): { introHtml: string; sections: AboutSection[] } {
    const root = parse(html, { comment: true });

    const introParts: string[] = [];
    const sections: AboutSection[] = [];

    let current: { title: string; parts: string[] } | null = null;

    for (const node of root.childNodes) {
        const nodeHtml = node.toString();
        if (!nodeHtml || !nodeHtml.trim()) continue;

        if (node instanceof HTMLElement && node.tagName.toLowerCase() === "h2") {
            if (current) {
                const contentHtml = current.parts.join("").trim();
                sections.push({ title: current.title, contentHtml });
            }
            current = { title: node.text.trim(), parts: [] };
            continue;
        }

        if (!current) {
            introParts.push(nodeHtml);
        } else {
            current.parts.push(nodeHtml);
        }
    }

    if (current) {
        const contentHtml = current.parts.join("").trim();
        sections.push({ title: current.title, contentHtml });
    }

    return {
        introHtml: introParts.join("").trim(),
        sections,
    };
}

export async function getAboutContent(): Promise<AboutContent | null> {
    const filePath = getAboutMarkdownPath();
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);

    const processed = await remark().use(remarkHtml).process(content);
    const html = processed.toString();
    const enhanced = enhanceArticleHtml(html).contentHtml;

    const { introHtml, sections } = splitHtmlByH2(enhanced);

    const profile = readProfile((data as any)?.profile);

    return {
        title: readString((data as any)?.title),
        description: readString((data as any)?.description),
        profile,
        introHtml,
        sections,
    };
}
