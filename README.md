# Kaz-Blog

Kaz-Blog 是一套以写作为中心的个人博客实现。

内容主源是 Notion Database，前端使用 Next.js App Router 渲染；如果本地没有配置 Notion 环境变量，则自动回退到 `posts` 里的 Markdown 文章，保证本地开发和演示都能直接启动。

## 设计取向

- 阅读优先，而不是功能堆叠
- 后台最小化，只保留必要的写作入口
- 前台强调结构、留白和信息层级
- 不保留脚手架默认命名、默认文案和样例内容

## 当前能力

- 首页文章流、文章详情、归档、友链
- `/login` 登录保护
- `/write` 发布、加载、删除文章
- Notion 作为主内容后端
- Markdown 作为本地回退内容源
- Atom Feed、Sitemap、Robots

## 环境变量

复制 `.env.example` 为 `.env.local`，至少配置以下字段：

- `ADMIN_TOKEN`
- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

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

本项目默认使用 EdgeOne Cloud Functions 管理接口：`/cfapi/api/admin/session`、`/cfapi/api/admin/posts`（代码在 `cloud-functions/cfapi/**`）。在生产构建下，前端默认优先使用 `/cfapi`；你也可以显式设置 `NEXT_PUBLIC_ADMIN_API_BASE=/cfapi`。

若线上出现 `545`，通常表示 Cloud Functions 执行异常。优先检查：

- `/cfapi/api/admin/session` 与 `/cfapi/api/admin/posts` 是否已成功部署
- `ADMIN_TOKEN`、`NOTION_TOKEN`、`NOTION_DATABASE_ID` 等服务端环境变量是否注入到函数运行时
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
- `/login` 后台登录
- `/write` 写作台

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
