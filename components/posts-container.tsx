import { getSortedPostsData } from "@/lib/posts";
import RenderPosts from "./post-components/render-posts";

export default async function PostsContainer() {
  const posts = await getSortedPostsData();

  return (
    <section className="w-full">
      <RenderPosts posts={posts} />
    </section>
  );
}
