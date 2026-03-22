import RightRail from "@/components/layout/right-rail/right-rail";
import { getBlogRailWidgets } from "@/components/layout/right-rail/blog-widgets";

type Props = {
    posts: BlogPost[];
    title?: string;
    note?: string;
    currentTag?: string;
};

export default function BlogRightRail({ posts, title = "站点概览", note, currentTag }: Props) {
    return (
        <RightRail widgets={getBlogRailWidgets({ posts, title, note, currentTag })} />
    );
}