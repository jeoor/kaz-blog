<p align="center">
  <a href="https://kaz-blog.kayro.cn/">
    <img src="./.github/assest/kaz-blog.svg" width="500" alt="kaz-blog" />
  </a>
</p>

<p align="center">
  一款基于 Next.js + Notion 的个人/多用户 Serverless 博客系统，部署到 EdgeOne Page
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jeoor/kaz-blog" alt="license" /></a>
  <a href="https://github.com/jeoor/kaz-blog"><img src="https://img.shields.io/github/stars/jeoor/kaz-blog?style=social" alt="stars" /></a>
</p>

![preview](./.github/assest/preview.png)

## 在线演示

预览地址: [https://kaz-blog.kayro.cn/](https://kaz-blog.kayro.cn/)

## 功能特性

- Notion 作为主内容源，支持本地 Markdown 回退
- 支持用户注册、登录、多作者写作与作者管理
- 支持归档、友链、标签、搜索、说说、相册、关于页、评论（Twikoo）
- 支持明暗主题切换
- 自动生成 Atom、Sitemap、Robots
- 支持部署到 EdgeOne Page

## 快速开始



## 配置说明

### 站点信息配置

站点主域名请在 [app/site-config.ts](app/site-config.ts) 的 SITE.url 中配置。

- 该配置用于 metadata、Atom、Sitemap 等绝对链接生成。
- NEXT_PUBLIC_URL 仅作为旧版本兼容项保留，不再作为当前主配置来源。

### 环境变量

复制 [.env.example](.env.example) 为 .env.local，至少配置：

- NOTION_TOKEN
- NOTION_DATABASE_ID

多作者与会话（EdgeOne KV）：

- AUTH_KV_BINDING（默认 AUTH_KV）
- AUTH_SESSION_DAYS（可选，默认 30）
- REGISTER_INVITE_CODE（可选）
- AUTH_ALLOW_OPEN_REGISTRATION（可选，true 为公开注册）

可选 Notion 字段映射：

- NOTION_PROP_SLUG
- NOTION_PROP_PUBLISHED
- NOTION_PROP_DATE
- NOTION_PROP_DESCRIPTION
- NOTION_PROP_AUTHOR
- NOTION_PROP_KEYWORDS
- NOTION_PROP_TITLE

可选管理 API 与图床代理：

- NEXT_PUBLIC_ADMIN_API_BASE（默认开发同源 /api，生产默认 /cfapi）
- IMAGE_HOST_TOKEN（可选，7bu 图床代理 token）
- IMAGE_HOST_API_BASE（可选，默认 https://7bu.top/api/v1）

## 评论配置（Twikoo）

在 [app/site-config.ts](app/site-config.ts) 中配置：

```ts
comments: {
  twikoo: {
    enabled: true,
    envId: "你的 twikoo envId",
    region: "",
  },
},
```

## 项目结构

- app/: App Router 页面、路由、元信息
- components/: 复用组件
- lib/: 内容读取、Notion 适配、工具函数
- cloud-functions/cfapi/: 管理 API 与会话/文章逻辑
- posts/: 本地 Markdown 回退内容
- public/: 静态资源

## 当前能力

- 首页文章流、文章详情、归档、友链
- /login 多作者注册/登录
- /write 发布、加载、删除文章
- Notion 主内容源 + 本地回退
- Atom Feed、Sitemap、Robots

## 内容来源优先级

1. Notion Database
2. posts/*.md 本地回退

说明：本地回退主要用于开发与演示，不建议长期作为生产主内容源。

## 常用命令

- npm run dev: 本地开发
- npm run dev:stable: Windows PowerShell 稳定启动
- npm run clean: 清理 .next 缓存
- npm run lint: 代码检查
- npm run build: 生产构建

## 常见问题排查

### 1. /_next/static/*.css 或 *.js 出现 404

通常是浏览器仍在请求旧构建 hash 资源，而 .next 已被重建。

建议按顺序处理：

1. 关闭旧标签页并重新打开站点
2. 执行 npm run clean
3. 执行 npm run dev:stable
4. 浏览器强制刷新（Ctrl+F5）

### 2. 线上出现 545

通常表示 Cloud Functions 执行异常，优先检查：

- /cfapi/api/admin/session 与 /cfapi/api/admin/posts 是否已部署
- NOTION_TOKEN、NOTION_DATABASE_ID 等变量是否注入函数运行时
- 平台日志中对应函数请求的报错堆栈

## 管理接口

使用 EdgeOne Cloud Functions：

- POST /cfapi/api/admin/session: action=login|register
- GET /cfapi/api/admin/session: 检查当前会话
- DELETE /cfapi/api/admin/session: 退出登录
- GET/POST/DELETE /cfapi/api/admin/posts: 作者权限下文章管理

## 许可证

MIT
