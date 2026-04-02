"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SITE } from "@/site-config";

type TwikooInitOptions = {
    envId: string;
    el: string;
    region?: string;
    path?: string;
    lang?: string;
};

type Twikoo = {
    init: (options: TwikooInitOptions) => void;
};

declare global {
    interface Window {
        twikoo?: Twikoo;
    }
}

const TWIKOO_SDK_URL = "https://cdn.jsdelivr.net/npm/twikoo@1/dist/twikoo.all.min.js";

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
        if (existing) {
            if ((existing as any).__loaded) return resolve();
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("Failed to load script")), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        (script as any).__loaded = false;
        script.addEventListener(
            "load",
            () => {
                (script as any).__loaded = true;
                resolve();
            },
            { once: true }
        );
        script.addEventListener("error", () => reject(new Error("Failed to load script")), { once: true });
        document.head.appendChild(script);
    });
}

type Props = {
    title?: string;
    className?: string;
    draftStorageKey?: string;
};

function applyDraftToTextarea(containerId: string, draft: string) {
    const container = document.getElementById(containerId);
    const textarea = container?.querySelector("textarea") as HTMLTextAreaElement | null;
    if (!textarea) {
        return false;
    }

    textarea.focus();
    textarea.value = draft;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
}

function applyDraftFromStorage(containerId: string, draftStorageKey: string) {
    const draft = window.localStorage.getItem(draftStorageKey);
    if (!draft) return () => undefined;

    let attempts = 0;
    const timer = window.setInterval(() => {
        attempts += 1;
        const applied = applyDraftToTextarea(containerId, draft);
        if (!applied && attempts < 12) {
            return;
        }

        window.clearInterval(timer);
        if (applied) {
            window.localStorage.removeItem(draftStorageKey);
        }
    }, 150);

    return () => window.clearInterval(timer);
}

export default function TwikooComments({ title = "评论", className = "", draftStorageKey }: Props) {
    const enabled = Boolean(SITE.comments?.twikoo?.enabled);
    const envId = SITE.comments?.twikoo?.envId;
    const region = SITE.comments?.twikoo?.region;
    const containerId = useMemo(() => "twikoo", []);
    const initializedRef = useRef(false);
    const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

    useEffect(() => {
        if (!enabled || !envId) return;
        if (initializedRef.current) return;

        const run = async () => {
            try {
                setState("loading");
                await loadScript(TWIKOO_SDK_URL);

                if (!window.twikoo) {
                    throw new Error("twikoo sdk not available");
                }

                window.twikoo.init({
                    envId,
                    region: region || undefined,
                    el: `#${containerId}`,
                    path: window.location.pathname,
                });

                initializedRef.current = true;
                setState("ready");
            } catch {
                setState("error");
            }
        };

        void run();
    }, [containerId, enabled, envId, region]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!draftStorageKey) return;
        if (state !== "ready") return;

        const onQuote = () => applyDraftFromStorage(containerId, draftStorageKey);
        const cleanupInitial = applyDraftFromStorage(containerId, draftStorageKey);
        window.addEventListener("shuoshuo:quote", onQuote);

        return () => {
            cleanupInitial();
            window.removeEventListener("shuoshuo:quote", onQuote);
        };
    }, [containerId, draftStorageKey, state]);

    if (!enabled || !envId) return null;

    return (
        <section id="comments" className={["mt-10", className].filter(Boolean).join(" ")}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/40">
                {title}
            </div>
            {state === "loading" ? (
                <p className="mt-4 text-sm leading-7 text-black/60 dark:text-white/60">加载评论中...</p>
            ) : null}
            {state === "error" ? (
                <p className="mt-4 text-sm leading-7 text-black/60 dark:text-white/60">评论加载失败，请稍后重试。</p>
            ) : null}
            <div id={containerId} className="mt-4" />
        </section>
    );
}
