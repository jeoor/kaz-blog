"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type LightboxItem = {
    src: string;
    alt: string;
    caption: string;
};

type Props = {
    contentHtml: string;
};

export default function ArticleBody({ contentHtml }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const copyResetTimersRef = useRef<Map<HTMLButtonElement, number>>(new Map());
    const [items, setItems] = useState<LightboxItem[]>([]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    useEffect(() => {
        const resetTimers = copyResetTimersRef.current;
        return () => {
            resetTimers.forEach((timerId) => window.clearTimeout(timerId));
            resetTimers.clear();
        };
    }, []);

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

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const blocks = Array.from(root.querySelectorAll("pre"));

        blocks.forEach((block) => {
            if (block.querySelector(".code-copy-button")) return;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "code-copy-button";
            button.setAttribute("aria-label", "复制代码");
            button.setAttribute("data-copy-code", "true");
            button.innerHTML = `
                <svg aria-hidden="true" viewBox="0 0 20 20" class="code-copy-icon" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="7" y="4" width="9" height="11" rx="2"></rect>
                    <path d="M5 7.5H4a1 1 0 0 0-1 1v7a2 2 0 0 0 2 2h6.5a1 1 0 0 0 1-1v-1"></path>
                </svg>
            `;
            block.prepend(button);
        });
    }, [contentHtml]);

    function setCopyButtonState(button: HTMLButtonElement, state: "idle" | "success" | "error") {
        button.dataset.copied = state === "success" ? "true" : "false";
        button.dataset.state = state;
    }

    async function copyCode(button: HTMLButtonElement) {
        const pre = button.closest("pre");
        const code = pre?.querySelector("code");
        const text = code?.textContent;
        if (!text) return;

        await navigator.clipboard.writeText(text);

        const currentTimer = copyResetTimersRef.current.get(button);
        if (currentTimer) {
            window.clearTimeout(currentTimer);
        }

        setCopyButtonState(button, "success");

        const timerId = window.setTimeout(() => {
            setCopyButtonState(button, "idle");
            copyResetTimersRef.current.delete(button);
        }, 1800);

        copyResetTimersRef.current.set(button, timerId);
    }

    function openLightbox(target: HTMLImageElement) {
        const root = containerRef.current;
        if (!root) return;

        const imageNodes = Array.from(root.querySelectorAll("img[data-lightbox-src]")) as HTMLImageElement[];
        const nextItems = imageNodes.map((img) => ({
            src: img.dataset.lightboxSrc || img.currentSrc || img.src,
            alt: img.dataset.lightboxAlt || img.alt || "",
            caption: img.dataset.lightboxCaption || "",
        }));

        const nextIndex = imageNodes.findIndex((img) => img === target);
        if (nextIndex < 0) return;

        setItems(nextItems);
        setActiveIndex(nextIndex);
    }

    return (
        <>
            <div
                ref={containerRef}
                className="markdown"
                onClick={async (event) => {
                    const target = event.target;
                    if (target instanceof HTMLElement) {
                        const copyButton = target.closest("button[data-copy-code='true']");
                        if (copyButton instanceof HTMLButtonElement) {
                            event.preventDefault();
                            event.stopPropagation();
                            try {
                                await copyCode(copyButton);
                            } catch {
                                setCopyButtonState(copyButton, "error");
                                window.setTimeout(() => {
                                    setCopyButtonState(copyButton, "idle");
                                }, 1800);
                            }
                            return;
                        }
                    }
                    if (!(target instanceof HTMLImageElement)) return;
                    if (!target.dataset.lightboxSrc) return;
                    openLightbox(target);
                }}
                dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {activeIndex !== null && items[activeIndex] ? (
                <div className="fixed inset-0 z-[120] bg-black/82 px-4 py-6 backdrop-blur-md" onClick={() => setActiveIndex(null)}>
                    <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
                        <div className="mb-4 flex items-center justify-end text-sm text-white/72">
                            {items.length > 1 ? <div>{activeIndex + 1} / {items.length}</div> : null}
                        </div>

                        <div className="relative flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
                            <button
                                type="button"
                                aria-label="关闭预览"
                                className="absolute right-0 top-[-3.25rem] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white transition hover:bg-black/45"
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