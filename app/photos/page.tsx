import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import PhotoGallery from "@/components/photos/photo-gallery";
import PhotoAddButton from "@/components/photos/photo-add-button";
import { SITE } from "@/app/site-config";
import { getPhotos } from "@/lib/photos";
import { getSortedPostsData } from "@/lib/posts";

export const revalidate = 60;

export const metadata = {
    title: "相册",
    description: "用照片记录一些时刻。",
};

export default async function PhotosPage() {
    const [photos, posts] = await Promise.all([getPhotos(), getSortedPostsData()]);

    return (
        <BlogShell
            sidebar={<BlogSidebar active="photos" />}
            aside={<BlogRightRail posts={posts} title="Photos" note="用照片记录走过的地方与时刻。" />}
            mainClassName="desktop-blog-main-wide"
        >
            <header className="border-b border-black/10 pb-10 dark:border-white/10">
                <div className="flex items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <p className="eyebrow-label">Photos</p>
                        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                            {SITE.photos?.title ?? "相册"}
                        </h1>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-black/82 dark:text-white/80">
                            {SITE.photos?.description ?? "用照片记录一些时刻。"}
                        </p>
                    </div>
                    <div className="mt-5 shrink-0">
                        <PhotoAddButton />
                    </div>
                </div>
            </header>

            <PhotoGallery photos={photos} />
        </BlogShell>
    );
}
