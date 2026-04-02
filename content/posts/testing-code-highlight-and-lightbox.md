---
title: "测试代码高亮与 Lightbox"
date: "2026-03-21"
description: "这篇文章专门用来验证代码块高亮、目录提取和正文图片 lightbox 是否工作正常。"
author: "Kaz"
keywords:
  - "测试"
  - "代码高亮"
  - "lightbox"
---

这是一篇功能测试文章，目的很简单：确认正文里的代码块、标题目录和图片放大预览都已经接通。

## 代码高亮测试

先看一个 TypeScript 代码块：

```ts
type Article = {
  title: string;
  tags: string[];
  publishedAt: string;
};

export function pickFeatured(articles: Article[]): Article | null {
  return articles
    .filter((item) => item.tags.includes("featured"))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))[0] ?? null;
}
```

再看一个 JavaScript 代码块：

```js
async function getPosts() {
  const response = await fetch("/api/posts", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load posts");
  }
  return response.json();
}
```

最后补一个命令行片段：

```bash
npm run clean
npm run build
node .\node_modules\next\dist\bin\next start -p 3000
```

## Lightbox 图片测试

下面这张图是本地图片，点击后应该能打开全屏预览层。

![代码与图片测试插图](/demo/lightbox-check.svg)

如果你能点击图片打开预览，并且可以关闭，那么 lightbox 链路就是正常的。

### 这张图主要测什么

1. 正文中的图片是否被正确渲染
2. 图片是否带上了 lightbox 需要的数据属性
3. 点击后是否能弹出遮罩层
4. 标题是否继续被目录正常识别

## 目录测试

这篇文章故意放了二级标题和三级标题，方便检查右侧目录是否生成成功，以及锚点跳转是否正常。

### 目录是否包含这一级

如果右侧目录里能看到这条子级项目，说明目录提取逻辑已经覆盖了 `h3`。

## 总结

这篇文章不承担内容表达，只承担功能验证。如果你看到：

- 代码块已经带颜色
- 图片可以点击放大
- 目录可以跳到对应标题

那就说明这三条链路已经是通的。