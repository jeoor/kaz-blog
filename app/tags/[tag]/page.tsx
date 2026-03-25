import { permanentRedirect } from "next/navigation";

import { decodeTagParam } from "@/lib/tags";

export const revalidate = 60;

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
    const { tag } = await params;
    const currentTag = decodeTagParam(tag);
    permanentRedirect(`/archive?tag=${encodeURIComponent(currentTag)}`);
}