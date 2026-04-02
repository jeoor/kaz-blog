"use client";

import { useCallback, useEffect, useState } from "react";
import type { PhotoItem } from "@/content/photos.config";

type Props = {
    photos: PhotoItem[];
    canDelete?: (photo: PhotoItem) => boolean;
    deletingSlug?: string;
    onDelete?: (photo: PhotoItem) => void;
};

export default function PhotoGallery({ photos, canDelete, deletingSlug, onDelete }: Props) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const close = useCallback(() => setActiveIndex(null), []);

    const prev = useCallback(() => {
        setActiveIndex((i) => {
            if (i === null || photos.length === 0) return i;
            return (i - 1 + photos.length) % photos.length;
        });
    }, [photos.length]);

    const next = useCallback(() => {
        setActiveIndex((i) => {
            if (i === null || photos.length === 0) return i;
            return (i + 1) % photos.length;
        });
    }, [photos.length]);

    // 键盘导航
    useEffect(() => {
        if (activeIndex === null) return;

        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowLeft") prev();
            else if (e.key === "ArrowRight") next();
        }

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [activeIndex, close, prev, next]);

    // lightbox 打开时锁定页面滚动
    useEffect(() => {
        document.body.style.overflow = activeIndex !== null ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [activeIndex]);

    if (photos.length === 0) {
        return (
            <div className="pt-10 text-sm text-black/50 dark:text-white/50">
                暂时还没有添加照片。
            </div>
        );
    }

    const active = activeIndex !== null ? photos[activeIndex] : null;

    return (
        <>
            {/* 使用 CSS columns 实现瀑布流网格 */}
            <div
                className="pt-10"
                style={{
                    columns: "var(--gallery-cols, 2)",
                    columnGap: "1rem",
                }}
            >
                <style>{`
                    @media (min-width: 640px) { :root { --gallery-cols: 2; } }
                    @media (min-width: 900px) { :root { --gallery-cols: 3; } }
                    @media (min-width: 1280px) { :root { --gallery-cols: 4; } }
                `}</style>

                {photos.map((photo, index) => (
                    <div
                        key={photo.src + index}
                        className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[1.1rem] cursor-zoom-in"
                        onClick={() => setActiveIndex(index)}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photo.src}
                            alt={photo.alt}
                            loading="lazy"
                            className="w-full h-auto block transition-transform duration-300 hover:scale-[1.02]"
                        />
                        {canDelete?.(photo) && onDelete ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(photo);
                                }}
                                disabled={deletingSlug === photo.slug}
                                className="absolute right-2 top-2 z-10 rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-xs text-white/90 opacity-0 backdrop-blur-sm transition hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-70 group-hover:opacity-100"
                            >
                                {deletingSlug === photo.slug ? "删除中" : "删除"}
                            </button>
                        ) : null}
                    </div>
                ))}
            </div>

            {/* 灯箱 */}
            {active !== null && activeIndex !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={close}
                    role="dialog"
                    aria-modal="true"
                    aria-label="图片预览"
                >
                    {/* backdrop */}
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

                    {/* image container */}
                    <div
                        className="relative z-10 flex max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-4rem)] flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={active.src}
                            alt={active.alt}
                            className="max-h-[calc(100dvh-10rem)] max-w-full rounded-[1rem] object-contain shadow-2xl"
                        />
                        {active.caption && (
                            <p className="mt-4 max-w-lg text-center text-sm text-white/70">
                                {active.caption}
                            </p>
                        )}
                        {/* counter */}
                        <p className="mt-2 text-xs text-white/40">
                            {activeIndex + 1} / {photos.length}
                        </p>
                    </div>

                    {/* prev button */}
                    {photos.length > 1 && (
                        <button
                            type="button"
                            aria-label="上一张"
                            onClick={(e) => { e.stopPropagation(); prev(); }}
                            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 p-2.5 text-white/80 backdrop-blur-sm transition hover:bg-black/60"
                        >
                            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 5l-5 5 5 5" />
                            </svg>
                        </button>
                    )}

                    {/* next button */}
                    {photos.length > 1 && (
                        <button
                            type="button"
                            aria-label="下一张"
                            onClick={(e) => { e.stopPropagation(); next(); }}
                            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 p-2.5 text-white/80 backdrop-blur-sm transition hover:bg-black/60"
                        >
                            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M8 5l5 5-5 5" />
                            </svg>
                        </button>
                    )}

                    {/* close button */}
                    <button
                        type="button"
                        aria-label="关闭"
                        onClick={close}
                        className="absolute right-3 top-3 z-20 rounded-full border border-white/15 bg-black/40 p-2 text-white/80 backdrop-blur-sm transition hover:bg-black/60"
                    >
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                            <path d="M5 5l10 10M15 5L5 15" />
                        </svg>
                    </button>
                </div>
            )}
        </>
    );
}
