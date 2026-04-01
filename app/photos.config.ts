export type PhotoItem = {
    src: string;
    alt: string;
    caption?: string;
    slug?: string;
    author?: string;
    date?: string;
};

/**
 * 相册图片列表。
 * src 可以是相对路径（放在 public/ 下）或完整外链。
 * caption 用于 lightbox 底部说明文字，可不填。
 */
export const PHOTOS: PhotoItem[] = [
    {
        src: "https://bu.dusays.com/2026/03/05/69a9a45f9418e.webp",
        alt: "示例照片 1",
        caption: "在这里写一行说明",
    },
    {
        src: "https://bu.dusays.com/2026/03/05/69a9a45ef3ef6.webp",
        alt: "示例照片 2",
    },
    {
        src: "https://bu.dusays.com/2026/03/05/69a9a45e4fc38.webp",
        alt: "示例照片 3",
        caption: "记录一段时光",
    },
];
