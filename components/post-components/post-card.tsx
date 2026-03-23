"use client";

import Link from "next/link";
import getFormattedDate from "@/lib/getFormattedDate";
import { getTagHref } from "@/lib/tags";

type Props = {
  post: BlogPost;
};

export default function PostCard({ post }: Props) {
  const { id, title, date, description, keywords } = post;
  const formattedDate = getFormattedDate(date);

  return (
    <article className="rounded-[1.25rem] border border-black/8 bg-black/[0.02] px-6 py-6 transition-transform duration-200 hover:-translate-y-0.5 dark:border-white/[0.05] dark:bg-white/[0.02]">
      <div className="text-xs text-black/44 dark:text-white/44">
        <div className="font-medium">{formattedDate}</div>
      </div>

      <div className="mt-3">
        <Link
          href={"/posts/" + id}
          className="block font-serif text-[1.8rem] font-semibold leading-[1.2] tracking-tight underline-offset-4 hover:underline focus-visible:underline md:text-[2.05rem]"
        >
          {title}
        </Link>

        <p className="mt-3 max-w-3xl text-[0.98rem] leading-8 text-black/68 dark:text-white/66">
          {description.length > 220 ? description.slice(0, 220) + "..." : description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-black/46 dark:text-white/46">
          {Array.isArray(keywords) && keywords.length > 0
            ? keywords.map((keyword) => (
              <Link
                key={keyword}
                href={getTagHref(keyword)}
                className="rounded-full border border-black/8 bg-white/72 px-2.5 py-1 text-black/48 transition hover:border-black/14 hover:text-black dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/48 dark:hover:border-white/[0.1] dark:hover:text-white"
              >
                #{keyword}
              </Link>
            ))
            : null}
        </div>
      </div>
    </article>
  );
}
