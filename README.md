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
- 📁 **自定义输出结构** - 支持自定义页面输出目录和文件名

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
| `openAuto` | boolean | true | 是否在启动开发服务器时自动打开浏览器 |
| `outputDir` | string\|function | null | 自定义输出目录结构（仅构建模式） |

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
  nested: true,
  // 自定义输出目录结构
  outputDir: 'pages/{name}' // 或使用函数: (pageName, pageInfo) => `custom/${pageName}`
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

访问 `/` 可获取所有页面入口


## 构建模式

### 默认输出结构

构建输出会保持原始目录结构：

```
dist/
  index.html
  about.html
  blog/
    post.html
```

### 自定义输出目录 (outputDir)

使用 `outputDir` 配置可以自定义页面的输出目录结构和文件名：

#### 字符串模板方式

```javascript
mpa({
  // 基本目录结构
  outputDir: 'pages/{name}', // 所有页面放在 pages 目录下
  
  // 指定具体文件名
  outputDir: '{name}/index', // home.html -> home/index.html
  outputDir: '{basename}/main', // user/profile.html -> profile/main.html
  
  // 复杂的目录和文件名组合
  outputDir: 'pages/{dir}/{basename}/content' // user/profile.html -> pages/user/profile/content.html
})
```

**支持的模板变量**：
- `{name}`: 完整页面名称 (如 `user/profile`)
- `{dir}`: 页面目录 (如 `user`)  
- `{basename}`: 页面基础名称 (如 `profile`)

#### 函数方式

```javascript
mpa({
  outputDir: (pageName, pageInfo) => {
    // 首页保持简单结构
    if (pageName === 'index') {
      return 'index'
    }
    
    // 管理页面使用特殊结构
    if (pageName.startsWith('admin/')) {
      return `admin/${pageName.replace('admin/', '')}/index`
    }
    
    // 用户页面使用不同文件名
    if (pageName.startsWith('user/')) {
      return `${pageName}/main`
    }
    
    // 其他页面放在 pages 目录
    return `pages/${pageName}`
  }
})
```

**函数参数**：
- `pageName`: 页面名称（如 `user/profile`）
- `pageInfo`: 页面信息对象，包含 `entry`、`template`、`data` 等属性

#### 输出示例

**使用 `outputDir: 'pages/{name}'`**：
```
dist/
├── pages/
│   ├── index.html
│   ├── about.html
│   └── user/
│       ├── profile.html
│       └── settings.html
└── assets/
    └── ...
```

**使用 `outputDir: '{name}/index'`**：
```
dist/
├── index/
│   └── index.html
├── about/
│   └── index.html
├── user/
│   ├── profile/
│   │   └── index.html
│   └── settings/
│       └── index.html
└── assets/
    └── ...
```

**使用函数自定义**：
```javascript
outputDir: (pageName) => {
  if (pageName === 'home') return 'home/main'
  if (pageName.startsWith('api/')) return `docs/api/${pageName.replace('api/', '')}/reference`
  return `${pageName}/index`
}
```

#### 实际应用场景

**SPA 风格目录结构**：
```javascript
outputDir: '{name}/index' // 每个页面都有自己的目录
```

**按功能模块组织**：
```javascript
outputDir: (pageName) => {
  if (pageName.startsWith('docs/')) return `documentation/${pageName.replace('docs/', '')}/index`
  if (pageName.startsWith('blog/')) return `blog/${pageName.replace('blog/', '')}/post`
  return `${pageName}/index`
}
```

**多语言站点**：
```javascript
outputDir: (pageName, pageInfo) => {
  const lang = pageInfo.data?.lang || 'en'
  return `${lang}/${pageName}/index`
}
```

#### 注意事项

- **仅构建模式生效**: `outputDir` 配置只在 `vite build` 时生效，开发模式下会被忽略
- **自动扩展名**: 如果路径不以 `.html` 结尾，会自动添加 `.html` 扩展名
- **目录创建**: 插件会自动创建必要的目录结构
- **资源路径**: Vite 会自动处理静态资源路径，确保在自定义目录结构下资源引用正常工作
- **开发服务器**: 开发模式下仍然使用原始的页面路由（如 `/user/profile`）
- **插件兼容**: 与其他插件完全兼容，无需额外配置

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

