import Link from "next/link";

import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import { SITE } from "@/app/site-config";
import getFormattedDate from "@/lib/getFormattedDate";
import { getSortedPostsData } from "@/lib/posts";

export const revalidate = 60;

type ArchiveGroup = {
    year: number;
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

export default async function ArchivePage() {
    const posts = await getSortedPostsData();
    const groups = groupPostsByYear(posts);

    return (
        <BlogShell
            sidebar={<BlogSidebar active="archive" />}
            aside={<BlogRightRail posts={posts} title="Archive" note="按年份回看写作轨迹与更新节奏。" />}
            mainClassName="desktop-blog-main-wide"
        >
            <header className="border-b border-black/10 pb-10 dark:border-white/10">
                <div className="max-w-3xl">
                    <p className="eyebrow-label">
                        Archive
                    </p>
                    <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                        {SITE.archive.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-black/82 dark:text-white/80">
                        {SITE.archive.description}
                    </p>
                </div>
            </header>

            {groups.length === 0 ? (
                <div className="pt-10 text-sm opacity-80">暂无文章</div>
            ) : (
                <div className="space-y-10 pt-10">
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
                                                <div className="mt-2 max-w-2xl text-sm leading-7 text-black/60 dark:text-white/60">
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
        </BlogShell>
    );
}
