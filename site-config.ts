export const SITE = {
  // 站点标题
  title: "KazZz",
  // 站点域名
  url: "https://kaz-blog.kayro.cn",
  // 站点描述
  description: "一个以文章为主的简洁博客，记录技术、项目与长期思考。",
  // 昵称下的简介
  tagline: "写作优先，结构克制。",
  // 站点作者
  author: "Kaz",
  // 站点创立日期
  foundedAt: "2026-03-20",
  // 头像
  avatar: {
    src: "/avatar.png",
    alt: "KazZz",
  },
  // 站点图标
  icon: "/favicon.svg",
  // 左侧导航栏配置
  nav: [
    { href: "/archive", label: "归档" },
    { href: "/shuoshuo", label: "说说" },
    { href: "/photos", label: "相册" },
    { href: "/links", label: "友链" },
    { href: "/about", label: "关于" },
    { href: "/write", label: "写作台" },
  ],
  // 各站点的描述
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
  // 站点页脚信息
  footer: {
    copyrightName: "Kaz-Blog",
    poweredBy: {
      label: "Next.js",
      href: "https://nextjs.org",
    },
    // 页脚链接，可用于设置备案信息等
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
  // twikoo 评论系统配置
  comments: {
    twikoo: {
      enabled: true,
      envId: "https://twikoo.kayro.cn/",
      region: "",
    },
  },
  postFooter: {
    // 文章页底部的版权信息
    disclaimer:
      "本站内容仅供学习交流与个人记录使用，不构成任何建议。若内容涉及侵权或不当引用，请联系作者处理。",
    // 文章页底部的二维码，可用于放置公众号、赏赞二维码等
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
