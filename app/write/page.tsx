"use client";

import { useState } from "react";
import { Button, Card, CardBody, Input, NextUIProvider, Spinner, Textarea } from "@nextui-org/react";
import { SITE } from "@/app/site-config";

type UiStatus =
    | { state: "idle" }
    | { state: "working"; message: string }
    | { state: "success"; message: string; postUrl?: string }
    | { state: "error"; message: string };

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

function generateSlug(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 8);
    return `${yyyy}${mm}${dd}${hh}${mi}${ss}-${rand}`;
}

export default function WritePage() {
    const [status, setStatus] = useState<UiStatus>({ state: "idle" });

    const [slug, setSlug] = useState("");
    const [title, setTitle] = useState("");
    const [date, setDate] = useState(todayYmd);
    const [description, setDescription] = useState("");
    const [author, setAuthor] = useState("");
    const [keywords, setKeywords] = useState("");
    const [content, setContent] = useState("");

    const normalizedSlug = normalizeSlug(slug);

    function ensureBasics(): string | null {
        if (!normalizedSlug) return "需要填写 slug";
        return null;
    }

    async function onLogout(): Promise<void> {
        try {
            await fetch("/api/admin/session", { method: "DELETE" });
        } finally {
            window.location.href = "/";
        }
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
            const res = await fetch(`/api/admin/posts?slug=${encodeURIComponent(normalizedSlug)}`, {
                credentials: "include",
            });

            if (res.status === 404) {
                setStatus({ state: "error", message: "没找到这篇文章（404）" });
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

            const res = await fetch("/api/admin/posts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
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
            const res = await fetch(`/api/admin/posts?slug=${encodeURIComponent(normalizedSlug)}`, {
                method: "DELETE",
                credentials: "include",
            });

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

    return (
        <NextUIProvider>
            <div className="mx-auto w-full max-w-[94rem] px-4 pb-24 pt-10 md:pt-14">
                <header className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-black/10 bg-white/60 px-6 py-6 dark:border-white/10 dark:bg-white/[0.03] md:flex-row md:items-end md:justify-between md:px-8">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                            Writing Workspace
                        </p>
                        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                            {SITE.write.title}
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-black/68 dark:text-white/68">
                            {SITE.write.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="flat" className="border border-black/10 dark:border-white/10" onPress={onLoad} isDisabled={isWorking || !normalizedSlug}>
                            加载文章
                        </Button>
                        <Button variant="flat" className="border border-black/10 dark:border-white/10" onPress={onLogout}>
                            退出登录
                        </Button>
                    </div>
                </header>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <Card shadow="none" className="border border-black/10 bg-white/78 dark:border-white/10 dark:bg-white/[0.03]">
                        <CardBody className="space-y-6 p-6 md:p-8">
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5 dark:border-white/10">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                                        Draft
                                    </p>
                                    <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                                        正文编辑器
                                    </h2>
                                    <p className="mt-2 text-sm leading-7 text-black/60 dark:text-white/60">
                                        正文占主列，专注写作；设置和操作收进右侧栏。
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <Button color="primary" onPress={onPublish} isDisabled={isWorking}>
                                        {isWorking ? (
                                            <span className="inline-flex items-center gap-2">
                                                <Spinner size="sm" />
                                                {status.state === "working" ? status.message : "处理中..."}
                                            </span>
                                        ) : (
                                            "发布/更新"
                                        )}
                                    </Button>
                                    <Button color="danger" variant="flat" onPress={onDelete} isDisabled={isWorking || !normalizedSlug}>
                                        删除
                                    </Button>
                                </div>
                            </div>

                            <Textarea
                                label="正文（Markdown）"
                                value={content}
                                onValueChange={setContent}
                                minRows={30}
                                placeholder="在这里写 Markdown 正文..."
                                classNames={{
                                    base: "w-full",
                                    inputWrapper: "min-h-[42rem] items-start rounded-[1.5rem] border border-black/8 bg-black/[0.02] px-5 py-4 dark:border-white/8 dark:bg-white/[0.02]",
                                    input: "!text-[15px] leading-8 pt-1 font-medium",
                                }}
                            />

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

                    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
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
                                <Input label="作者（author）" value={author} onValueChange={setAuthor} />
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
