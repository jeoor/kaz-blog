import type { PhotoItem } from "@/content/photos.config";
import { PHOTOS } from "@/content/photos.config";
import { isNotionEnabled } from "@/lib/notion";
import { getPhotosFromNotion } from "@/lib/photos-notion";

/**
 * 统一相册加载器：优先尝试 Notion，失败时回退到本地 photos.config.ts。
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
