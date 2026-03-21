import PostCard from "./post-card";

type Props = {
  posts: BlogPost[];
};

export default function RenderPosts({ posts }: Props) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id}>
          <PostCard post={post} />
        </div>
      ))}
    </div>
  );
}
