import BlogRightRail from "@/components/layout/blog-right-rail";
import BlogShell from "@/components/layout/blog-shell";
import BlogSidebar from "@/components/layout/blog-sidebar";
import PhotosPanel from "@/components/photos/photos-panel";
import { SITE } from "@/app/site-config";
import { getPhotos } from "@/lib/photos";
import { getSortedPostsData } from "@/lib/posts";

export const dynamic = "force-dynamic";

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
            <PhotosPanel
                initialPhotos={photos}
                title={SITE.photos?.title ?? "相册"}
                description={SITE.photos?.description ?? "用照片记录一些时刻。"}
            />
        </BlogShell>
    );
}
