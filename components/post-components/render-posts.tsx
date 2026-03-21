import PostCard from "./post-card";

type Props = {
  posts: BlogPost[];
};

export default function RenderPosts({ posts }: Props) {
  return (
    <div>
      {posts.map((post, index) => (
        <div key={post.id}>
          <PostCard post={post} />
          {index < posts.length - 1 ? <div className="my-1 h-px bg-black/10 opacity-20 dark:bg-white/10" /> : null}
        </div>
      ))}
    </div>
  );
}
