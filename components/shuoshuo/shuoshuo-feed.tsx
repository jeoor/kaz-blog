"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SITE } from "@/site-config";
import type { ShuoshuoItem } from "@/content/shuoshuo";
import ShuoshuoCommentButton from "@/components/shuoshuo/shuoshuo-comment-button";
import { useAuth } from "@/lib/auth-context";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";

type LightboxItem = {
    src: string;
    alt: string;
    caption: string;
};

type ParsedMomentImage = {
    src: string;
    alt: string;
};

type ParsedMomentBody = {
    paragraphs: string[];
    images: ParsedMomentImage[];
};

type Props = {
    moments: ShuoshuoItem[];
};

function getDisplayDate(date: string) {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) {
        return { day: "--", month: "--", yearShort: "--", time: "--:--" };
    }

    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const yearShort = String(value.getFullYear()).slice(-2);
    const time = value.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    return { day, month, yearShort, time };
}

function parseMomentBody(body: string): ParsedMomentBody {
    const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
    const paragraphs: string[] = [];
    const images: ParsedMomentImage[] = [];
    const imageRegex = /^!\[([^\]]*)\]\(([^\s)]+(?:\s+"[^"]*")?)\)$/;

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const imageMatch = imageRegex.exec(trimmed);
        if (imageMatch) {
            const alt = String(imageMatch[1] || "").trim();
            const raw = String(imageMatch[2] || "").trim();
            const src = raw.replace(/\s+"[^"]*"$/, "");
            if (src) images.push({ src, alt });
            return;
        }

        paragraphs.push(line);
    });

    return { paragraphs, images };
}

function getCommentQuote(paragraphs: string[]) {
    const textLines = paragraphs.length ? paragraphs : ["这条说说很有共鸣。"];
    return `${textLines.map((line) => `> ${line}`).join("\n")}\n\n`;
}

export default function ShuoshuoFeed({ moments }: Props) {
    const [items, setItems] = useState<LightboxItem[]>([]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const { isLoggedIn } = useAuth();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [localMoments, setLocalMoments] = useState(moments);
    const parsedMoments = useMemo(
        () => localMoments.map((moment) => ({ ...moment, parsed: parseMomentBody(moment.body) })),
        [localMoments]
    );

    useEffect(() => {
        if (activeIndex === null) {
            document.body.style.overflow = "";
            return;
        }

        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [activeIndex]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (activeIndex === null) return;
            if (event.key === "Escape") {
                setActiveIndex(null);
            }
            if (event.key === "ArrowRight") {
                setActiveIndex((current) => {
                    if (current === null || items.length === 0) return current;
                    return (current + 1) % items.length;
                });
            }
            if (event.key === "ArrowLeft") {
                setActiveIndex((current) => {
                    if (current === null || items.length === 0) return current;
                    return (current - 1 + items.length) % items.length;
                });
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [activeIndex, items.length]);

    function openLightbox(momentsIndex: number, imageIndex: number) {
        const nextItems = parsedMoments.flatMap((moment) =>
            moment.parsed.images.map((image) => ({
                src: image.src,
                alt: image.alt,
                caption: image.alt,
            }))
        );

        const nextIndex = parsedMoments
            .slice(0, momentsIndex)
            .reduce((count, moment) => count + moment.parsed.images.length, 0) + imageIndex;

        setItems(nextItems);
        setActiveIndex(nextIndex);
    }

    async function handleDeleteMoment(slug: string) {
        if (!confirm(`确认删除这条说说「${slug}」吗？此操作不可撤销。`)) return;
        setDeletingId(slug);
        try {
            const res = await fetch(adminApiUrl(`/api/admin/posts?slug=${encodeURIComponent(slug)}`), {
                method: "DELETE",
                credentials: adminCredentials(),
            });
            if (res.ok) {
                setLocalMoments((prev) => prev.filter((m) => m.id !== slug));
            } else {
                const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
                alert(String(data?.message || "删除失败"));
            }
        } catch {
            alert("删除请求失败");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <>
            <div className="relative">
                <div className="pointer-events-none absolute bottom-8 left-[2.05rem] top-2 hidden w-px bg-gradient-to-b from-black/14 via-black/8 to-transparent dark:from-white/14 dark:via-white/8 md:block" />

                <div className="space-y-5 md:space-y-6">
                    {parsedMoments.map((item, momentsIndex) => {
                        const displayDate = getDisplayDate(item.date);
                        const isSingleImage = item.parsed.images.length === 1;
                        const authorName = String(item.author || SITE.author || "").trim();

                        return (
                            <article
                                key={item.id}
                                className="relative md:grid md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-5"
                            >
                                <div className="relative z-10 hidden md:flex md:justify-center">
                                    <div className="sticky top-8 inline-flex min-w-[3.9rem] flex-col items-center rounded-[1.15rem] border border-black/8 bg-black/[0.02] px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.02]">
                                        <span className="text-[1.45rem] font-semibold leading-none text-[var(--text-main)]">{displayDate.day}</span>
                                        <span className="mt-1 text-[0.68rem] tracking-[0.14em] text-[var(--text-soft)]">{displayDate.month}/{displayDate.yearShort}</span>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-[1.4rem] border border-black/8 bg-black/[0.02] px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] dark:border-white/[0.05] dark:bg-white/[0.02]">
                                    <div className="mb-3 md:hidden">
                                        <div className="inline-flex min-w-[3.9rem] flex-col items-start rounded-[1.15rem] border border-black/8 bg-black/[0.02] px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.02]">
                                            <span className="text-[1.45rem] font-semibold leading-none text-[var(--text-main)]">{displayDate.day}</span>
                                            <span className="mt-1 text-[0.68rem] tracking-[0.14em] text-[var(--text-soft)]">{displayDate.month}/{displayDate.yearShort}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-sm text-[var(--text-soft)]">{displayDate.time}</span>
                                        {authorName ? (
                                            <span className="text-sm text-[var(--text-soft)]">{authorName}</span>
                                        ) : null}
                                    </div>

                                    <div className="mt-4 space-y-2 text-[1.03rem] leading-8 text-[color:var(--text-main)]">
                                        {item.parsed.paragraphs.map((line) => (
                                            <p key={line}>{line}</p>
                                        ))}
                                    </div>

                                    {item.parsed.images.length ? (
                                        <div className={["mt-5 grid gap-2.5", isSingleImage ? "grid-cols-1" : "grid-cols-2"].join(" ")}>
                                            {item.parsed.images.map((image, imageIndex) => (
                                                <figure
                                                    key={`${image.src}-${imageIndex}`}
                                                    className="group overflow-hidden rounded-[0.95rem] border border-black/8 bg-[var(--page-bg-soft)] dark:border-white/[0.05]"
                                                >
                                                    <button
                                                        type="button"
                                                        className="block w-full text-left"
                                                        onClick={() => openLightbox(momentsIndex, imageIndex)}
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={image.src}
                                                            alt={image.alt}
                                                            className={[
                                                                "w-full object-cover transition duration-300 group-hover:scale-[1.02]",
                                                                isSingleImage ? "max-h-[28rem]" : "h-40",
                                                            ].join(" ")}
                                                            loading="lazy"
                                                        />
                                                    </button>
                                                    {image.alt ? (
                                                        <figcaption className="px-3 py-2 text-xs text-[var(--text-soft)]">
                                                            {image.alt}
                                                        </figcaption>
                                                    ) : null}
                                                </figure>
                                            ))}
                                        </div>
                                    ) : null}

                                    <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {item.tags.map((tag) => (
                                                <span
                                                    key={`${item.id}-${tag}`}
                                                    className="rounded-full border border-black/8 bg-black/[0.03] px-2.5 py-1 text-xs text-[var(--text-soft)] dark:border-white/[0.06] dark:bg-white/[0.03]"
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isLoggedIn && (
                                                <>
                                                    <Link
                                                        href={`/write?slug=${encodeURIComponent(item.id)}&type=moment`}
                                                        className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs text-[var(--text-soft)] transition hover:border-black/18 hover:bg-black/[0.06] dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.14]"
                                                    >
                                                        修改
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        disabled={deletingId === item.id}
                                                        onClick={() => void handleDeleteMoment(item.id)}
                                                        className="rounded-full border border-red-400/25 bg-red-50/50 px-3 py-1 text-xs text-red-600/75 transition hover:border-red-400/40 disabled:opacity-50 dark:border-red-400/20 dark:bg-red-900/10 dark:text-red-400/70"
                                                    >
                                                        {deletingId === item.id ? "删除中..." : "删除"}
                                                    </button>
                                                </>
                                            )}
                                            <ShuoshuoCommentButton
                                                quote={getCommentQuote(item.parsed.paragraphs)}
                                                className="rounded-full border border-black/8 bg-black/[0.03] px-3 py-1.5 text-xs text-[var(--text-soft)] transition hover:opacity-80 dark:border-white/[0.06] dark:bg-white/[0.03]"
                                            />
                                        </div>
                                    </footer>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            {activeIndex !== null && items[activeIndex] ? (
                <div className="fixed inset-0 z-[120] bg-black/82 px-4 py-6 backdrop-blur-md" onClick={() => setActiveIndex(null)}>
                    <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
                        <div className="mb-4 flex items-center justify-between text-sm text-white/72">
                            <div />
                            {items.length > 1 ? <div className="pr-14">{activeIndex + 1} / {items.length}</div> : null}
                        </div>

                        <div className="relative flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
                            <button
                                type="button"
                                aria-label="关闭预览"
                                className="absolute right-0 top-[-3.7rem] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white transition hover:bg-black/45"
                                onClick={() => setActiveIndex(null)}
                            >
                                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <path d="M5 5l10 10" />
                                    <path d="M15 5L5 15" />
                                </svg>
                            </button>

                            {items.length > 1 ? (
                                <button
                                    type="button"
                                    className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/30 px-4 py-3 text-white"
                                    onClick={() => setActiveIndex((activeIndex - 1 + items.length) % items.length)}
                                >
                                    上一张
                                </button>
                            ) : null}

                            <div className="relative h-[78vh] w-full max-w-5xl overflow-hidden rounded-[1.5rem]">
                                <Image
                                    src={items[activeIndex].src}
                                    alt={items[activeIndex].alt}
                                    fill
                                    unoptimized
                                    sizes="100vw"
                                    className="object-contain"
                                />
                            </div>

                            {items.length > 1 ? (
                                <button
                                    type="button"
                                    className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/30 px-4 py-3 text-white"
                                    onClick={() => setActiveIndex((activeIndex + 1) % items.length)}
                                >
                                    下一张
                                </button>
                            ) : null}
                        </div>

                        {items[activeIndex].caption ? (
                            <div className="mx-auto mt-5 max-w-3xl text-center text-sm leading-7 text-white/68">
                                {items[activeIndex].caption}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}
