export type ShuoshuoItem = {
    id: string;
    date: string;
    author?: string;
    category: string;
    body: string;
    tags: string[];
};

const SHUOSHUO_ENTRIES: ShuoshuoItem[] = [
    {
        id: "2026-03-17-train",
        date: "2026-03-17T21:39:00+08:00",
        author: "Kaz",
        category: "生活随笔",
        body: `15:30 从学校出发去南京南站，路上一直在补课件。

18:40 抵达宜兴，随即开始上课。

20:40 课程结束，赶 21:14 的高铁回宁。

22:00 到南京南站，转地铁到家已经接近 23:30。

![站台 A](/demo/lightbox-check.svg)
![站台 B](/demo/lightbox-check.svg)`,
        tags: ["通勤", "行程"],
    },
    {
        id: "2026-03-16-rss",
        date: "2026-03-16T19:43:00+08:00",
        author: "Kaz",
        category: "折腾日记",
        body: `把桌面面板接上 FreshRSS 订阅，信息流终于不靠手动刷新。

下一步准备把低频源收进同一条阅读管线。

![FreshRSS 配置界面](/demo/lightbox-check.svg)`,
        tags: ["效率", "信息流"],
    },
    {
        id: "2026-03-12-focus",
        date: "2026-03-12T22:18:00+08:00",
        author: "Kaz",
        category: "写作流程",
        body: `今天把说说页重新梳理了一遍：先保证可读，再做氛围。

想法是让动态像日志，不像社交 feed。`,
        tags: ["界面", "写作"],
    },
];

export function getShuoshuoEntries(): ShuoshuoItem[] {
    return [...SHUOSHUO_ENTRIES].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
