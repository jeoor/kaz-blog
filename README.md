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

---

简体中文说明 | [English README](./README_en.md)

## 在线演示

预览地址: [https://kaz-blog.kayro.cn/](https://kaz-blog.kayro.cn/)

## 功能特性

- Notion 作为主内容源，支持本地 Markdown 回退
- 支持用户注册、登录、多作者写作与作者管理
- 支持归档、友链、标签、搜索、说说、相册、关于页、评论（Twikoo）
- 支持明暗主题切换
- 自动生成 Atom、Sitemap、Robots
- 支持部署到 EdgeOne Page

## 适用场景

- 想要使用基础的线上写作与内容管理功能的个人/多用户博客
- 需要多作者写作、基础后台和轻量管理能力的内容站点
- 希望部署在 EdgeOne Page 上

## 快速开始

生产部署目前支持 EdgeOne Page，本地开发与调试可正常进行。

### 一键部署

您可以通过 [腾讯云 EdgeOne Pages](https://pages.edgeone.ai/zh) 一键部署。

直接点击此按钮一键部署：

[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fjeoor%2Fkaz-blog)

查看 [腾讯云 EdgeOne Pages 文档](https://pages.edgeone.ai/zh/document/product-introduction) 了解更多详情。

之后，你需要
- 创建一个 KV 空间，用于储存用户信息，变量名称设置为 AUTH_KV
![kv](./.github/assest/kv.png)

- 创建 [Notion](https://www.notion.so/) 数据库
![createDB](./.github/assest/createDB.png)

- 在新建的数据库中添加以下属性（属性名称可自定义，但类型必须对应）：
  - Slug（文本）
  - Published（复选框）
  - Date（日期）
  - Description（文本）
  - Author（文本）
  - Keywords（多选）
  - Cover（网址）

- 创建新的[内部集成](https://www.notion.so/my-integrations)，`关联的工作空间`选择之前创建数据库的工作空间并给予数据库访问权限
![integration](./.github/assest/integration.png)
![share](./.github/assest/share.png)


- 复制数据库 ID 和集成 Token，分别填入环境变量 NOTION_DATABASE_ID 和 NOTION_TOKEN
  - 当前数据库网址格式为 `https://www.notion.so/[Page ID]?v=[View ID]`，其中 `Page ID` 即为 `NOTION_DATABASE_ID`
  - 进入刚建立的[内部集成](https://www.notion.so/my-integrations)，其中的`内部 API 集成密钥`即为 `NOTION_TOKEN`

- 如你想开启上传本地图片的功能，需要去 [7bu 图床](https://7bu.top/) 注册账号并获取 token，填入环境变量 `IMAGE_HOST_TOKEN`

> 更多环境变量详见 [.env.example](./.env.example)里的说明

### 本地调试

- 克隆项目

```bash
git clone https://github.com/jeoor/kaz-blog.git
```
- 进入项目目录

```bash
cd kaz-blog
```
- 安装依赖

```bash
npm install
```
- 复制 `.env.example` 为 `.env.local`并配置必要的环境变量，或者直接在部署平台的环境变量设置中添加：

```bash
cp .env.example .env.local
```
- 启动开发服务器

```bash
npm run dev
```
- 或构建生产版本

```bash
npm run build && npm run start
```
- 访问 `http://localhost:3000` 查看站点

## 配置

### 站点信息配置

在 [site-config.ts](./site-config.ts) 配置站点基础信息

目前`关于`页和`友链`页还未支持直接链接数据库编辑，仍需要在[content/about.md](./content/about.md)和[content/links.config.ts](./content/links.config.ts)中编辑🙏

### 环境变量

详见 [.env.example](./.env.example) 里的注释说明。下面列出最常用配置：

| 变量名 | 是否必填 | 说明 |
| --- | --- | --- |
| AUTH_KV_BINDING | 需要认证功能时必填 | EdgeOne KV 绑定名称，默认可用 AUTH_KV |
| REGISTER_INVITE_CODE | 关闭开放注册时建议填写 | 注册邀请码 |
| NOTION_TOKEN | 使用 Notion 内容源时必填 | Notion 内部集成密钥 |
| NOTION_DATABASE_ID | 使用 Notion 内容源时必填 | Notion 数据库 ID |
| IMAGE_HOST_TOKEN | 可选 | 7bu 图床 token，用于上传图片 |

## 项目结构

- app/: App Router 页面、布局、路由与元信息（含 sitemap/robots/atom）
- components/: 复用 UI 组件（布局、文章、评论、相册、说说等）
- lib/: 内容加载与适配层（Notion、本地回退）及通用工具
- cloud-functions/cfapi/: EdgeOne Cloud Functions（管理 API、会话与文章管理）
- content/: 本地内容与配置（about、links、photos、shuoshuo、posts 回退）
- public/: 站点静态资源
- scripts/: 辅助脚本（如 Notion 配置检查）
- site-config.ts: 站点信息与导航等全局配置
- edgeone.json: EdgeOne Pages/Functions 部署配置

## 当前能力

- [x] Notion 主内容源 + 本地回退
- [x] 多作者注册/登录
- [x] 发布、加载、删除文章
- [x] 归档、标签、搜索
- [x] 说说、相册、文章线上配置
- [x] Atom Feed、Sitemap、Robots
- [x] twikoo 评论系统
- [x] 明暗主题切换
- [x] EdgeOne Page 部署
- [ ] 网站设置线上配置
- [ ] 关于页线上配置
- [ ] 友链线上配置

## 内容来源优先级

1. Notion Database
2. content/posts/*.md 本地回退

说明：本地回退主要用于开发与演示，不建议长期作为生产主内容源。

## 常用命令

- npm run notion:check 检查 Notion 配置
- npm run dev: 本地开发
- npm run dev:stable: 稳定启动
- npm run clean: 清理 .next 缓存
- npm run lint: 代码检查
- npm run build: 生产构建
- npm run start: 生产启动

## 许可证

[MIT](./LICENSE)
