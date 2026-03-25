import { Suspense } from "react";

import ArchivePosts from "@/components/archive-posts";
import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import { SITE } from "@/app/site-config";
import { getSortedPostsData } from "@/lib/posts";

export const revalidate = 60;

export default async function ArchivePage() {
    const posts = await getSortedPostsData();

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

            <Suspense fallback={null}>
                <ArchivePosts posts={posts} />
            </Suspense>
        </BlogShell>
    );
}
