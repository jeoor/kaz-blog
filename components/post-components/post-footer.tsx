import Link from "next/link";

import { SITE } from "@/app/site-config";
import getFormattedDate from "@/lib/getFormattedDate";

type QrItem = {
    label: string;
    src?: string;
    alt?: string;
};

type Props = {
    posts: BlogPost[];
    currentPost: BlogPost;
};

function getPrevNext(posts: BlogPost[], currentId: string) {
    const index = posts.findIndex((post) => post.id === currentId);
    if (index < 0) return { prev: null as BlogPost | null, next: null as BlogPost | null };

    // `getSortedPostsData()` is newest -> oldest.
    const newer = index > 0 ? posts[index - 1] : null;
    const older = index < posts.length - 1 ? posts[index + 1] : null;

    return {
        prev: older,
        next: newer,
    };
}

function getRelatedPosts(posts: BlogPost[], current: BlogPost, limit = 6) {
    const currentKeywords = new Set((current.keywords || []).map((keyword) => keyword.trim()).filter(Boolean));
    if (currentKeywords.size === 0) return [];

    const scored = posts
        .filter((post) => post.id !== current.id)
        .map((post) => {
            const keywords = (post.keywords || []).map((keyword) => keyword.trim()).filter(Boolean);
            let score = 0;
            for (const keyword of keywords) {
                if (currentKeywords.has(keyword)) score += 1;
            }
            return { post, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.post.date).getTime() - new Date(a.post.date).getTime();
        })
        .slice(0, limit)
        .map(({ post }) => post);

    return scored;
}

export default function PostFooter({ posts, currentPost }: Props) {
    const disclaimerText = SITE.postFooter?.disclaimer?.trim();
    const qrcodes = (SITE.postFooter?.qrcodes ?? []) as QrItem[];

    const { prev, next } = getPrevNext(posts, currentPost.id);
    const related = getRelatedPosts(posts, currentPost, 6);

    const hasQr = Array.isArray(qrcodes) && qrcodes.length > 0;

    if (!disclaimerText && !hasQr && !prev && !next && related.length === 0) return null;

    return (
        <section className="mt-10 space-y-6">
            {disclaimerText ? (
                <div className="rounded-[1.25rem] border border-black/8 bg-black/[0.02] px-6 py-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                        免责声明
                    </div>
                    <div className="text-sm leading-7 text-black/62 dark:text-white/62">
                        {disclaimerText}
                    </div>
                </div>
            ) : null}

            {hasQr ? (
                <div className="grid grid-cols-1 gap-4 rounded-[1.25rem] border border-black/8 bg-black/[0.02] p-5 dark:border-white/[0.05] dark:bg-white/[0.02] sm:grid-cols-2">
                    {qrcodes.map((item) => {
                        const label = item.label?.trim() || "二维码";
                        const alt = item.alt?.trim() || label;
                        const src = item.src?.trim();

                        return (
                            <div key={label} className="mx-auto w-full max-w-[15rem] space-y-3">
                                <div className="aspect-square overflow-hidden rounded-[1.1rem] border border-black/8 bg-white/70 dark:border-white/[0.06] dark:bg-white/[0.02]">
                                    {src ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={src}
                                            alt={alt}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="grid h-full w-full place-items-center px-6 text-center text-sm text-black/55 dark:text-white/55">
                                            在 SITE.postFooter.qrcodes 配置图片
                                        </div>
                                    )}
                                </div>
                                <div className="text-center text-xs font-medium text-black/52 dark:text-white/52">
                                    {label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {prev || next ? (
                <div className={`grid grid-cols-1 gap-4 ${prev && next ? "md:grid-cols-2" : ""}`}>
                    {prev ? (
                        <div className="rounded-[1.25rem] border border-black/8 bg-black/[0.02] px-6 py-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                                上一篇
                            </div>
                            <Link
                                href={`/posts/${prev.id}`}
                                className="block font-serif text-lg font-semibold leading-snug underline-offset-4 hover:underline focus-visible:underline"
                            >
                                {prev.title}
                            </Link>
                        </div>
                    ) : null}

                    {next ? (
                        <div className="rounded-[1.25rem] border border-black/8 bg-black/[0.02] px-6 py-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                                下一篇
                            </div>
                            <Link
                                href={`/posts/${next.id}`}
                                className="block font-serif text-lg font-semibold leading-snug underline-offset-4 hover:underline focus-visible:underline"
                            >
                                {next.title}
                            </Link>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {related.length > 0 ? (
                <div className="rounded-[1.25rem] border border-black/8 bg-black/[0.02] px-6 py-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <div className="mb-3 flex items-center justify-between gap-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                            相关文章
                        </div>
                    </div>

                    <ul className="space-y-3 text-sm">
                        {related.map((post) => (
                            <li key={post.id} className="flex items-baseline justify-between gap-4">
                                <Link
                                    href={`/posts/${post.id}`}
                                    className="min-w-0 flex-1 truncate underline-offset-4 hover:underline focus-visible:underline"
                                >
                                    {post.title}
                                </Link>
                                <span className="shrink-0 text-xs text-black/45 dark:text-white/45">
                                    {getFormattedDate(post.date)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </section>
    );
}
