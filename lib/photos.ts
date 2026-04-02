import type { PhotoItem } from "@/app/photos.config";
import { PHOTOS } from "@/app/photos.config";
import { isNotionEnabled } from "@/lib/notion";
import { getPhotosFromNotion } from "@/lib/photos-notion";

/**
 * Unified photo loader: tries Notion first, falls back to local photos.config.ts.
 */
export async function getPhotos(): Promise<PhotoItem[]> {
    if (isNotionEnabled()) {
        try {
            const notionPhotos = await getPhotosFromNotion();
            if (notionPhotos !== null) return notionPhotos;
        } catch (error) {
            console.error("[photos] Failed to fetch photos from Notion, fallback to local photos.config.ts.", error);
        }
    }

    return PHOTOS;
}
