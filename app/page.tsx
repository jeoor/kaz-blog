import Link from "next/link";

import { SITE } from "@/app/site-config";
import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import Pagination from "@/components/pagination";
import RenderPosts from "@/components/post-components/render-posts";
import { getSortedPostsData } from "@/lib/posts";

function toPositiveInteger(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(normalized || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getPageHref(page: number) {
  return page <= 1 ? "/" : `/?page=${page}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: { page?: string | string[] };
}) {
  const posts = await getSortedPostsData();
  const pageSize = Math.max(1, SITE.home.pageSize || 6);
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const currentPage = Math.min(toPositiveInteger(searchParams?.page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visiblePosts = posts.slice(startIndex, startIndex + pageSize);
  const startLabel = posts.length === 0 ? 0 : startIndex + 1;
  const endLabel = Math.min(startIndex + visiblePosts.length, posts.length);

  return (
    <BlogShell
      sidebar={<BlogSidebar active="home" />}
      aside={<BlogRightRail posts={posts} title="Writing" note="以文章为主，按时间缓慢积累。" />}
    >
      <section>
        <RenderPosts posts={visiblePosts} />

        <Pagination
          ariaLabel="首页分页"
          currentPage={currentPage}
          totalPages={totalPages}
          getPageHref={getPageHref}
        />
      </section>
    </BlogShell>
  );
}
