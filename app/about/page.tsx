import { SITE } from "@/app/site-config";

export default function AboutPage() {
    return (
        <div className="mx-auto w-full max-w-[76rem] px-4 pb-28 pt-10 md:pt-16">
            <header className="border-b border-black/10 pb-10 dark:border-white/10">
                <div className="max-w-3xl">
                    <p className="eyebrow-label">
                        About
                    </p>
                    <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                        {SITE.about.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-black/70 dark:text-white/68">
                        {SITE.about.description}
                    </p>
                </div>
            </header>

            <section className="grid gap-8 pt-10 md:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-6">
                    <article>
                        <p className="eyebrow-label">
                            Intro
                        </p>
                        <p className="mt-4 text-base leading-8 text-black/70 dark:text-white/68">
                            {SITE.about.intro}
                        </p>
                    </article>

                    <div className="grid gap-5">
                        {SITE.about.sections.map((section) => (
                            <article
                                key={section.title}
                                className="border-t border-black/10 pt-6 dark:border-white/10"
                            >
                                <h2 className="font-serif text-2xl font-semibold tracking-tight">{section.title}</h2>
                                <p className="mt-4 text-sm leading-8 text-black/68 dark:text-white/66">{section.content}</p>
                            </article>
                        ))}
                    </div>
                </div>

                <aside className="space-y-6 md:sticky md:top-24 md:self-start">
                    <div>
                        <p className="eyebrow-label">
                            Profile
                        </p>
                        <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">
                            {SITE.about.profile.name}
                        </h2>
                        <p className="mt-2 text-sm text-black/58 dark:text-white/58">
                            {SITE.about.profile.role}
                        </p>
                        <p className="mt-4 text-sm leading-7 text-black/66 dark:text-white/64">
                            {SITE.about.profile.note}
                        </p>
                    </div>

                    <div className="border-t border-black/10 pt-6 dark:border-white/10">
                        <p className="eyebrow-label">
                            Sections
                        </p>
                        <ul className="mt-4 space-y-3 text-sm text-black/64 dark:text-white/62">
                            <li>文章：适合完整表达和长期更新</li>
                            <li>归档：适合梳理时间线和回看内容</li>
                            <li>友链：适合保留长期访问入口</li>
                            <li>关于：适合说明站点定位和维护方式</li>
                        </ul>
                    </div>
                </aside>
            </section>
        </div>
    );
}