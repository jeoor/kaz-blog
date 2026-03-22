import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import RightRail from "@/components/layout/right-rail/right-rail";
import WidgetCard from "@/components/layout/right-rail/widget-card";
import { SITE } from "@/app/site-config";

export default function AboutPage() {
    return (
        <BlogShell
            sidebar={<BlogSidebar active="about" />}
            aside={
                <RightRail
                    className="sticky top-8"
                    widgets={[
                        {
                            key: "profile",
                            node: (
                                <WidgetCard title="Profile">
                                    <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">{SITE.about.profile.name}</h2>
                                    <p className="mt-2 text-sm text-black/68 dark:text-white/68">{SITE.about.profile.role}</p>
                                    <p className="mt-4 text-sm leading-7 text-black/76 dark:text-white/74">{SITE.about.profile.note}</p>
                                </WidgetCard>
                            ),
                        },
                        {
                            key: "sections",
                            node: (
                                <WidgetCard title="Sections">
                                    <ul className="mt-4 space-y-3 text-sm text-black/74 dark:text-white/72">
                                        <li>文章：适合完整表达和长期更新</li>
                                        <li>归档：适合梳理时间线和回看内容</li>
                                        <li>友链：适合保留长期访问入口</li>
                                        <li>关于：适合说明站点定位和维护方式</li>
                                    </ul>
                                </WidgetCard>
                            ),
                        },
                    ]}
                />
            }
        >
            <header className="border-b border-black/10 pb-10 dark:border-white/10">
                <div className="max-w-3xl">
                    <p className="eyebrow-label">
                        About
                    </p>
                    <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                        {SITE.about.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-black/82 dark:text-white/80">
                        {SITE.about.description}
                    </p>
                </div>
            </header>

            <section className="pt-10">
                <div className="max-w-4xl space-y-6">
                    <article>
                        <p className="eyebrow-label">
                            Intro
                        </p>
                        <p className="mt-4 text-base leading-8 text-black/82 dark:text-white/80">
                            {SITE.about.intro}
                        </p>
                    </article>

                    <div className="grid gap-5">
                        {SITE.about.sections.map((section) => (
                            <article
                                key={section.title}
                                className="rounded-[1.25rem] border border-black/8 bg-black/[0.02] px-5 py-5 dark:border-white/[0.05] dark:bg-white/[0.02]"
                            >
                                <h2 className="font-serif text-2xl font-semibold tracking-tight">{section.title}</h2>
                                <p className="mt-4 text-sm leading-8 text-black/68 dark:text-white/66">{section.content}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </BlogShell>
    );
}