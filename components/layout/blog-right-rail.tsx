import Link from "next/link";

import getFormattedDate from "@/lib/getFormattedDate";

type Props = {
  posts: BlogPost[];
  title?: string;
  note?: string;
};

function buildTopTags(posts: BlogPost[]) {
  const tagCount = new Map<string, number>();

  posts.forEach((post) => {
    post.keywords.forEach((keyword) => {
      tagCount.set(keyword, (tagCount.get(keyword) || 0) + 1);
    });
  });

  return Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

export default function BlogRightRail({ posts, title = "站点概览", note }: Props) {
  const latest = posts[0];
  const totalPosts = posts.length;
  const topTags = buildTopTags(posts);
  const recentPosts = posts.slice(0, 4);
  const totalTags = new Set(posts.flatMap((post) => post.keywords)).size;

  return (
    <div className="sticky top-8 space-y-4">
      <section className="rounded-[1.35rem] border border-black/8 bg-black/[0.02] p-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/40">
          {title}
        </div>
        {note ? <p className="mt-3 text-sm leading-7 text-black/62 dark:text-white/60">{note}</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[1rem] border border-black/8 bg-white/70 px-3 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <div className="text-[10px] uppercase tracking-[0.24em] text-black/38 dark:text-white/38">文章</div>
            <div className="mt-2 font-serif text-2xl font-semibold">{totalPosts}</div>
          </div>
          <div className="rounded-[1rem] border border-black/8 bg-white/70 px-3 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <div className="text-[10px] uppercase tracking-[0.24em] text-black/38 dark:text-white/38">标签</div>
            <div className="mt-2 font-serif text-2xl font-semibold">{totalTags}</div>
          </div>
        </div>
        {latest ? (
          <div className="mt-4 rounded-[1rem] border border-black/8 bg-white/70 px-4 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <div className="text-[10px] uppercase tracking-[0.24em] text-black/38 dark:text-white/38">最近更新</div>
            <div className="mt-2 text-sm leading-7 text-black/72 dark:text-white/72">{getFormattedDate(latest.date)}</div>
            <div className="mt-1 text-sm leading-7 text-black/58 dark:text-white/58">{latest.title}</div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.35rem] border border-black/8 bg-black/[0.02] p-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/40">
          Recent
        </div>
        <ul className="mt-4 space-y-3">
          {recentPosts.map((post) => (
            <li key={post.id} className="border-t border-black/8 pt-3 first:border-t-0 first:pt-0 dark:border-white/[0.05]">
              <Link href={`/posts/${post.id}`} className="text-sm leading-7 text-black/72 hover:text-black dark:text-white/72 dark:hover:text-white">
                {post.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {topTags.length > 0 ? (
        <section className="rounded-[1.35rem] border border-black/8 bg-black/[0.02] p-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/40">
            Tags
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="rounded-full border border-black/8 bg-white/78 px-3 py-1.5 text-xs text-black/62 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/62"
              >
                #{tag} {count}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}