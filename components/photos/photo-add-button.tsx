"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { PhotoItem } from "@/content/photos.config";
import { toFriendlyNotionConnectionMessage } from "@/components/photos/notion-error";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth-context";

function todayYmd(): string {
    return new Date().toISOString().slice(0, 10);
}

const WEBP_QUALITY = 0.86;

function shouldConvertImageToWebp(file: File): boolean {
    const mime = file.type.toLowerCase();
    if (!mime) return false;
    if (mime === "image/webp") return false;
    if (mime === "image/gif") return false;
    return ["image/jpeg", "image/jpg", "image/png", "image/bmp", "image/x-icon", "image/vnd.microsoft.icon"].includes(mime);
}

function renameFileToWebp(name: string): string {
    const baseName = name.replace(/\.[^.]+$/, "");
    return `${baseName || "image"}.webp`;
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

function resolvePublishError(status: number, data: any): string {
    const message = String(data?.message || data?.error || "").trim();
    if (toFriendlyNotionConnectionMessage(message) !== message) {
        return "Notion 连接失败，请稍后再试";
    }
    if (
        status === 429
        || /rate[_\s-]?limit/i.test(message)
        || /too many requests/i.test(message)
        || /throttle/i.test(message)
        || /request_limit_reached/i.test(message)
    ) {
        return "上传频繁，请稍后再试";
    }
    if (status === 401) return "登录已失效，请重新登录后再试";
    if (status === 403) return "当前账号没有发布图片的权限";
    if (status === 400 && /notion database has no title property/i.test(message)) {
        return "Notion 数据库缺少标题列，无法创建图片记录";
    }
    if (status === 400 && /missing frontmatter fields/i.test(message)) {
        return "图片信息不完整，无法发布到 Notion";
    }
    if (/notion is not configured/i.test(message) || /notion 未配置/i.test(message)) {
        return "Notion 未配置完成，请检查环境变量";
    }
    if (/forbidden/i.test(message)) {
        return "当前账号没有发布图片的权限";
    }
    return toFriendlyNotionConnectionMessage(message) || `发布失败：${status}`;
}

function resolveUploadError(status: number, data: any): string {
    const message = String(data?.message || data?.error || "").trim();
    if (status === 401) return "登录已失效，请重新登录后再上传";
    if (status === 403) return "当前账号没有上传图片的权限";
    if (/missing image file/i.test(message) || /缺少图片文件/.test(message)) return "未选择本地图片文件";
    return message || `上传失败：${status}`;
}

type Props = {
    onAdded?: (photo: PhotoItem) => void;
};

export default function PhotoAddButton({ onAdded }: Props) {
    const { isLoggedIn, user } = useAuth();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [src, setSrc] = useState("");
    const [altCaption, setAltCaption] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    if (!isLoggedIn) return null;

    function close() {
        setOpen(false);
        setSrc("");
        setAltCaption("");
        setError("");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmedSrc = src.trim();
        const trimmedAlt = altCaption.trim();
        const trimmedCaption = altCaption.trim();
        if (!trimmedSrc) {
            setError("请输入图片地址");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const markdownImage = `![${trimmedAlt}](${trimmedSrc}${trimmedCaption ? ` \"${trimmedCaption}\"` : ""})`;

            const res = await fetch(adminApiUrl("/api/admin/posts"), {
                method: "POST",
                credentials: adminCredentials(),
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    type: "photo",
                    slug: "",
                    frontmatter: {
                        title: trimmedAlt || trimmedCaption || "照片",
                        date: todayYmd(),
                        description: trimmedCaption || trimmedAlt || "图库图片",
                        author: "",
                        keywords: [],
                    },
                    body: markdownImage,
                }),
            });

            const data = (await res.json().catch(() => ({}))) as any;

            if (!res.ok) {
                setError(resolvePublishError(res.status, data));
                return;
            }

            onAdded?.({
                src: trimmedSrc,
                alt: trimmedAlt,
                caption: trimmedCaption || undefined,
                slug: String(data?.slug || "").trim() || undefined,
                author: String(user?.displayName || user?.username || "").trim() || undefined,
                date: todayYmd(),
            });
            close();
            router.refresh();
        } catch {
            setError("网络错误，请重试");
        } finally {
            setLoading(false);
        }
    }

    async function handleLocalFileUpload(file: File) {
        if (!file) return;

        setError("");
        setUploading(true);
        try {
            const uploadFile = shouldConvertImageToWebp(file) ? await convertImageFileToWebp(file) : file;

            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("permission", "1");

            const res = await fetch(adminApiUrl("/api/admin/images"), {
                method: "POST",
                credentials: adminCredentials(),
                headers: { Accept: "application/json" },
                body: formData,
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok || data?.status === false) {
                setError(resolveUploadError(res.status, data));
                return;
            }

            const uploadedUrl = String(data?.data?.links?.url || "").trim();
            if (!uploadedUrl) {
                setError("上传成功，但未返回图片链接");
                return;
            }

            setSrc(uploadedUrl);
            if (!altCaption.trim()) {
                const suggestedAlt = uploadFile.name.replace(/\.[^.]+$/, "").trim();
                if (suggestedAlt) setAltCaption(suggestedAlt);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "图片上传失败");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    const inputCls =
        "w-full rounded-[0.9rem] border border-black/10 bg-black/[0.02] px-3.5 py-2.5 text-sm outline-none transition focus:border-black/25 dark:border-white/10 dark:bg-white/[0.03] dark:focus:border-white/25";
    const labelCls = "mb-1.5 block text-xs font-medium text-black/50 dark:text-white/50";

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-[1.1rem] border border-black/15 bg-black/[0.05] px-4 py-2 text-sm text-black/78 transition hover:bg-black/[0.08] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/80 dark:hover:bg-white/[0.07]"
            >
                添加照片
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    onClick={close}
                    role="dialog"
                    aria-modal="true"
                    aria-label="添加照片"
                >
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

                    <form
                        onSubmit={(e) => { void handleSubmit(e); }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-10 w-full max-w-md rounded-[1.4rem] border border-black/10 bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-[#18191b]"
                    >
                        <h2 className="mb-5 font-serif text-xl font-semibold">添加照片</h2>

                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>图片地址 *</label>
                                <div className="space-y-2">
                                    <input
                                        type="url"
                                        placeholder="https://example.com/photo.jpg"
                                        value={src}
                                        onChange={(e) => setSrc(e.target.value)}
                                        required
                                        className={inputCls}
                                        autoFocus
                                    />
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            disabled={uploading || loading}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="rounded-[0.9rem] border border-black/10 bg-black/[0.02] px-3 py-2 text-xs text-black/65 transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/65 dark:hover:bg-white/[0.05]"
                                        >
                                            {uploading ? "上传中..." : "上传本地图片"}
                                        </button>
                                        <span className="text-xs text-black/40 dark:text-white/45">
                                            上传后会自动填入图片地址
                                        </span>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                void handleLocalFileUpload(file);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>说明文字（可选）</label>
                                <input
                                    type="text"
                                    placeholder="图片描述，同时用于 alt 和 lightbox 说明"
                                    value={altCaption}
                                    onChange={(e) => setAltCaption(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>
                        )}

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={close}
                                className="rounded-[1rem] px-4 py-2 text-sm text-black/50 transition hover:bg-black/[0.04] dark:text-white/50 dark:hover:bg-white/[0.04]"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                disabled={loading || uploading}
                                className="rounded-[1rem] border border-black/20 bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/40 disabled:text-white/85 dark:border-white/20 dark:bg-white/90 dark:text-black dark:hover:bg-white dark:disabled:bg-white/45 dark:disabled:text-black/70"
                            >
                                {loading ? "添加中..." : "添加"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
