import type { PhotoItem } from "@/app/photos.config";
import { PHOTOS } from "@/app/photos.config";
import { getPhotosFromNotion } from "@/lib/photos-notion";

/**
 * Unified photo loader: tries Notion first, falls back to local photos.config.ts.
 */
export async function getPhotos(): Promise<PhotoItem[]> {
    try {
        const notionPhotos = await getPhotosFromNotion();
        if (notionPhotos !== null) return notionPhotos;
    } catch {
        // fall through to local config
    }
    return PHOTOS;
}
