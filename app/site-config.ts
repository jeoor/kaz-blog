export const SITE = {
  title: "KazZz",
  description: "一个以文章为主的简洁博客，记录技术、项目与长期思考。",
  tagline: "写作优先，结构克制。",
  author: "Kaz",
  avatar: {
    src: "/avatar.svg",
    alt: "Kaz",
  },
  nav: [
    { href: "/archive", label: "归档" },
    { href: "/shuoshuo", label: "说说" },
    { href: "/photos", label: "相册" },
    { href: "/links", label: "友链" },
    { href: "/about", label: "关于" },
    { href: "/write", label: "写作台" },
  ],
  photos: {
    title: "相册",
    description: "用照片记录走过的地方与时刻。",
  },
  home: {
    intro: "围绕文章阅读重新整理的信息结构。内容从 Notion 进入，前端保持克制、安静、可长期阅读。",
    pageSize: 6,
  },
  archive: {
    title: "文章归档",
    description: "按时间整理全部文章，保留一条清晰的写作轨迹。",
  },
  links: {
    title: "连接与友链",
    description: "一些值得长期访问的网站。",
  },
  login: {
    title: "进入写作后台",
  },
  write: {
    title: "写作台",
    hint: "写作流程保持简单：整理结构、生成 slug、发布、校对。",
  },
  footer: {
    copyrightName: "Kaz-Blog",
    poweredBy: {
      label: "Next.js",
      href: "https://nextjs.org",
    },
    filings: [
      {
        enabled: true,
        label: "GitHub",
        href: "https://github.com/jeoor/kaz-blog",
      },
      {
        enabled: false,
        label: "",
        href: "",
      },
      {
        enabled: false,
        label: "",
        href: "",
      },
    ],
  },
  comments: {
    twikoo: {
      enabled: true,
      envId: "https://twikoo.kayro.cn/",
      region: "",
    },
  },
  postFooter: {
    disclaimer:
      "本站内容仅供学习交流与个人记录使用，不构成任何建议。若内容涉及侵权或不当引用，请联系作者处理。",
    qrcodes: [
      {
        label: "二维码1",
        src: "/qr/qrcode_github.com.png",
        alt: "二维码1",
      },
      {
        label: "二维码2",
        src: "/qr/qrcode_nextjs.org.png",
        alt: "二维码2",
      },
    ],
  },
};
