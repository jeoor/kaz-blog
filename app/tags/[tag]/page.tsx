import { notFound } from "next/navigation";

import { SITE } from "@/app/site-config";
import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import RenderPosts from "@/components/post-components/render-posts";
import { getSortedPostsData } from "@/lib/posts";
import { decodeTagParam, filterPostsByTag, getAllTags } from "@/lib/tags";

export const revalidate = 60;

export async function generateStaticParams() {
    const posts = await getSortedPostsData();

    return getAllTags(posts).map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: { params: { tag: string } }) {
    const posts = await getSortedPostsData();
    const currentTag = decodeTagParam(params.tag);
    const filteredPosts = filterPostsByTag(posts, currentTag);

    if (filteredPosts.length === 0) {
        return {
            title: "标签不存在",
            description: "你访问的标签不存在或暂时没有文章。",
        };
    }

    return {
        title: `#${currentTag}`,
        description: `查看标签 #${currentTag} 下的 ${filteredPosts.length} 篇文章。`,
        keywords: [currentTag],
        author: SITE.author,
    };
}

export default async function TagPage({ params }: { params: { tag: string } }) {
    const posts = await getSortedPostsData();
    const currentTag = decodeTagParam(params.tag);
    const filteredPosts = filterPostsByTag(posts, currentTag);

    if (filteredPosts.length === 0) {
        notFound();
    }

    return (
        <BlogShell
            sidebar={<BlogSidebar />}
            aside={
                <BlogRightRail
                    posts={posts}
                    title="Tag"
                    note={`当前标签下共 ${filteredPosts.length} 篇文章。`}
                    currentTag={currentTag}
                />
            }
        >
            <header className="border-b border-black/10 pb-8 dark:border-white/10 md:pb-10">
                <div className="max-w-4xl">
                    <p className="eyebrow-label">Tag</p>
                    <h1 className="mt-4 max-w-4xl font-serif text-[2.7rem] font-semibold leading-[1.06] tracking-[-0.04em] md:text-[4.5rem]">
                        #{currentTag}
                    </h1>
                </div>
            </header>

            <section className="pt-8">
                <RenderPosts posts={filteredPosts} />
            </section>
        </BlogShell>
    );
}