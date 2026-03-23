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
    { href: "/links", label: "友链" },
    { href: "/about", label: "关于" },
    { href: "/write", label: "写作台" },
  ],
  home: {
    intro: "围绕文章阅读重新整理的信息结构。内容从 Notion 进入，前端保持克制、安静、可长期阅读。",
    pageSize: 6,
  },
  archive: {
    title: "文章归档",
    description: "按时间整理全部文章，保留一条清晰的写作轨迹。",
  },
  about: {
    title: "关于",
    description: "一个偏长期主义的个人站点，主要放写作、项目记录，以及长期维护的公开笔记。",
    intro:
      "这里更像个人工作台和公开笔记，不追求面面俱到，只保留我会长期维护的栏目：文章、归档、友链和关于。",
    profile: {
      name: "Kaz",
      role: "开发者 / 写作者",
      note: "关注写作体验、界面结构和内容系统，偏爱把复杂问题拆成稳定、可长期维护的模块。",
    },
    sections: [
      {
        title: "这个站点想解决什么",
        content:
          "一是把 Notion 作为内容后端稳定接进来；二是让前台保持足够克制，不被后台结构反向绑架；三是把文章的发布、阅读和归档做得足够稳定。",
      },
      {
        title: "我在这里会写什么",
        content:
          "主要是建站、产品感受、界面设计、长期项目记录，以及一些值得反复回看的方法和判断。",
      },
      {
        title: "我希望它保持什么状态",
        content:
          "更新频率不追求高，但希望每个栏目都能长期可用、信息足够清楚，页面结构也能承受后续继续演进。",
      },
    ],
  },
  links: {
    title: "连接与友链",
    description: "一些值得长期访问的网站。",
  },
  login: {
    title: "进入写作后台",
    description: "只保留最小管理入口。",
  },
  write: {
    title: "写作台",
    description: "在这里编辑 Markdown，并将内容同步进 Notion 数据库。",
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
