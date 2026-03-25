"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import PostSearchInput from "@/components/post-search-input";
import getFormattedDate from "@/lib/getFormattedDate";
import { searchPosts } from "@/lib/post-search";
import { filterPostsByTag } from "@/lib/tags";

type ArchiveGroup = {
    year: number;
    posts: BlogPost[];
};

type Props = {
    posts: BlogPost[];
};

function groupPostsByYear(posts: BlogPost[]): ArchiveGroup[] {
    const map = new Map<number, BlogPost[]>();

    for (const post of posts) {
        const year = new Date(post.date).getFullYear();
        if (!map.has(year)) {
            map.set(year, []);
        }
        map.get(year)!.push(post);
    }

    return Array.from(map.entries())
        .sort(([a], [b]) => b - a)
        .map(([year, list]) => ({ year, posts: list }));
}

export default function ArchivePosts({ posts }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const query = searchParams.get("q") || "";
    const activeTag = (searchParams.get("tag") || "").trim();
    const deferredQuery = useDeferredValue(query);

    const tagFilteredPosts = useMemo(() => (activeTag ? filterPostsByTag(posts, activeTag) : posts), [activeTag, posts]);
    const filteredPosts = useMemo(() => searchPosts(tagFilteredPosts, deferredQuery), [deferredQuery, tagFilteredPosts]);
    const groups = useMemo(() => groupPostsByYear(filteredPosts), [filteredPosts]);

    function updateQuery(nextQuery: string) {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            const trimmedQuery = nextQuery.trim();

            if (trimmedQuery) {
                params.set("q", trimmedQuery);
            } else {
                params.delete("q");
            }

            const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
            router.replace(nextUrl, { scroll: false });
        });
    }

    return (
        <div className="pt-10">
            {activeTag ? (
                <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[1.15rem] border border-black/8 bg-black/[0.02] px-5 py-4 text-sm dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <span className="text-black/60 dark:text-white">当前标签</span>
                    <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-black/82 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white">
                        #{activeTag}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            startTransition(() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.delete("tag");
                                const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
                                router.replace(nextUrl, { scroll: false });
                            });
                        }}
                        className="text-black/62 underline-offset-4 hover:underline dark:text-white"
                    >
                        清除标签筛选
                    </button>
                </div>
            ) : null}

            <PostSearchInput
                value={query}
                onChange={updateQuery}
                resultCount={filteredPosts.length}
                totalCount={tagFilteredPosts.length}
                className="mb-8"
            />

            {groups.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-black/10 px-5 py-8 text-sm text-black/60 dark:border-white/[0.08] dark:text-white">
                    {activeTag ? `标签 #${activeTag} 下没有符合条件的文章。` : "没有找到匹配的文章，试试标题、标签或作者名。"}
                </div>
            ) : (
                <div className="space-y-10">
                    {groups.map((group) => (
                        <section key={group.year} className="grid gap-4 lg:grid-cols-[6.5rem_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[7rem_minmax(0,1fr)] xl:gap-6">
                            <h2 className="pt-4 font-serif text-3xl font-semibold tracking-tight lg:sticky lg:top-0 lg:self-start">{group.year}</h2>
                            <div>
                                {group.posts.map((post) => (
                                    <div key={post.id} className="mb-4 rounded-[1.15rem] border border-black/8 bg-black/[0.02] px-5 py-5 last:mb-0 dark:border-white/[0.05] dark:bg-white/[0.02] md:flex md:items-start md:justify-between md:gap-6">
                                        <div>
                                            <Link href={`/posts/${post.id}`} className="font-serif text-[1.3rem] font-semibold tracking-tight underline-offset-4 hover:underline focus-visible:underline">
                                                {post.title}
                                            </Link>
                                            {post.description ? (
                                                <div className="mt-2 max-w-2xl text-sm leading-7 text-black/60 dark:text-white">
                                                    {post.description}
                                                </div>
                                            ) : null}
                                        </div>
                                        <span className="shrink-0 pt-1 text-xs opacity-70">{getFormattedDate(post.date)}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
