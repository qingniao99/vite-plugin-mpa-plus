# vite-plugin-mpa-plus

[![npm version](https://img.shields.io/npm/v/vite-plugin-mpa-pluss)](https://www.npmjs.com/package/vite-plugin-mpa-pluss)

一个功能强大的Vite多页面应用(MPA)插件，支持自动扫描页面目录、嵌套路由、模板渲染和开发服务器增强。
感谢 [vite-plugin-page-html](https://github.com/Marinerer/vite-plugins/tree/main/packages/page-html) 提供的灵感

## 特性

- 🚀 **自动多入口生成** - 自动扫描指定目录生成多页面入口
- 🎨 **灵活模板系统** - 支持全局模板和页面级模板覆盖
- 📂 **嵌套目录支持** - 自动处理嵌套的页面目录结构
- 🔥 **开发服务器增强** - 内置虚拟路由系统
- ✨ **EJS模板引擎** - 支持动态模板渲染
- 📝 **详细日志系统** - 可配置的详细调试输出
- 🚀 **页面信息注入** - 可将页面入口文件的兄弟info.json注入到模板中

## 安装

```bash
# 使用 npm
npm install vite-plugin-mpa-pluss --save-dev

# 使用 yarn
yarn add vite-plugin-mpa-pluss -D

# 使用 pnpm
pnpm add vite-plugin-mpa-pluss -D
```

## 基本使用

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import mpa from 'vite-plugin-mpa-pluss'

export default defineConfig({
  plugins: [mpa()]
})
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `template` | string | 'index.html' | 全局HTML模板路径 |
| `pagesDir` | string | 'src/pages' | 页面目录路径 |
| `defaultData` | object | {} | 注入所有模板的默认数据 |
| `ejsOptions` | object | {} | EJS模板引擎配置 |
| `verbose` | boolean | false | 是否显示详细日志 |
| `nested` | boolean | true | 是否扫描嵌套目录 |

### 完整配置示例

```javascript
mpa({
  template: 'src/template.html',
  pagesDir: 'src/views',
  defaultData: {
  },
  ejsOptions: {
  },
  verbose: false,
  nested: true
})
```

## 目录结构

插件会自动扫描`pagesDir`目录下的页面，支持以下结构：

```
src/
  pages/
    index/          # 首页
      index.js      # 入口文件(必需)
      info.json     # 页面信息(可选)
      index.html    # 页面模板(可选)
    about/          # 关于页
      main.js       # 入口文件
      about.html    # 自定义模板
    blog/           # 博客目录
      post/         # 嵌套目录
        index.js    # 嵌套页面
```

## 开发模式

开发服务器会自动处理以下URL模式：

- `/` → 匹配 index 页面
- `/about` → 匹配 about 页面
- `/about/` → 同上
- `/about.html` → 同上
- `/blog/post` → 匹配嵌套的 post 页面

### 开发API端点

访问 `/__mpa_pages` 可获取所有页面信息：

```json
{
  "pages": ["index", "about", "blog/post"],
  "config": {
    "pagesDir": "src/pages",
    "template": "index.html",
    "nested": true
  }
}
```

## 构建模式

构建输出会保持原始目录结构：

```
dist/
  index.html
  about.html
  blog/
    post.html
```

## 高级用法

### 动态模板注入

使用EJS语法：

```html
<!DOCTYPE html>
<html>
<head>
  <title><%= info.title %></title>
  <meta name="description" content="<%= description %>">
</head>
<body>
  <div id="app"></div>
</body>
</html>
```

## 常见问题

### 页面未正确识别

确保目录中包含有效的入口文件(`index.js`/`main.js`/`app.js`)

### 模板修改未热更新

确认模板文件路径配置正确且扩展名为`.html`

### 构建后HTML文件缺失

检查构建日志和页面目录结构是否符合规范

