import PostsContainer from "@/components/posts-container";
import { SITE } from "@/app/site-config";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[76rem] px-4 pb-28 pt-10 md:pt-16">
      <header className="border-b border-black/10 pb-10 dark:border-white/10 md:pb-12">
        <div className="max-w-4xl">
          <div className="eyebrow-label">
            {SITE.home.eyebrow}
          </div>
          <h1 className="mt-5 max-w-4xl font-serif text-[3.25rem] font-semibold leading-[1.04] tracking-[-0.04em] md:text-[5.2rem]">
            {SITE.title}
          </h1>
          <p className="mt-6 max-w-3xl text-[1.02rem] leading-8 text-black/64 dark:text-white/64">
            {SITE.home.intro}
          </p>
        </div>
      </header>

      <section className="pt-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow-label">
              Recent Writing
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight md:text-[2.8rem]">
              最新文章
            </h2>
          </div>
          <div className="text-sm text-black/48 dark:text-white/48">
            {SITE.home.note}
          </div>
        </div>

        <PostsContainer />
      </section>
    </div>
  );
}
