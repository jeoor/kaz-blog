"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth-context";

export default function PhotoAddButton() {
    const { isLoggedIn } = useAuth();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [src, setSrc] = useState("");
    const [alt, setAlt] = useState("");
    const [caption, setCaption] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    if (!isLoggedIn) return null;

    function close() {
        setOpen(false);
        setSrc("");
        setAlt("");
        setCaption("");
        setError("");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmedSrc = src.trim();
        if (!trimmedSrc) {
            setError("请输入图片地址");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/photos", {
                method: "POST",
                credentials: "include",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    src: trimmedSrc,
                    alt: alt.trim(),
                    caption: caption.trim(),
                }),
            });

            const data: Record<string, unknown> = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 401) {
                    setError("登录已失效，请重新登录后再试");
                    return;
                }
                setError(String(data.error || "添加失败，请重试"));
                return;
            }

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
            const formData = new FormData();
            formData.append("file", file);
            formData.append("permission", "1");

            const res = await fetch(adminApiUrl("/api/admin/images"), {
                method: "POST",
                credentials: adminCredentials(),
                headers: { Accept: "application/json" },
                body: formData,
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok || data?.status === false) {
                setError(typeof data?.message === "string" ? data.message : `上传失败：${res.status}`);
                return;
            }

            const uploadedUrl = String(data?.data?.links?.url || "").trim();
            if (!uploadedUrl) {
                setError("上传成功，但未返回图片链接");
                return;
            }

            setSrc(uploadedUrl);
            if (!alt.trim()) {
                const suggestedAlt = file.name.replace(/\.[^.]+$/, "").trim();
                if (suggestedAlt) setAlt(suggestedAlt);
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
                className="rounded-[1.1rem] border border-black/8 bg-black/[0.02] px-4 py-2 text-sm text-black/62 transition hover:bg-black/[0.04] dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/60 dark:hover:bg-white/[0.04]"
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
                                            {uploading ? "上传中…" : "上传本地图片"}
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
                                <label className={labelCls}>Alt 描述（可选）</label>
                                <input
                                    type="text"
                                    placeholder="图片的文字描述，用于无障碍阅读"
                                    value={alt}
                                    onChange={(e) => setAlt(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>说明文字（可选）</label>
                                <input
                                    type="text"
                                    placeholder="显示在 lightbox 图片下方"
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
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
                                className="rounded-[1rem] bg-black/85 px-5 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50 dark:bg-white/90 dark:text-black dark:hover:bg-white"
                            >
                                {loading ? "添加中…" : "添加"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
