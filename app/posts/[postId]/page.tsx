import { getSortedPostsData, getPostData } from "@/lib/posts";
import { notFound } from "next/navigation";
import { SITE } from "@/app/site-config";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import ArticleBody from "@/components/post-components/article-body";
import ArticleToc from "@/components/post-components/article-toc";
import TwikooComments from "@/components/comments/twikoo-comments";
import ScrollToComments from "@/components/scroll-to-comments";
import { getTagHref } from "@/lib/tags";
import Link from "next/link";

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
  let postData: Awaited<ReturnType<typeof getPostData>>;
  try {
    postData = await getPostData(postId);
  } catch {
    notFound();
  }
  const { title, contentHtml, description, toc } = postData;

  return (
    <BlogShell
      sidebar={<BlogSidebar active="home" />}
      aside={<ArticleToc items={toc} />}
      mainClassName="min-w-0"
    >
      <article className="min-w-0">
        <div className="min-w-0">
          <header className="border-b border-black/10 pb-10 dark:border-white/10">
            <h1 className="max-w-4xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl xl:text-[3.8rem]">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-[1.02rem] leading-8 text-black/62 dark:text-white/62">
              {description}
            </p>
            {Array.isArray(page.keywords) && page.keywords.length > 0 ? (
              <div className="mt-5 flex max-w-3xl flex-wrap gap-3 text-xs text-black/48 dark:text-white/48">
                {page.keywords.map((keyword) => (
                  <Link
                    key={keyword}
                    href={getTagHref(keyword)}
                    className="rounded-full border border-black/8 bg-black/[0.02] px-2.5 py-1 transition hover:border-black/14 hover:text-black dark:border-white/[0.05] dark:bg-white/[0.02] dark:hover:border-white/[0.1] dark:hover:text-white"
                  >
                    #{keyword}
                  </Link>
                ))}
              </div>
            ) : null}
          </header>

          <div className="pt-10 lg:grid lg:grid-cols-[minmax(0,48rem)_18rem] lg:items-start lg:gap-10 xl:block">
            <div className="min-w-0">
              <ArticleToc items={toc} mode="mobile-sheet" className="lg:hidden" />
              <ArticleBody contentHtml={contentHtml} />
              <ScrollToComments />
              <TwikooComments />
            </div>

            <div className="hidden xl:hidden lg:block sticky top-24 self-start">
              <ArticleToc items={toc} />
            </div>
          </div>
        </div>
      </article>
    </BlogShell>
  );
}
