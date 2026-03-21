import { SITE } from "@/app/site-config";
import { FRIEND_LINKS } from "@/app/links.config";

export default function LinksPage() {
    return (
        <div className="mx-auto w-full max-w-[76rem] px-4 pb-28 pt-10 md:pt-16">
            <header className="border-b border-black/10 pb-10 dark:border-white/10">
                <div className="max-w-3xl">
                    <p className="eyebrow-label">
                        Links
                    </p>
                    <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                        {SITE.links.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-black/70 dark:text-white/68">
                        {SITE.links.description}
                    </p>
                </div>
            </header>

            {FRIEND_LINKS.length === 0 ? (
                <div className="pt-10 text-sm opacity-80">暂时还没有添加友链。</div>
            ) : (
                <div className="grid grid-cols-1 gap-6 pt-10 md:grid-cols-2">
                    {FRIEND_LINKS.map((item) => (
                        <article key={item.url} className="space-y-3 border-b border-black/10 pb-6 dark:border-white/10">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/40 dark:text-white/40">
                                External Link
                            </div>
                            <a href={item.url} target="_blank" rel="noreferrer" className="font-serif text-[1.65rem] font-semibold leading-tight text-current underline-offset-4 hover:underline">
                                {item.name}
                            </a>
                            {item.description ? <div className="text-sm leading-7 opacity-80">{item.description}</div> : null}
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
