import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import RightRail from "@/components/layout/right-rail/right-rail";
import WidgetCard from "@/components/layout/right-rail/widget-card";
import { getAboutContent } from "@/lib/about-content";

type RenderSection = {
    title: string;
    contentHtml: string;
};

export default async function AboutPage() {
    const about = await getAboutContent();

    const title = about?.title?.trim() || "关于";
    const description = about?.description?.trim() || "";
    const profile = {
        name: about?.profile?.name?.trim() || "",
        role: about?.profile?.role?.trim() || "",
        note: about?.profile?.note?.trim() || "",
    };
    const introHtml = about?.introHtml?.trim();
    const mdSections = (about?.sections ?? []).filter((section) => section.title?.trim());
    const sections: RenderSection[] = mdSections.length ? mdSections : [];

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
                                    <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">{profile.name}</h2>
                                    <p className="mt-2 text-sm text-black/68 dark:text-white/68">{profile.role}</p>
                                    <p className="mt-4 text-sm leading-7 text-black/76 dark:text-white/74">{profile.note}</p>
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
                        {title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-black/82 dark:text-white/80">
                        {description}
                    </p>
                </div>
            </header>

            <section className="pt-10">
                <div className="max-w-4xl space-y-6">
                    <article>
                        <p className="eyebrow-label">
                            Intro
                        </p>
                        {introHtml ? (
                            <div
                                className="markdown mt-4 text-base leading-8 text-black/82 dark:text-white/80"
                                dangerouslySetInnerHTML={{ __html: introHtml }}
                            />
                        ) : null}
                    </article>

                    <div className="grid gap-5">
                        {sections.map((section) => (
                            <article
                                key={section.title}
                                className="rounded-[1.25rem] border border-black/8 bg-black/[0.02] px-5 py-5 dark:border-white/[0.05] dark:bg-white/[0.02]"
                            >
                                <h2 className="font-serif text-2xl font-semibold tracking-tight">{section.title}</h2>
                                <div
                                    className="markdown mt-4 text-sm leading-8 text-black/68 dark:text-white/66"
                                    dangerouslySetInnerHTML={{ __html: section.contentHtml }}
                                />
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </BlogShell>
    );
}