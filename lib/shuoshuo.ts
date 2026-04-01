import { getShuoshuoEntries as getShuoshuoEntriesLocal, type ShuoshuoItem } from "@/content/shuoshuo";
import { isNotionEnabled } from "@/lib/notion";
import { getShuoshuoEntriesNotion } from "@/lib/shuoshuo-notion";

export async function getShuoshuoEntriesData(): Promise<ShuoshuoItem[]> {
    if (isNotionEnabled()) {
        try {
            const remote = await getShuoshuoEntriesNotion();
            if (remote.length > 0) {
                return remote;
            }
        } catch (error) {
            console.error("[shuoshuo] Failed to fetch moments from Notion, fallback to local content.", error);
        }
    }

    return getShuoshuoEntriesLocal();
}
