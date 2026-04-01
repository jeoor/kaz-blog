"use client";

import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardBody, Input, Spinner } from "@heroui/react";
import { SITE } from "@/app/site-config";
import ArticleBody from "@/components/post-components/article-body";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";
import { remark } from "remark";
import remarkHtml from "remark-html";

const CONTROL_RADIUS = "rounded-[14px]";
const CONTROL_HEIGHT = "h-11 min-h-11";
const PANEL_RADIUS = "rounded-[2rem] overflow-hidden";
const BUTTON_OUTLINE = `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-black/10 bg-black/[0.02] !text-black/78 transition-colors duration-150 hover:border-black/14 hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:!text-white/84 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.06]`;
const BUTTON_PRIMARY = `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-[#8d674052] bg-[#8d67401c] !text-black/92 transition-colors duration-150 hover:bg-[#8d674029] disabled:opacity-50 dark:border-[#c59a6950] dark:bg-[#c59a6922] dark:!text-white/96 dark:hover:bg-[#c59a6930]`;
const BUTTON_DANGER = `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-red-500/35 bg-red-500/12 !text-red-700 transition-colors duration-150 hover:bg-red-500/18 disabled:opacity-50 dark:border-red-300/32 dark:bg-red-500/14 dark:!text-red-200 dark:hover:bg-red-500/22`;
const IMAGE_HOST_API_BASE = "https://7bu.top/api/v1";
const WEBP_QUALITY = 0.86;

const inputClassNames = {
    inputWrapper: `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-black/18 bg-black/[0.02] shadow-none transition-colors duration-150 group-data-[focus=true]:border-black/34 group-data-[focus=true]:ring-0 data-[hover=true]:border-black/28 dark:border-white/14 dark:bg-white/[0.03] dark:group-data-[focus=true]:border-white/30 dark:data-[hover=true]:border-white/24`,
    innerWrapper: "border-none bg-transparent shadow-none",
    input: "border-0 bg-transparent text-sm text-black/88 placeholder:text-black/42 outline-none ring-0 focus:outline-none focus:ring-0 dark:text-white/92 dark:placeholder:text-white/42",
};

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

type ImageUploadStatus =
    | { state: "idle" }
    | { state: "working"; message: string }
    | { state: "success"; message: string }
    | { state: "error"; message: string };

function getSessionAuthorName(user: SessionUser | null): string {
    return String(user?.displayName || user?.username || "").trim();
}

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

function getInsertionPaddingLeft(text: string): string {
    if (!text) return "";
    if (text.endsWith("\n\n")) return "";
    if (text.endsWith("\n")) return "\n";
    return "\n\n";
}

function getInsertionPaddingRight(text: string): string {
    if (!text) return "";
    if (text.startsWith("\n\n")) return "";
    if (text.startsWith("\n")) return "\n";
    return "\n\n";
}

function shouldConvertImageToWebp(file: File): boolean {
    const mime = file.type.toLowerCase();
    if (!mime) return false;
    if (mime === "image/webp") return false;
    if (mime === "image/gif") return false;
    return ["image/jpeg", "image/jpg", "image/png", "image/bmp", "image/x-icon", "image/vnd.microsoft.icon"].includes(mime);
}

function renameFileToWebp(name: string): string {
    const nextName = name.replace(/\.[^.]+$/, "");
    return `${nextName || "image"}.webp`;
}

async function convertImageFileToWebp(file: File): Promise<File> {
    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("图片解码失败，无法转换为 webp"));
            img.src = objectUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("浏览器不支持 Canvas，无法转换为 webp");
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (result) => {
                    if (result) {
                        resolve(result);
                        return;
                    }
                    reject(new Error("webp 转换失败"));
                },
                "image/webp",
                WEBP_QUALITY,
            );
        });

        return new File([blob], renameFileToWebp(file.name), {
            type: "image/webp",
            lastModified: Date.now(),
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export default function WritePage() {
    return (
        <Suspense fallback={null}>
            <WritePageContent />
        </Suspense>
    );
}

function WritePageContent() {
    const contentId = useId();
    const imageInputId = useId();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<UiStatus>({ state: "idle" });
    const [imageUploadStatus, setImageUploadStatus] = useState<ImageUploadStatus>({ state: "idle" });

    const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
    const [previewHtml, setPreviewHtml] = useState<string>("");
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isPreviewWorking, setIsPreviewWorking] = useState(false);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState<string | null>(null);
    const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

    // Capture URL params once at mount time (refs avoid stale closure issues)
    const initSlugRef = useRef(searchParams.get("slug") || "");
    const initTypeRef = useRef(searchParams.get("type") || "");
    const autoLoadFiredRef = useRef(false);

    const [slug, setSlug] = useState(() => initSlugRef.current);
    const [publishType, setPublishType] = useState<"article" | "moment">(
        () => (initTypeRef.current === "moment" ? "moment" : "article")
    );
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    const [author, setAuthor] = useState("");
    const [keywords, setKeywords] = useState("");
    const [content, setContent] = useState("");
    const normalizedSlug = normalizeSlug(slug);
    const hasSession = !!sessionUser;
    const isOwnerUser = String(sessionUser?.role || "").toLowerCase() === "owner";
    const sessionAuthorName = getSessionAuthorName(sessionUser);
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

    useEffect(() => {
        setDate((prev) => (prev.trim() ? prev : todayYmd()));
    }, []);

    function ensureBasics(requireSlug: boolean): string | null {
        if (!isUnlocked) return "需要先登录写作台";
        if (requireSlug && !normalizedSlug) return "需要填写 slug";
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
                        const data = (await res.json().catch(() => ({}))) as any;
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
            const fallbackAuthor = getSessionAuthorName(user);
            if (fallbackAuthor) {
                const canEditAuthor = String(user?.role || "").toLowerCase() === "owner";
                setAuthor((prev) => (canEditAuthor && prev.trim() ? prev : fallbackAuthor));
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

    useEffect(() => {
        if (!sessionAuthorName || isOwnerUser) return;
        setAuthor(sessionAuthorName);
    }, [isOwnerUser, sessionAuthorName]);

    // Auto-load when navigated here from an edit button (?slug=xxx&type=moment)
    useEffect(() => {
        if (!initSlugRef.current || autoLoadFiredRef.current || !isUnlocked) return;
        if (normalizedSlug !== normalizeSlug(initSlugRef.current)) return;
        autoLoadFiredRef.current = true;
        void onLoad();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isUnlocked, normalizedSlug]);

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
        window.location.href = "/";
    }

    function resetForm(): void {
        setTitle("");
        setDescription("");
        setAuthor("");
        setDate(todayYmd());
        setKeywords("");
        setContent("");
    }

    function insertMarkdownIntoContent(markdown: string): void {
        const textarea = textareaRef.current;
        const insertion = markdown.trim();

        if (!textarea) {
            setContent((prev) => `${prev}${prev.trim() ? "\n\n" : ""}${insertion}`);
            return;
        }

        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;

        setContent((prev) => {
            const before = prev.slice(0, start);
            const after = prev.slice(end);
            const nextValue = `${before}${getInsertionPaddingLeft(before)}${insertion}${getInsertionPaddingRight(after)}${after}`;

            requestAnimationFrame(() => {
                const nextCursor = before.length + getInsertionPaddingLeft(before).length + insertion.length;
                textarea.focus();
                textarea.setSelectionRange(nextCursor, nextCursor);
            });

            return nextValue;
        });
    }

    function buildUploadedImageMarkdown(fileName: string, url: string): string {
        const alt = fileName.replace(/\.[^.]+$/, "").trim();
        return `![${alt}](${url.trim()})`;
    }

    async function uploadImageFile(file: File): Promise<void> {
        if (!file) return;

        setImageUploadStatus({ state: "working", message: `正在处理 ${file.name}...` });

        try {
            const uploadFile = shouldConvertImageToWebp(file) ? await convertImageFileToWebp(file) : file;

            setImageUploadStatus({
                state: "working",
                message: uploadFile === file
                    ? `正在上传 ${uploadFile.name}...`
                    : `已转为 webp，正在上传 ${uploadFile.name}...`,
            });

            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("permission", "1");

            const headers: Record<string, string> = {
                Accept: "application/json",
            };

            const res = await fetch(adminApiUrl("/api/admin/images"), {
                method: "POST",
                headers,
                credentials: adminCredentials(),
                body: formData,
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok || data?.status === false) {
                const message = typeof data?.message === "string" ? data.message : `上传失败：${res.status}`;
                setImageUploadStatus({ state: "error", message });
                return;
            }

            const links = data?.data?.links || {};
            const markdown = typeof links.url === "string" && links.url.trim()
                ? buildUploadedImageMarkdown(uploadFile.name, links.url)
                : "";

            if (!markdown) {
                setImageUploadStatus({ state: "error", message: "上传成功，但接口未返回可插入的 Markdown 链接。" });
                return;
            }

            insertMarkdownIntoContent(markdown);
            setImageUploadStatus({
                state: "success",
                message: uploadFile === file
                    ? "图片已上传，Markdown 链接已插入正文。"
                    : "图片已自动压缩为 webp 并上传，Markdown 链接已插入正文。",
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "图片上传失败";
            setImageUploadStatus({ state: "error", message });
        } finally {
            if (imageInputRef.current) {
                imageInputRef.current.value = "";
            }
        }
    }

    async function onLoad(): Promise<void> {
        setStatus({ state: "idle" });
        const err = ensureBasics(true);
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
            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                setStatus({ state: "error", message: data?.message || `加载失败：${res.status}` });
                return;
            }

            const fm = data.frontmatter || {};
            setPublishType(String(fm.type || "article").toLowerCase() === "moment" ? "moment" : "article");
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
        const isMoment = publishType === "moment";
        const err = ensureBasics(!isMoment);
        if (err) {
            setStatus({ state: "error", message: err });
            return;
        }
        if (!isMoment && !title.trim()) {
            setStatus({ state: "error", message: "需要填写标题" });
            return;
        }
        if (!isMoment && !description.trim()) {
            setStatus({ state: "error", message: "需要填写简介（description）" });
            return;
        }
        const effectiveAuthor = isOwnerUser ? author.trim() : sessionAuthorName;
        if (!effectiveAuthor) {
            setStatus({ state: "error", message: "需要填写作者（author）" });
            return;
        }
        if (!date.trim()) {
            setStatus({ state: "error", message: "需要填写日期（date）" });
            return;
        }
        if (isMoment && !content.trim()) {
            setStatus({ state: "error", message: "说说正文不能为空" });
            return;
        }

        setStatus({ state: "working", message: "正在提交..." });
        try {
            const kwList = keywords
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean);
            const publishSlug = normalizedSlug || (isMoment ? `moment-${Date.now().toString(36)}-${generateSlug()}` : "");

            const res = await fetch(adminApiUrl("/api/admin/posts"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: adminCredentials(),
                body: JSON.stringify({
                    type: isMoment ? "moment" : "article",
                    slug: publishSlug,
                    frontmatter: {
                        title: title.trim(),
                        date: date.trim(),
                        description: description.trim(),
                        author: effectiveAuthor,
                        keywords: kwList,
                        tags: kwList,
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

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                setStatus({ state: "error", message: data?.message || `提交失败：${res.status}` });
                return;
            }

            const savedSlug = String(data?.slug || publishSlug || "").trim();
            if (savedSlug) {
                setSlug(savedSlug);
            }

            setStatus({
                state: "success",
                message: isMoment
                    ? `说说发布成功（ID: ${savedSlug || "未返回"}）。站点可能需要一点时间刷新缓存。`
                    : "发布成功（Notion 已更新）。站点可能需要一点时间刷新缓存。",
                postUrl: isMoment ? "/shuoshuo" : `/posts/${publishSlug}`,
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : "发布失败";
            setStatus({ state: "error", message });
        }
    }

    async function onDelete(): Promise<void> {
        setStatus({ state: "idle" });
        const err = ensureBasics(true);
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

            const data = (await res.json().catch(() => ({}))) as any;
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
        <div className="mx-auto w-full max-w-[94rem] px-4 pb-24 pt-10 md:pt-14">
            <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <Card
                    shadow="none"
                    className={`${PANEL_RADIUS} border border-black/10 bg-white/82 dark:border-white/12 dark:bg-white/[0.05] min-h-[calc(100svh-10rem)] h-full`}
                >
                    <CardBody className="flex h-full flex-col gap-6 p-6 md:p-8">
                        {editorMode === "edit" ? (
                            <div className="flex w-full flex-1 min-h-0 flex-col">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <label
                                        htmlFor={contentId}
                                        className="text-sm font-medium text-black/70 dark:text-white/70"
                                    >
                                        正文（Markdown）
                                    </label>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            id={imageInputId}
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp,image/ico,image/webp"
                                            className="hidden"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                if (file) {
                                                    void uploadImageFile(file);
                                                }
                                            }}
                                        />
                                        <Button
                                            className={BUTTON_OUTLINE}
                                            isDisabled={isWorking || imageUploadStatus.state === "working"}
                                            onPress={() => imageInputRef.current?.click()}
                                        >
                                            {imageUploadStatus.state === "working" ? "上传中..." : "上传图片"}
                                        </Button>
                                    </div>
                                </div>

                                {imageUploadStatus.state !== "idle" ? (
                                    <div className={[
                                        "mt-3 text-sm",
                                        imageUploadStatus.state === "error"
                                            ? "text-red-400 dark:text-red-300"
                                            : imageUploadStatus.state === "success"
                                                ? "text-emerald-500 dark:text-emerald-300"
                                                : "text-black/55 dark:text-white/55",
                                    ].join(" ")}>
                                        {imageUploadStatus.message}
                                    </div>
                                ) : null}

                                <div className="mt-3 flex-1 min-h-0 rounded-[1.5rem] border border-black/10 bg-black/[0.02] px-5 py-4 dark:border-white/10 dark:bg-white/[0.02]">
                                    <textarea
                                        id={contentId}
                                        ref={textareaRef}
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

                                <div className="mt-3 flex-1 min-h-0 overflow-auto rounded-[1.5rem] border border-black/10 bg-black/[0.02] px-5 py-4 dark:border-white/10 dark:bg-white/[0.02]">
                                    {isPreviewWorking ? (
                                        <div className="flex items-center gap-2 text-sm text-black/55 dark:text-white/55">
                                            <Spinner size="sm" />
                                            正在渲染预览...
                                        </div>
                                    ) : previewError ? (
                                        <div className="text-sm text-red-400 dark:text-red-300">{previewError}</div>
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
                    <Card shadow="none" className={`${PANEL_RADIUS} border border-black/10 bg-white/82 dark:border-white/12 dark:bg-white/[0.05]`}>
                        <CardBody className="space-y-5 p-6">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                                    Writing Workspace
                                </p>
                                <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight">
                                    {SITE.write.title}
                                </h1>
                            </div>

                            {!isUnlocked ? (
                                <div className="space-y-3">
                                    <div className="rounded-2xl border border-black/12 bg-black/[0.02] px-4 py-3 text-sm text-black/68 dark:border-white/12 dark:bg-white/[0.03] dark:text-white/68">
                                        当前未登录。请先登录后进入写作台。
                                    </div>
                                    {unlockError ? (
                                        <div className="text-sm text-red-400 dark:text-red-300">{unlockError}</div>
                                    ) : null}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            className={BUTTON_OUTLINE}
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
                                            className={BUTTON_PRIMARY}
                                            onPress={() => {
                                                window.location.href = "/login?next=/write";
                                            }}
                                        >
                                            去登录
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-black/12 bg-black/[0.03] px-4 py-3 text-sm text-black/72 dark:border-white/12 dark:bg-white/[0.04] dark:text-white/76">
                                    已登录：{sessionUser?.displayName || sessionUser?.username}
                                    {sessionUser?.role ? `（${sessionUser.role}）` : ""}
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="text-xs font-medium text-black/55 dark:text-white/55">发布类型</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        className={publishType === "article" ? BUTTON_PRIMARY : BUTTON_OUTLINE}
                                        isDisabled={isWorking}
                                        onPress={() => {
                                            setPublishType("article");
                                            setStatus({ state: "idle" });
                                        }}
                                    >
                                        文章
                                    </Button>
                                    <Button
                                        className={publishType === "moment" ? BUTTON_PRIMARY : BUTTON_OUTLINE}
                                        isDisabled={isWorking}
                                        onPress={() => {
                                            setPublishType("moment");
                                            setStatus({ state: "idle" });
                                        }}
                                    >
                                        说说
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    onPress={onPublish}
                                    isDisabled={isWorking || !isUnlocked}
                                    className={`flex-1 ${BUTTON_PRIMARY}`}
                                >
                                    {isWorking ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Spinner size="sm" />
                                            {status.state === "working" ? status.message : "处理中..."}
                                        </span>
                                    ) : (
                                        publishType === "moment" ? "发布/修改说说" : "发布/修改文章"
                                    )}
                                </Button>
                                <Button
                                    className={BUTTON_OUTLINE}
                                    onPress={() => setEditorMode((current) => (current === "edit" ? "preview" : "edit"))}
                                    isDisabled={isWorking}
                                >
                                    {editorMode === "edit" ? "预览" : "返回编辑"}
                                </Button>
                                <Button
                                    className={BUTTON_DANGER}
                                    onPress={onDelete}
                                    isDisabled={isWorking || !isUnlocked || !normalizedSlug}
                                >
                                    删除
                                </Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    className={`flex-1 ${BUTTON_OUTLINE}`}
                                    onPress={onLoad}
                                    isDisabled={isWorking || !isUnlocked || !normalizedSlug}
                                >
                                    {publishType === "moment" ? "加载说说" : "加载文章"}
                                </Button>
                                <Button
                                    className={BUTTON_OUTLINE}
                                    onPress={onLogout}
                                >
                                    退出登录
                                </Button>
                            </div>

                            {isOwnerUser ? (
                                <Button
                                    className={BUTTON_OUTLINE}
                                    onPress={() => {
                                        window.location.href = "/write/authors";
                                    }}
                                >
                                    作者管理
                                </Button>
                            ) : null}

                            {status.state === "success" ? (
                                <div className="rounded-2xl border border-black/12 bg-black/[0.03] px-4 py-3 text-sm text-black/72 dark:border-white/12 dark:bg-white/[0.04] dark:text-white/76">
                                    {status.message}
                                    {status.postUrl ? (
                                        <>
                                            {" "}
                                            <a className="underline" href={status.postUrl}>
                                                打开页面
                                            </a>
                                        </>
                                    ) : null}
                                </div>
                            ) : null}

                            {status.state === "error" ? (
                                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 dark:border-red-300/22 dark:bg-red-500/12 dark:text-red-300">
                                    {status.message}
                                </div>
                            ) : null}
                        </CardBody>
                    </Card>

                    <Card shadow="none" className={`${PANEL_RADIUS} border border-black/10 bg-white/82 dark:border-white/12 dark:bg-white/[0.05]`}>
                        <CardBody className="space-y-5 p-6">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                                    Meta
                                </p>
                                <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">
                                    {publishType === "moment" ? "说说设置" : "文章设置"}
                                </h2>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-black/72 dark:text-white/72">
                                    {publishType === "moment" ? "说说ID（slug）" : "永久链接（slug）"}
                                </label>
                                <Input
                                    aria-label={publishType === "moment" ? "说说ID（slug）" : "永久链接（slug）"}
                                    value={slug}
                                    onValueChange={setSlug}
                                    variant="flat"
                                    classNames={inputClassNames}
                                />
                                <p className="text-xs text-black/52 dark:text-white/52">
                                    {publishType === "moment"
                                        ? (slug ? `实际：${normalizedSlug}` : "新建可留空自动生成；修改或删除需填写已发布 slug")
                                        : (slug ? `实际：${normalizedSlug}（发布后尽量不要改）` : "例如：my-first-post")}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    className={BUTTON_OUTLINE}
                                    onPress={() => {
                                        setSlug(generateSlug());
                                        setStatus({ state: "idle" });
                                    }}
                                    isDisabled={isWorking || publishType === "moment"}
                                >
                                    生成
                                </Button>
                                <Button
                                    className={BUTTON_OUTLINE}
                                    onPress={() => {
                                        resetForm();
                                        setSlug("");
                                        setStatus({ state: "idle" });
                                    }}
                                    isDisabled={isWorking}
                                >
                                    清空
                                </Button>
                                <Button className={BUTTON_OUTLINE} isDisabled>
                                    草稿
                                </Button>
                            </div>

                            {publishType === "article" ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-black/72 dark:text-white/72">标题（可选）</label>
                                    <Input aria-label="标题（可选）" value={title} onValueChange={setTitle} variant="flat" classNames={inputClassNames} />
                                </div>
                            ) : null}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-black/72 dark:text-white/72">日期（YYYY-MM-DD）</label>
                                <Input aria-label="日期（YYYY-MM-DD）" value={date} onValueChange={setDate} variant="flat" classNames={inputClassNames} />
                            </div>
                            {publishType === "article" ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-black/72 dark:text-white/72">简介（description，可选）</label>
                                    <Input aria-label="简介（description，可选）" value={description} onValueChange={setDescription} variant="flat" classNames={inputClassNames} />
                                </div>
                            ) : null}
                            {!hasSession || isOwnerUser ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-black/72 dark:text-white/72">作者（author）</label>
                                    <Input
                                        aria-label="作者（author）"
                                        value={author}
                                        onValueChange={setAuthor}
                                        variant="flat"
                                        classNames={inputClassNames}
                                    />
                                </div>
                            ) : null}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-black/72 dark:text-white/72">
                                    {publishType === "moment" ? "标签（tags）" : "关键词（keywords）"}
                                </label>
                                <Input
                                    aria-label={publishType === "moment" ? "标签（tags）" : "关键词（keywords）"}
                                    value={keywords}
                                    onValueChange={setKeywords}
                                    variant="flat"
                                    classNames={inputClassNames}
                                />
                                <p className="text-xs text-black/52 dark:text-white/52">
                                    {publishType === "moment"
                                        ? "逗号分隔，例如：生活,记录,通勤"
                                        : "逗号分隔，例如：notion,blog,writing"}
                                </p>
                            </div>

                        </CardBody>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
