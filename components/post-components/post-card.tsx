import Link from "next/link";
import getFormattedDate from "@/lib/getFormattedDate";

type Props = {
  post: BlogPost;
};

export default function PostCard({ post }: Props) {
  const { id, title, date, description, author, keywords } = post;
  const formattedDate = getFormattedDate(date);

  return (
    <article className="grid gap-4 py-7 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-8">
      <div className="pt-2 text-sm text-black/46 dark:text-white/44">
        <div className="font-medium">{formattedDate}</div>
        {author ? <div className="mt-3">{author}</div> : null}
      </div>

      <div className="transition-transform duration-200 hover:-translate-y-0.5">
        <Link
          href={"/posts/" + id}
          className="block font-serif text-[2rem] font-semibold leading-[1.15] tracking-tight hover:opacity-75 md:text-[2.3rem]"
        >
          {title}
        </Link>

        <p className="mt-4 max-w-3xl text-base leading-8 text-black/68 dark:text-white/66">
          {description.length > 220 ? description.slice(0, 220) + "..." : description}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-black/46 dark:text-white/46">
          <span>/posts/{id}</span>
          {Array.isArray(keywords) && keywords.length > 0
            ? keywords.map((keyword) => (
              <span
                key={keyword}
                className="text-black/48 dark:text-white/48"
              >
                #{keyword}
              </span>
            ))
            : null}
        </div>
      </div>
    </article>
  );
}
