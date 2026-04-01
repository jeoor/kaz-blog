"use client";

import { useState } from "react";
import type { PhotoItem } from "@/app/photos.config";
import PhotoAddButton from "@/components/photos/photo-add-button";
import PhotoGallery from "@/components/photos/photo-gallery";

type Props = {
    initialPhotos: PhotoItem[];
    title: string;
    description: string;
};

export default function PhotosPanel({ initialPhotos, title, description }: Props) {
    const [photos, setPhotos] = useState(initialPhotos);
    const [successMessage, setSuccessMessage] = useState("");

    function handlePhotoAdded(photo: PhotoItem) {
        setPhotos((prev) => [photo, ...prev]);
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
                    </div>
                    <div className="mt-5 shrink-0">
                        <PhotoAddButton onAdded={handlePhotoAdded} />
                    </div>
                </div>
            </header>

            <PhotoGallery photos={photos} />
        </>
    );
}