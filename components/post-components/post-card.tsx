"use client";

import Link from "next/link";
import getFormattedDate from "@/lib/getFormattedDate";
import { getTagHref } from "@/lib/tags";

type Props = {
  post: BlogPost;
};

export default function PostCard({ post }: Props) {
  const { id, title, date, description, keywords, author, cover } = post;
  const formattedDate = getFormattedDate(date);
  const shortDescription = description.length > 220 ? description.slice(0, 220) + "..." : description;
  const hasCover = Boolean(cover);

  return (
    <article className="relative overflow-hidden rounded-[1.25rem] border border-black/8 bg-black/[0.02] p-4 transition-transform duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] dark:bg-white/[0.02] md:p-5">
      {hasCover ? (
        <Link
          href={"/posts/" + id}
          aria-label={`${title} 封面`}
          className="group absolute inset-y-0 right-0 hidden w-[16.5rem] overflow-hidden md:flex md:items-stretch md:justify-end"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={title}
            className="h-full w-auto max-w-none"
            loading="lazy"
          />
        </Link>
      ) : null}

      <div className={[hasCover ? "md:pr-[17.5rem]" : ""].join(" ")}>
        <div className="min-w-0">
          <div className="text-xs text-black/44 dark:text-white/44">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
              <span>{formattedDate}</span>
              {author ? <span className="opacity-70">·</span> : null}
              {author ? <span>作者：{author}</span> : null}
            </div>
          </div>

          <Link
            href={"/posts/" + id}
            className="mt-3 block font-serif text-[1.8rem] font-semibold leading-[1.2] tracking-tight underline-offset-4 hover:underline focus-visible:underline md:text-[2.05rem]"
          >
            {title}
          </Link>

          <p className="mt-3 max-w-3xl text-[0.98rem] leading-8 text-black/68 dark:text-white/66">
            {shortDescription}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-black/46 dark:text-white/46">
            {Array.isArray(keywords) && keywords.length > 0
              ? keywords.map((keyword) => (
                <Link
                  key={keyword}
                  href={getTagHref(keyword)}
                  className="rounded-full border border-black/8 bg-white/72 px-2.5 py-1 text-black/48 transition hover:border-black/14 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/48 dark:hover:border-white/[0.1]"
                >
                  #{keyword}
                </Link>
              ))
              : null}
          </div>
        </div>
      </div>
    </article>
  );
}
