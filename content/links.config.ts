export type FriendLink = {
    name: string;
    url: string;
    description?: string;
    avatar?: string;
};

export const FRIEND_LINKS: FriendLink[] = [
    {
        name: "GitHub",
        url: "https://github.com",
        avatar: "https://github.com/favicon.ico",
        description: "代码托管与开源协作平台。",
    },
    {
        name: "Next.js",
        url: "https://nextjs.org",
        avatar: "https://nextjs.org/favicon.ico",
        description: "React 应用框架（本项目使用）。",
    },
    {
        name: "Notion",
        url: "https://www.notion.so",
        avatar: "https://www.notion.so/images/favicon.ico",
        description: "内容与知识管理（本项目作为内容后端）。",
    },
    {
        name: "React",
        url: "https://react.dev",
        avatar: "https://react.dev/favicon.ico",
        description: "UI 组件与渲染核心。",
    },
    {
        name: "TypeScript",
        url: "https://www.typescriptlang.org",
        avatar: "https://www.typescriptlang.org/favicon-32x32.png",
        description: "类型系统与工程体验。",
    },
    {
        name: "Tailwind CSS",
        url: "https://tailwindcss.com",
        avatar: "https://tailwindcss.com/favicons/favicon-32x32.png",
        description: "原子化 CSS（本项目样式体系）。",
    },
];
