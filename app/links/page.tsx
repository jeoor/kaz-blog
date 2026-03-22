import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import { SITE } from "@/app/site-config";
import { FRIEND_LINKS } from "@/app/links.config";
import { getSortedPostsData } from "@/lib/posts";
import Image from "next/image";

export default async function LinksPage() {
    const posts = await getSortedPostsData();

    return (
        <BlogShell
            sidebar={<BlogSidebar active="links" />}
            aside={<BlogRightRail posts={posts} title="Links" note="保留长期值得访问的站点和入口。" />}
        >
            <header className="border-b border-black/10 pb-10 dark:border-white/10">
                <div className="max-w-3xl">
                    <p className="eyebrow-label">
                        Links
                    </p>
                    <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                        {SITE.links.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-black/82 dark:text-white/80">
                        {SITE.links.description}
                    </p>
                </div>
            </header>

            {FRIEND_LINKS.length === 0 ? (
                <div className="pt-10 text-sm opacity-80">暂时还没有添加友链。</div>
            ) : (
                <div className="grid grid-cols-1 gap-6 pt-10 md:grid-cols-2">
                    {FRIEND_LINKS.map((item) => (
                        <article key={item.url} className="space-y-3 rounded-[1.25rem] border border-black/8 bg-black/[0.02] px-5 py-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 text-current no-underline"
                            >
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-black/8 bg-white/70 dark:border-white/[0.05] dark:bg-white/[0.02]">
                                    {item.avatar ? (
                                        <Image
                                            src={item.avatar}
                                            alt={item.name}
                                            fill
                                            sizes="40px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="grid h-full w-full place-items-center text-sm font-semibold text-black/70 dark:text-white/70">
                                            {item.name.trim().slice(0, 1).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-serif text-[1.65rem] font-semibold leading-tight underline-offset-4 hover:underline">
                                        {item.name}
                                    </div>
                                </div>
                            </a>
                            {item.description ? <div className="text-sm leading-7 opacity-80">{item.description}</div> : null}
                        </article>
                    ))}
                </div>
            )}
        </BlogShell>
    );
}
