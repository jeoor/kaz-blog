import { Suspense } from "react";

import { SITE } from "@/site-config";
import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import HomePosts from "@/components/home-posts";
import { getSortedPostsData } from "@/lib/posts";

export const revalidate = 60;

export default async function Home() {
  const posts = await getSortedPostsData();
  const pageSize = Math.max(1, SITE.home.pageSize || 6);

  return (
    <BlogShell
      sidebar={<BlogSidebar active="home" />}
      aside={<BlogRightRail posts={posts} title="Writing" note="以文章为主，按时间缓慢积累。" />}
    >
      <Suspense fallback={null}>
        <HomePosts posts={posts} pageSize={pageSize} />
      </Suspense>
    </BlogShell>
  );
}
