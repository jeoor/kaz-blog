<p align="center">
<a href="https://kaz-blog.kayro.cn/"><img src="./.github/assest/kaz-blog.svg" width="500" alt="kaz-blog"></a>
</p>

<p align="center">
  <strong>基于 Next.js + Notion 的极简个人/多用户博客系统</strong>
</p>

---

[![License](https://img.shields.io/github/license/kaz-blog/kaz-blog)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![Stars](https://img.shields.io/github/stars/kaz-blog/kaz-blog?style=social)](https://github.com)

## 特性

<details>
<summary>点击查看
</summary>

- 阅读优先、干净布局、信息层级明确
- 支持 Notion 文章同步 + 本地 Markdown 回退
- 多作者登录与写作（`/login`、`/write`）
- 自动生成 Atom RSS、Sitemap、Robots
- 支持归档、友链、标签、搜索、评论（Twikoo）
- Cloud Functions 管理接口：`/cfapi/api/admin/*`
- 轻量、可部署到 EdgeOne / Vercel / 其它平台

</details>

## [Demo演示](https://kaz-blog.kayro.cn/)


## 快速开始

```sh
npm install
cp .env.example .env.local
# 填写 NOTION_TOKEN/NOTION_DATABASE_ID
npm run dev
```

- Windows PowerShell 环境不稳定时，使用 `npm run clean && npm run dev:stable`

## 配置（环境变量）

最低要求：

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

多作者/会话：

- `AUTH_KV_BINDING`（默认 `AUTH_KV`）
- `AUTH_SESSION_DAYS`（默认 `30`）
- `REGISTER_INVITE_CODE`（可选）
- `AUTH_ALLOW_OPEN_REGISTRATION`（可选，`true` 公开注册）

静态宿主/独立管理 API：

- `NEXT_PUBLIC_ADMIN_API_BASE`（默认 `${origin}/cfapi` 或 `/api`）
- `IMAGE_HOST_TOKEN`（7bu 图床代理必要）
- `IMAGE_HOST_API_BASE`（默认 `https://7bu.top/api/v1`）

## Twikoo 评论配置

在 `app/site-config.ts` 添加：

```ts
comments: {
  twikoo: {
    enabled: true,
    envId: '你的 twikoo envId',
    region: '',
  },
},
```

## 目录说明

- `app/`：Next.js App Router 页面、路由、元信息
- `components/`：复用组件、UI 片段
- `lib/`：内容加载、Notion/Markdown 适配、工具函数
- `cloud-functions/cfapi/`：管理员 API 与 session/post 逻辑
- `posts/`：本地 Markdown 回退文章
- `public/`：静态资源

## 构建与排查

- 开发：`npm run dev`
- 编译：`npm run build`
- 代码检查：`npm run lint`

遇到 `/_next/static/... 404`，请：

1. 停止服务，`npm run clean`
2. 重新 `npm run dev:stable`
3. 浏览器强刷 `Ctrl+F5`

## 事项提示

- Notion 为主内容源，Markdown 为回退。生产建议 Notion 稳定期优先。
- `cloud-functions` 需要部署在支持 KV 的 EdgeOne 环境，否则可能出现 `545`。
- Favicon 主题切换可用两套图标（`/favicon-light.svg` + `/favicon-dark.svg`），或动态替换 `<link rel="icon">`。

## 贡献

欢迎 Fork、PR、Issue。贡献时请保持内容结构简洁、阅读体验优先。

## 许可证

MIT

## 当前能力

- 首页文章流、文章详情、归档、友链
- `/login` 多作者注册/登录
- `/write` 发布、加载、删除文章
- Notion 作为主内容后端
- Markdown 作为本地回退内容源
- Atom Feed、Sitemap、Robots

## 环境变量

复制 `.env.example` 为 `.env.local`，至少配置以下字段：

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

用于多作者登录（EdgeOne KV）：

- `AUTH_KV_BINDING`（默认 `AUTH_KV`，对应函数里绑定的 KV 名称）
- `AUTH_SESSION_DAYS`（可选，默认 `30`）
- `REGISTER_INVITE_CODE`（可选；当不开放注册时用于创建新作者）
- `AUTH_ALLOW_OPEN_REGISTRATION`（可选，`true` 时允许公开注册）

可选字段用于映射 Notion Database 的属性名：

- `NOTION_PROP_SLUG`
- `NOTION_PROP_PUBLISHED`
- `NOTION_PROP_DATE`
- `NOTION_PROP_DESCRIPTION`
- `NOTION_PROP_AUTHOR`
- `NOTION_PROP_KEYWORDS`
- `NOTION_PROP_TITLE`

如果你使用的是纯静态托管（例如 EdgeOne Pages 静态站点）且无法运行 Next.js `app/api/*`，可以把管理接口部署到单独的后端（例如边缘函数/Serverless），然后在前端构建时设置：

- `NEXT_PUBLIC_ADMIN_API_BASE`（例如 `https://api.example.com`；不填时开发环境默认同源 `/api/...`，生产环境默认 `/cfapi`）
- `IMAGE_HOST_TOKEN`（可选；用于 Cloud Functions 代理上传 7bu 图床，建议放服务端环境变量）
- `IMAGE_HOST_API_BASE`（可选；默认 `https://7bu.top/api/v1`）

本项目默认使用 EdgeOne Cloud Functions 管理接口：`/cfapi/api/admin/session`、`/cfapi/api/admin/posts`（代码在 `cloud-functions/cfapi/**`）。

- `POST /cfapi/api/admin/session`：`action=login|register`
- `GET /cfapi/api/admin/session`：检查当前会话
- `DELETE /cfapi/api/admin/session`：退出登录
- `GET/POST/DELETE /cfapi/api/admin/posts`：作者权限下的文章管理

在生产构建下，前端默认优先使用 `/cfapi`；你也可以显式设置 `NEXT_PUBLIC_ADMIN_API_BASE=/cfapi`。

若线上出现 `545`，通常表示 Cloud Functions 执行异常。优先检查：

- `/cfapi/api/admin/session` 与 `/cfapi/api/admin/posts` 是否已成功部署
- `NOTION_TOKEN`、`NOTION_DATABASE_ID` 等服务端环境变量是否注入到函数运行时
- 控制台日志分析中对应函数请求的错误堆栈

## 评论（Twikoo）

评论系统使用 Twikoo，配置集中在 `app/site-config.ts`：

```ts
comments: {
	twikoo: {
		enabled: true,
		envId: "你的 Twikoo envId",
		region: "", // 可选
	},
},
```

其中：

- `enabled`: 是否启用评论（不启用则文章页不渲染评论区）
- `envId`: Twikoo 后端环境 ID（必填）
- `region`: 地域（可选，不确定可留空）

## 启动方式

```sh
npm install
npm run dev
```

如果你在 Windows PowerShell 下偶发遇到本地开发异常退出，建议改用：

```sh
npm run clean
npm run dev:stable
```

常用入口：

- `/` 前台首页
- `/archive` 归档
- `/links` 友链
- `/login` 作者登录/注册
- `/write` 写作台（需要已登录会话）

如果你要在 `/write` 中使用 7bu 图床上传图片，可在 `.env.local` 或 Cloud Functions 运行时环境中添加：

```sh
IMAGE_HOST_TOKEN=你的7buBearerToken
```

本项目现在通过自己的 Cloud Functions 代理上传到 7bu，浏览器不会直接携带 7bu token 请求第三方接口。修改后需要重启开发服务器或重新部署函数，页面才会读取到新的 7bu 配置。

## 内容来源

优先级如下：

1. Notion Database
2. `posts/*.md` 本地回退

本地回退只用于开发和演示，不建议作为长期生产内容源。

## 目录说明

- `app`：页面、路由和 API
- `components`：可复用界面组件
- `lib`：内容读取、Notion 适配、鉴权与工具函数
- `public`：静态资源
- `posts`：本地回退文章样例与测试文章

## 开发说明

- 当前写作台使用 Markdown 输入，再转换为 Notion block 发布
- 为了保证可维护性，前端没有直接照搬第三方主题代码
- 如果继续重构样式，优先改结构和信息层级，再改装饰细节

## 本地 404 排查

如果浏览器偶发出现这类报错：

- `/_next/static/css/*.css 404`
- `/_next/static/chunks/*.js 404`

通常不是“CSS 文件丢了”，而是浏览器仍在请求上一轮构建或上一轮 dev 进程生成的 hash 资源，而当前 `.next` 目录已经被重建了。

常见触发方式：

- 本地 dev 进程异常退出后，浏览器标签页还保留旧页面
- 清理过 `.next` 后没有强刷页面
- Windows PowerShell 下 `npm` shim 异常，导致 Next 进程状态不稳定

推荐处理顺序：

1. 关闭当前标签页，重新打开站点
2. 执行 `npm run clean`
3. 执行 `npm run dev:stable`
4. 浏览器强制刷新一次（Ctrl+F5）

如果生产环境也出现同类问题，再检查部署平台是否把 HTML 和 `/_next/static` 分别缓存成了不同版本。

## License

MIT
