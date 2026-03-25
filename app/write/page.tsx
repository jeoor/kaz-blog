"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Button, Card, CardBody, Input, NextUIProvider, Spinner } from "@nextui-org/react";
import { SITE } from "@/app/site-config";
import ArticleBody from "@/components/post-components/article-body";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";
import { remark } from "remark";
import remarkHtml from "remark-html";

type UiStatus =
    | { state: "idle" }
    | { state: "working"; message: string }
    | { state: "success"; message: string; postUrl?: string }
    | { state: "error"; message: string };

type SessionUser = {
    username: string;
    displayName?: string;
    role?: string;
};

function normalizeSlug(input: string): string {
    return input
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function todayYmd(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function crc16CcittFalse(input: string): number {
    // CRC-16/CCITT-FALSE
    // poly=0x1021, init=0xFFFF, xorout=0x0000
    let crc = 0xffff;
    for (let i = 0; i < input.length; i++) {
        crc ^= input.charCodeAt(i) << 8;
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xffff;
        }
    }
    return crc & 0xffff;
}

function generateSlug(): string {
    // Use a time+random seed, then compress to 16-bit CRC hex.
    // Output example: "66c8"
    const seed = `${Date.now()}-${Math.random()}`;
    const crc = crc16CcittFalse(seed);
    return crc.toString(16).padStart(4, "0").toLowerCase();
}

export default function WritePage() {
    const contentId = useId();
    const [status, setStatus] = useState<UiStatus>({ state: "idle" });

    const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
    const [previewHtml, setPreviewHtml] = useState<string>("");
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isPreviewWorking, setIsPreviewWorking] = useState(false);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState<string | null>(null);
    const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

    const [slug, setSlug] = useState("");
    const [title, setTitle] = useState("");
    const [date, setDate] = useState(todayYmd);
    const [description, setDescription] = useState("");
    const [author, setAuthor] = useState("");
    const [keywords, setKeywords] = useState("");
    const [content, setContent] = useState("");

    const normalizedSlug = normalizeSlug(slug);

    useEffect(() => {
        if (editorMode !== "preview") return;

        let cancelled = false;
        setIsPreviewWorking(true);
        setPreviewError(null);

        remark()
            .use(remarkHtml)
            .process(content || "")
            .then((file) => {
                if (cancelled) return;
                setPreviewHtml(String(file));
            })
            .catch((e) => {
                if (cancelled) return;
                const message = e instanceof Error ? e.message : "预览渲染失败";
                setPreviewError(message);
                setPreviewHtml("");
            })
            .finally(() => {
                if (cancelled) return;
                setIsPreviewWorking(false);
            });

        return () => {
            cancelled = true;
        };
    }, [content, editorMode]);

    function ensureBasics(): string | null {
        if (!isUnlocked) return "需要先登录写作台";
        if (!normalizedSlug) return "需要填写 slug";
        return null;
    }

    const onUnlock = useCallback(async (): Promise<void> => {
        setStatus({ state: "idle" });
        setUnlockError(null);

        setIsUnlocking(true);
        try {
            const res = await fetch(adminApiUrl("/api/admin/session"), {
                credentials: adminCredentials(),
            });

            if (!res.ok) {
                setIsUnlocked(false);
                setSessionUser(null);
                if (res.status === 401) {
                    setUnlockError("未登录，请先去登录页");
                } else if (res.status === 545) {
                    setUnlockError(
                        "EdgeOne 返回 545：Cloud Functions 执行异常。请优先检查 /cfapi/api/admin/session 函数是否已部署，以及 AUTH_KV_BINDING/NOTION_TOKEN/NOTION_DATABASE_ID 是否已注入。",
                    );
                } else {
                    let serverMessage = "";
                    try {
                        const data = (await res.json()) as any;
                        serverMessage = typeof data?.message === "string" ? data.message : "";
                    } catch {
                        // ignore
                    }
                    setUnlockError(serverMessage || `解锁失败（${res.status}）`);
                }
                return;
            }

            const data = (await res.json().catch(() => ({}))) as any;
            const user = (data?.user || null) as SessionUser | null;
            setSessionUser(user);
            const fallbackAuthor = String(user?.displayName || user?.username || "").trim();
            if (fallbackAuthor) {
                setAuthor((prev) => (prev.trim() ? prev : fallbackAuthor));
            }
            setIsUnlocked(true);
        } catch (e) {
            setIsUnlocked(false);
            setSessionUser(null);
            const message = e instanceof Error ? e.message : "验证失败";
            setUnlockError(message);
        } finally {
            setIsUnlocking(false);
        }
    }, []);

    useEffect(() => {
        void onUnlock();
    }, [onUnlock]);

    async function onLogout(): Promise<void> {
        try {
            await fetch(adminApiUrl("/api/admin/session"), {
                method: "DELETE",
                credentials: adminCredentials(),
            });
        } catch {
            // Ignore logout request failure and clear local state anyway.
        }
        setSessionUser(null);
        setIsUnlocked(false);
        setUnlockError("已退出登录");
        window.location.href = "/login?next=/write";
    }

    function resetForm(): void {
        setTitle("");
        setDescription("");
        setAuthor("");
        setDate(todayYmd());
        setKeywords("");
        setContent("");
    }

    async function onLoad(): Promise<void> {
        setStatus({ state: "idle" });
        const err = ensureBasics();
        if (err) {
            setStatus({ state: "error", message: err });
            return;
        }

        setStatus({ state: "working", message: "正在加载文章..." });
        try {
            const res = await fetch(adminApiUrl(`/api/admin/posts?slug=${encodeURIComponent(normalizedSlug)}`), {
                credentials: adminCredentials(),
            });
            if (res.status === 404) {
                setStatus({ state: "error", message: "没找到这篇文章（404）" });
                return;
            }
            if (res.status === 401) {
                setIsUnlocked(false);
                setSessionUser(null);
                setUnlockError("登录已失效，请重新登录");
                setStatus({ state: "error", message: "登录已失效，请重新登录" });
                return;
            }
            const data = (await res.json()) as any;
            if (!res.ok) {
                setStatus({ state: "error", message: data?.message || `加载失败：${res.status}` });
                return;
            }

            const fm = data.frontmatter || {};
            setTitle(typeof fm.title === "string" ? fm.title : "");
            setDate(typeof fm.date === "string" ? fm.date : todayYmd());
            setDescription(typeof fm.description === "string" ? fm.description : "");
            setAuthor(typeof fm.author === "string" ? fm.author : "");
            setKeywords(Array.isArray(fm.keywords) ? fm.keywords.join(",") : "");
            setContent(typeof data.body === "string" ? data.body : "");

            setStatus({ state: "success", message: "已加载，可直接更新或删除。" });
        } catch (e) {
            const message = e instanceof Error ? e.message : "加载失败";
            setStatus({ state: "error", message });
        }
    }

    async function onPublish(): Promise<void> {
        setStatus({ state: "idle" });
        const err = ensureBasics();
        if (err) {
            setStatus({ state: "error", message: err });
            return;
        }
        if (!title.trim()) {
            setStatus({ state: "error", message: "需要填写标题" });
            return;
        }
        if (!description.trim()) {
            setStatus({ state: "error", message: "需要填写简介（description）" });
            return;
        }
        if (!author.trim()) {
            setStatus({ state: "error", message: "需要填写作者（author）" });
            return;
        }
        if (!date.trim()) {
            setStatus({ state: "error", message: "需要填写日期（date）" });
            return;
        }

        setStatus({ state: "working", message: "正在提交..." });
        try {
            const kwList = keywords
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean);

            const res = await fetch(adminApiUrl("/api/admin/posts"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: adminCredentials(),
                body: JSON.stringify({
                    slug: normalizedSlug,
                    frontmatter: {
                        title: title.trim(),
                        date: date.trim(),
                        description: description.trim(),
                        author: author.trim(),
                        keywords: kwList,
                    },
                    body: content,
                }),
            });

            if (res.status === 401) {
                setIsUnlocked(false);
                setSessionUser(null);
                setUnlockError("登录已失效，请重新登录");
                setStatus({ state: "error", message: "登录已失效，请重新登录" });
                return;
            }

            const data = (await res.json()) as any;
            if (!res.ok) {
                setStatus({ state: "error", message: data?.message || `提交失败：${res.status}` });
                return;
            }

            setStatus({
                state: "success",
                message: "发布成功（Notion 已更新）。站点可能需要一点时间刷新缓存。",
                postUrl: `/posts/${normalizedSlug}`,
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : "发布失败";
            setStatus({ state: "error", message });
        }
    }

    async function onDelete(): Promise<void> {
        setStatus({ state: "idle" });
        const err = ensureBasics();
        if (err) {
            setStatus({ state: "error", message: err });
            return;
        }

        setStatus({ state: "working", message: "正在删除..." });
        try {
            const res = await fetch(adminApiUrl(`/api/admin/posts?slug=${encodeURIComponent(normalizedSlug)}`), {
                method: "DELETE",
                credentials: adminCredentials(),
            });

            if (res.status === 401) {
                setIsUnlocked(false);
                setSessionUser(null);
                setUnlockError("登录已失效，请重新登录");
                setStatus({ state: "error", message: "登录已失效，请重新登录" });
                return;
            }

            const data = (await res.json()) as any;
            if (!res.ok) {
                setStatus({ state: "error", message: data?.message || `删除失败：${res.status}` });
                return;
            }

            resetForm();
            setStatus({ state: "success", message: "已删除（Notion 页面已归档）。站点可能需要一点时间刷新缓存。" });
        } catch (e) {
            const message = e instanceof Error ? e.message : "删除失败";
            setStatus({ state: "error", message });
        }
    }

    const isWorking = status.state === "working";
    const hasSession = !!sessionUser;
    const isPrivilegedUser = ["owner", "admin"].includes(String(sessionUser?.role || "").toLowerCase());

    return (
        <NextUIProvider>
            <div className="mx-auto w-full max-w-[94rem] px-4 pb-24 pt-10 md:pt-14">
                <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <Card
                        shadow="none"
                        className="border border-black/10 bg-white/78 dark:border-white/10 dark:bg-white/[0.03] min-h-[calc(100svh-10rem)] h-full"
                    >
                        <CardBody className="flex h-full flex-col gap-6 p-6 md:p-8">
                            {editorMode === "edit" ? (
                                <div className="flex w-full flex-1 min-h-0 flex-col">
                                    <label
                                        htmlFor={contentId}
                                        className="text-sm font-medium text-black/70 dark:text-white/70"
                                    >
                                        正文（Markdown）
                                    </label>
                                    <div className="mt-3 flex-1 min-h-0 rounded-[1.5rem] border border-black/8 bg-black/[0.02] px-5 py-4 dark:border-white/8 dark:bg-white/[0.02]">
                                        <textarea
                                            id={contentId}
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="在这里写 Markdown 正文…"
                                            className="h-full w-full resize-none bg-transparent !text-[15px] leading-8 font-medium text-black/90 outline-none dark:text-white/90"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-1 min-h-0 flex-col">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-medium text-black/70 dark:text-white/70">预览</div>
                                        <div className="text-xs text-black/45 dark:text-white/45">当前内容（未发布）</div>
                                    </div>

                                    <div className="mt-3 flex-1 min-h-0 overflow-auto rounded-[1.5rem] border border-black/8 bg-black/[0.02] px-5 py-4 dark:border-white/8 dark:bg-white/[0.02]">
                                        {isPreviewWorking ? (
                                            <div className="flex items-center gap-2 text-sm text-black/55 dark:text-white/55">
                                                <Spinner size="sm" />
                                                正在渲染预览...
                                            </div>
                                        ) : previewError ? (
                                            <div className="text-sm text-red-400">{previewError}</div>
                                        ) : previewHtml.trim() ? (
                                            <ArticleBody contentHtml={previewHtml} />
                                        ) : (
                                            <div className="text-sm text-black/45 dark:text-white/45">（暂无内容）</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                        <Card shadow="none" className="border border-black/10 bg-white/78 dark:border-white/10 dark:bg-white/[0.03]">
                            <CardBody className="space-y-5 p-6">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                                        Writing Workspace
                                    </p>
                                    <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight">
                                        {SITE.write.title}
                                    </h1>
                                    <p className="mt-3 text-sm leading-7 text-black/68 dark:text-white/68">
                                        {SITE.write.description}
                                    </p>
                                </div>

                                {!isUnlocked ? (
                                    <div className="space-y-3">
                                        <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/68 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/68">
                                            当前未登录。请先登录后进入写作台。
                                        </div>
                                        {unlockError ? (
                                            <div className="text-sm text-red-400">{unlockError}</div>
                                        ) : null}
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant="flat"
                                                className="border border-black/10 dark:border-white/10"
                                                onPress={onUnlock}
                                                isDisabled={isWorking || isUnlocking}
                                            >
                                                {isUnlocking ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Spinner size="sm" />
                                                        检查中...
                                                    </span>
                                                ) : (
                                                    "刷新会话"
                                                )}
                                            </Button>
                                            <Button
                                                color="primary"
                                                onPress={() => {
                                                    window.location.href = "/login?next=/write";
                                                }}
                                            >
                                                去登录
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                        已登录：{sessionUser?.displayName || sessionUser?.username}
                                        {sessionUser?.role ? `（${sessionUser.role}）` : ""}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        color="primary"
                                        onPress={onPublish}
                                        isDisabled={isWorking || !isUnlocked}
                                        className="flex-1"
                                    >
                                        {isWorking ? (
                                            <span className="inline-flex items-center gap-2">
                                                <Spinner size="sm" />
                                                {status.state === "working" ? status.message : "处理中..."}
                                            </span>
                                        ) : (
                                            "发布/更新"
                                        )}
                                    </Button>
                                    <Button
                                        variant="flat"
                                        className="border border-black/10 dark:border-white/10"
                                        onPress={() => setEditorMode((current) => (current === "edit" ? "preview" : "edit"))}
                                        isDisabled={isWorking}
                                    >
                                        {editorMode === "edit" ? "预览" : "返回编辑"}
                                    </Button>
                                    <Button
                                        color="danger"
                                        variant="flat"
                                        onPress={onDelete}
                                        isDisabled={isWorking || !isUnlocked || !normalizedSlug}
                                    >
                                        删除
                                    </Button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant="flat"
                                        className="border border-black/10 dark:border-white/10 flex-1"
                                        onPress={onLoad}
                                        isDisabled={isWorking || !isUnlocked || !normalizedSlug}
                                    >
                                        加载文章
                                    </Button>
                                    <Button
                                        variant="flat"
                                        className="border border-black/10 dark:border-white/10"
                                        onPress={onLogout}
                                    >
                                        退出登录
                                    </Button>
                                </div>

                                {status.state === "success" ? (
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                        {status.message}
                                        {status.postUrl ? (
                                            <>
                                                {" "}
                                                <a className="underline" href={status.postUrl}>
                                                    打开文章
                                                </a>
                                            </>
                                        ) : null}
                                    </div>
                                ) : null}

                                {status.state === "error" ? (
                                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                        {status.message}
                                    </div>
                                ) : null}
                            </CardBody>
                        </Card>

                        <Card shadow="none" className="border border-black/10 bg-white/78 dark:border-white/10 dark:bg-white/[0.03]">
                            <CardBody className="space-y-5 p-6">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                                        Meta
                                    </p>
                                    <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">
                                        文章设置
                                    </h2>
                                </div>

                                <Input
                                    label="永久链接（slug）"
                                    value={slug}
                                    onValueChange={setSlug}
                                    description={slug ? `实际：${normalizedSlug}（发布后尽量不要改）` : "例如：my-first-post"}
                                />

                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant="flat"
                                        onPress={() => {
                                            setSlug(generateSlug());
                                            setStatus({ state: "idle" });
                                        }}
                                        isDisabled={isWorking}
                                    >
                                        生成
                                    </Button>
                                    <Button
                                        variant="flat"
                                        onPress={() => {
                                            resetForm();
                                            setStatus({ state: "idle" });
                                        }}
                                        isDisabled={isWorking}
                                    >
                                        清空
                                    </Button>
                                    <Button variant="flat" isDisabled>
                                        草稿
                                    </Button>
                                </div>

                                <Input label="标题" value={title} onValueChange={setTitle} />
                                <Input label="日期（YYYY-MM-DD）" value={date} onValueChange={setDate} />
                                <Input label="简介（description）" value={description} onValueChange={setDescription} />
                                <Input
                                    label="作者（author）"
                                    value={author}
                                    onValueChange={setAuthor}
                                    isReadOnly={hasSession && !isPrivilegedUser}
                                    description={hasSession && !isPrivilegedUser ? "作者由当前账号自动绑定" : ""}
                                />
                                <Input
                                    label="关键词（keywords）"
                                    value={keywords}
                                    onValueChange={setKeywords}
                                    description="逗号分隔，例如：notion,blog,writing"
                                />
                            </CardBody>
                        </Card>
                    </aside>
                </div>
            </div>
        </NextUIProvider>
    );
}
