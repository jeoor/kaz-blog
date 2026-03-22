import Link from "next/link";

import { getTagHref, normalizeTag } from "@/lib/tags";

import type { RailWidget } from "./right-rail";
import WidgetCard from "./widget-card";

type Props = {
    posts: BlogPost[];
    title?: string;
    note?: string;
    currentTag?: string;
};

function buildTopTags(posts: BlogPost[]) {
    const tagCount = new Map<string, number>();

    posts.forEach((post) => {
        post.keywords.forEach((keyword) => {
            tagCount.set(keyword, (tagCount.get(keyword) || 0) + 1);
        });
    });

    return Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
}

export function getBlogRailWidgets({ posts, title = "站点概览", note, currentTag }: Props): RailWidget[] {
    const totalPosts = posts.length;
    const topTags = buildTopTags(posts);
    const recentPosts = posts.slice(0, 4);
    const totalTags = new Set(posts.flatMap((post) => post.keywords)).size;

    const widgets: RailWidget[] = [
        {
            key: "site-overview",
            node: (
                <WidgetCard title={title}>
                    {note ? <p className="mt-3 text-sm leading-7 text-black/62 dark:text-white/60">{note}</p> : null}
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-[1rem] border border-black/8 bg-white/70 px-3 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-black/38 dark:text-white/38">文章</div>
                            <div className="mt-2 font-serif text-2xl font-semibold">{totalPosts}</div>
                        </div>
                        <div className="rounded-[1rem] border border-black/8 bg-white/70 px-3 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-black/38 dark:text-white/38">标签</div>
                            <div className="mt-2 font-serif text-2xl font-semibold">{totalTags}</div>
                        </div>
                    </div>
                </WidgetCard>
            ),
        },
    ];

    if (topTags.length > 0) {
        widgets.push({
            key: "top-tags",
            node: (
                <WidgetCard title="Tags">
                    <div className="mt-4 flex flex-wrap gap-2.5">
                        {topTags.map(([tag, count]) => (
                            <Link
                                key={tag}
                                href={getTagHref(tag)}
                                aria-current={currentTag && normalizeTag(currentTag) === normalizeTag(tag) ? "page" : undefined}
                                className={[
                                    "rounded-full border px-3 py-1.5 text-xs transition",
                                    currentTag && normalizeTag(currentTag) === normalizeTag(tag)
                                        ? "border-black/14 bg-black/[0.05] text-black dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-white"
                                        : "border-black/8 bg-white/78 text-black/62 hover:border-black/14 hover:text-black dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/62 dark:hover:border-white/[0.1] dark:hover:text-white",
                                ].join(" ")}
                            >
                                #{tag} {count}
                            </Link>
                        ))}
                    </div>
                </WidgetCard>
            ),
        });
    }

    widgets.push({
        key: "recent-posts",
        node: (
            <WidgetCard title="Recent">
                <ul className="mt-4 space-y-3">
                    {recentPosts.map((post) => (
                        <li key={post.id} className="border-t border-black/8 pt-3 first:border-t-0 first:pt-0 dark:border-white/[0.05]">
                            <Link href={`/posts/${post.id}`} className="text-sm leading-7 text-black/72 hover:text-black dark:text-white/72 dark:hover:text-white">
                                {post.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            </WidgetCard>
        ),
    });

    return widgets;
}
