import Link from "next/link";

import { SITE } from "@/app/site-config";
import getFormattedDate from "@/lib/getFormattedDate";
import { getSortedPostsData } from "@/lib/posts";

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
        <div className="mx-auto w-full max-w-[76rem] px-4 pb-28 pt-10 md:pt-16">
            <header className="border-b border-black/10 pb-10 dark:border-white/10">
                <div className="max-w-3xl">
                    <p className="eyebrow-label">
                        Archive
                    </p>
                    <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                        {SITE.archive.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-black/70 dark:text-white/68">
                        {SITE.archive.description}
                    </p>
                </div>
            </header>

            {groups.length === 0 ? (
                <div className="pt-10 text-sm opacity-80">暂无文章</div>
            ) : (
                <div className="space-y-10 pt-10">
                    {groups.map((group) => (
                        <section key={group.year} className="grid gap-4 lg:grid-cols-[9rem_minmax(0,1fr)] lg:gap-6">
                            <h2 className="pt-4 font-serif text-3xl font-semibold tracking-tight">{group.year}</h2>
                            <div>
                                {group.posts.map((post) => (
                                    <div key={post.id} className="flex flex-col gap-2 border-b border-black/8 py-5 first:pt-0 last:border-b-0 last:pb-0 dark:border-white/8 md:flex-row md:items-start md:justify-between md:gap-6">
                                        <div>
                                            <Link href={`/posts/${post.id}`} className="font-serif text-[1.3rem] font-semibold tracking-tight hover:opacity-70">
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
        </div>
    );
}
