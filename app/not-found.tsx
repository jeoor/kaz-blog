import Link from "next/link";

import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import { getSortedPostsData } from "@/lib/posts";

export default async function NotFoundPage() {
    const posts = await getSortedPostsData();

    return (
        <BlogShell
            sidebar={<BlogSidebar />}
            aside={<BlogRightRail posts={posts} title="Not Found" note="页面没找到，但站点内容还在。可以从归档、最近文章或标签继续读。" />}
            mainClassName="desktop-blog-main-wide"
        >
            <section className="border-b border-black/10 pb-10 dark:border-white/10 md:pb-12">
                <div className="max-w-4xl">
                    <p className="eyebrow-label">404</p>
                    <h1 className="mt-4 font-serif text-[2.7rem] font-semibold leading-[1.06] tracking-[-0.04em] md:text-[4.6rem]">
                        这页不在这里。
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-8 text-black/72 dark:text-white/72">
                        你访问的地址可能已经移动、写错，或者这篇内容还没有公开。这个博客仍然按文章、归档和标签组织，回到阅读路径会更快。
                    </p>
                </div>
            </section>

            <section className="grid gap-4 pt-8 md:grid-cols-3">
                <Link
                    href="/"
                    className="rounded-[1.35rem] border border-black/8 bg-black/[0.02] px-5 py-5 transition hover:border-black/14 hover:bg-black/[0.035] dark:border-white/[0.05] dark:bg-white/[0.02] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.04]"
                >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/40 dark:text-white/40">Home</div>
                    <div className="mt-3 font-serif text-[1.45rem] font-semibold tracking-tight">回到首页</div>
                    <p className="mt-2 text-sm leading-7 text-black/62 dark:text-white/62">
                        从最新文章继续往下看。
                    </p>
                </Link>

                <Link
                    href="/archive"
                    className="rounded-[1.35rem] border border-black/8 bg-black/[0.02] px-5 py-5 transition hover:border-black/14 hover:bg-black/[0.035] dark:border-white/[0.05] dark:bg-white/[0.02] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.04]"
                >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/40 dark:text-white/40">Archive</div>
                    <div className="mt-3 font-serif text-[1.45rem] font-semibold tracking-tight">查看归档</div>
                    <p className="mt-2 text-sm leading-7 text-black/62 dark:text-white/62">
                        按时间回看全部写作内容。
                    </p>
                </Link>

                <Link
                    href="/about"
                    className="rounded-[1.35rem] border border-black/8 bg-black/[0.02] px-5 py-5 transition hover:border-black/14 hover:bg-black/[0.035] dark:border-white/[0.05] dark:bg-white/[0.02] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.04]"
                >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/40 dark:text-white/40">About</div>
                    <div className="mt-3 font-serif text-[1.45rem] font-semibold tracking-tight">了解站点</div>
                    <p className="mt-2 text-sm leading-7 text-black/62 dark:text-white/62">
                        看看这个博客在写什么、为什么这样组织。
                    </p>
                </Link>
            </section>

            <section className="mt-8 rounded-[1.45rem] border border-black/8 bg-black/[0.02] px-6 py-6 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/40">Hint</div>
                <p className="mt-4 max-w-3xl text-sm leading-8 text-black/68 dark:text-white/68">
                    如果你是从旧链接、标签页或收藏夹过来的，可能是路径规则已经调整。优先尝试首页、归档，或从右侧最近文章和标签重新进入。
                </p>
            </section>
        </BlogShell>
    );
}