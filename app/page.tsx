import { SITE } from "@/app/site-config";
import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import RenderPosts from "@/components/post-components/render-posts";
import { getSortedPostsData } from "@/lib/posts";

export default async function Home() {
  const posts = await getSortedPostsData();

  return (
    <BlogShell
      sidebar={<BlogSidebar active="home" />}
      aside={<BlogRightRail posts={posts} title="Writing" note="以文章为主，按时间缓慢积累。" />}
    >
      <header className="border-b border-black/10 pb-8 dark:border-white/10 md:pb-10">
        <div className="max-w-4xl">
          <p className="eyebrow-label">Journal</p>
          <h1 className="mt-4 max-w-4xl font-serif text-[2.7rem] font-semibold leading-[1.06] tracking-[-0.04em] md:text-[4.5rem]">
            {SITE.title}
          </h1>
          <p className="mt-5 max-w-3xl text-[1rem] leading-8 text-black/64 dark:text-white/64">
            {SITE.home.intro}
          </p>
        </div>
      </header>

      <section className="pt-8">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-black/8 pb-4 dark:border-white/8">
          <div>
            <h2 className="font-serif text-[2rem] font-semibold tracking-tight md:text-[2.4rem]">最新文章</h2>
          </div>
          <div className="text-sm text-black/46 dark:text-white/46">共 {posts.length} 篇</div>
        </div>

        <RenderPosts posts={posts} />
      </section>
    </BlogShell>
  );
}
