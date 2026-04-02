"use client";

import { useState } from "react";
import type { PhotoItem } from "@/app/photos.config";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth-context";
import { toFriendlyNotionConnectionMessage } from "@/components/photos/notion-error";
import PhotoAddButton from "@/components/photos/photo-add-button";
import PhotoGallery from "@/components/photos/photo-gallery";

type Props = {
    initialPhotos: PhotoItem[];
    title: string;
    description: string;
};

export default function PhotosPanel({ initialPhotos, title, description }: Props) {
    const { user } = useAuth();
    const [photos, setPhotos] = useState(initialPhotos);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [deletingSlug, setDeletingSlug] = useState("");

    function normalizeIdentity(value: string | undefined): string {
        return String(value || "").trim().toLowerCase();
    }

    function canDeletePhoto(photo: PhotoItem): boolean {
        if (!photo.slug) return false;

        const isOwner = normalizeIdentity(user?.role) === "owner";
        if (isOwner) return true;

        const author = normalizeIdentity(photo.author);
        if (!author) return false;

        const meDisplay = normalizeIdentity(user?.displayName);
        const meUsername = normalizeIdentity(user?.username);
        return !!author && (author === meDisplay || author === meUsername);
    }

    async function handleDeletePhoto(photo: PhotoItem) {
        const slug = String(photo.slug || "").trim();
        if (!slug) return;

        const ok = window.confirm("确定删除这张图片吗？删除后不可恢复。");
        if (!ok) return;

        setDeletingSlug(slug);
        setErrorMessage("");
        try {
            const res = await fetch(adminApiUrl(`/api/admin/posts?slug=${encodeURIComponent(slug)}`), {
                method: "DELETE",
                credentials: adminCredentials(),
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    setErrorMessage("登录已失效，请重新登录后再试");
                    return;
                }
                if (res.status === 403) {
                    setErrorMessage("仅允许删除自己上传的图片");
                    return;
                }
                const raw = String(data?.message || `删除失败：${res.status}`);
                setErrorMessage(toFriendlyNotionConnectionMessage(raw));
                return;
            }

            setPhotos((prev) => prev.filter((item) => item.slug !== slug));
            setSuccessMessage("图片已删除");
            window.setTimeout(() => setSuccessMessage(""), 2500);
        } catch (e) {
            const raw = e instanceof Error ? e.message : "删除失败，请稍后再试";
            setErrorMessage(toFriendlyNotionConnectionMessage(raw));
        } finally {
            setDeletingSlug("");
        }
    }

    function handlePhotoAdded(photo: PhotoItem) {
        setPhotos((prev) => [photo, ...prev]);
        setErrorMessage("");
        setSuccessMessage("照片已添加成功，已更新到当前页面。");
        window.setTimeout(() => {
            setSuccessMessage("");
        }, 3200);
    }

    return (
        <>
            <header className="border-b border-black/10 pb-10 dark:border-white/10">
                <div className="flex items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <p className="eyebrow-label">Photos</p>
                        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                            {title}
                        </h1>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-black/82 dark:text-white/80">
                            {description}
                        </p>
                        {successMessage ? (
                            <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
                                {successMessage}
                            </p>
                        ) : null}
                        {errorMessage ? (
                            <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                                {errorMessage}
                            </p>
                        ) : null}
                    </div>
                    <div className="mt-5 shrink-0">
                        <PhotoAddButton onAdded={handlePhotoAdded} />
                    </div>
                </div>
            </header>

            <PhotoGallery
                photos={photos}
                canDelete={canDeletePhoto}
                deletingSlug={deletingSlug}
                onDelete={handleDeletePhoto}
            />
        </>
    );
}