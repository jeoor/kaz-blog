import { getSortedPostsData, getPostData } from "@/lib/posts";
import { notFound } from "next/navigation";
import { SITE } from "@/app/site-config";
import ArticleBody from "@/components/post-components/article-body";
import ArticleToc from "@/components/post-components/article-toc";

export async function generateStaticParams() {
  const posts = await getSortedPostsData();
  return posts.map((post) => ({
    postId: post.id,
  }));
}

export async function generateMetadata({ params }: { params: { postId: string } }) {
  const posts = await getSortedPostsData();
  const { postId } = params;

  const post = posts.find((post) => post.id === postId);

  if (!post) {
    return {
      title: "文章不存在",
      description: "你访问的文章不存在或已经被移除。",
      keywords: [],
      author: SITE.author,
    };
  }

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    author: post.author,
  };
}

export default async function Post({ params }: { params: { postId: string } }) {
  const posts = await getSortedPostsData();
  const { postId } = params;
  const page = posts.find((post) => post.id === postId);
  if (!page) notFound();
  const { title, contentHtml, description, toc } = await getPostData(postId);

  return (
    <div className="mx-auto w-full max-w-[76rem] px-4 pb-28 pt-10 md:pt-16">
      <article className="article-layout">
        <div className="article-content">
          <header className="border-b border-black/10 pb-10 dark:border-white/10">
            <div className="eyebrow-label">
              {SITE.title}
            </div>
            <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl xl:text-[3.8rem]">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-[1.02rem] leading-8 text-black/62 dark:text-white/62">
              {description}
            </p>
          </header>

          <div className="max-w-3xl pt-10">
            <ArticleToc items={toc} mode="mobile-sheet" className="md:hidden" />
            <ArticleToc items={toc} className="mb-10 hidden border-b border-black/10 pb-8 md:block xl:hidden dark:border-white/10" />
            <ArticleBody contentHtml={contentHtml} />
          </div>
        </div>

        <aside className="article-column">
          <ArticleToc items={toc} />
        </aside>
      </article>
    </div>
  );
}
