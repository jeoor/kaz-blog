import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import ScrollToComments from "@/components/scroll-to-comments";
import ShuoshuoComments from "@/components/shuoshuo/shuoshuo-comments";
import ShuoshuoFeed from "@/components/shuoshuo/shuoshuo-feed";
import { getSortedPostsData } from "@/lib/posts";
import { getShuoshuoEntriesData } from "@/lib/shuoshuo";

export default async function ShuoshuoPage() {
    const posts = await getSortedPostsData();
    const moments = await getShuoshuoEntriesData();

    return (
        <BlogShell
            sidebar={<BlogSidebar active="shuoshuo" />}
            aside={<BlogRightRail posts={posts} title="Moments" note="保留日常节奏，和长文形成互补。" />}
            mainClassName="desktop-blog-main-wide"
        >
            <header className="border-b border-black/10 pb-10 dark:border-white/10">
                <div className="max-w-3xl">
                    <p className="eyebrow-label">Shuoshuo</p>
                    <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">日常说说</h1>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-black/82 dark:text-white/80">
                        像一条可回看的微型日志，记录当天发生的事、在意的小结论，以及偶尔的折腾现场。
                    </p>
                </div>
            </header>

            <section className="pt-10">
                <ShuoshuoFeed moments={moments} />
                <ShuoshuoComments />
                <ScrollToComments />
            </section>
        </BlogShell>
    );
}
