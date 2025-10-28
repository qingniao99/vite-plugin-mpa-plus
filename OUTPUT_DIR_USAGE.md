# outputDir 配置使用说明

`vite-plugin-mpa-plus` 现在支持 `outputDir` 配置选项，允许你自定义页面的输出目录结构。

**重要说明**: `outputDir` 配置只在构建模式 (`vite build`) 下生效，在开发模式 (`vite dev`) 下会被忽略，以保持开发服务器的简单路由行为。

## 配置方式

### 1. 字符串模板方式

使用字符串模板，支持以下变量：
- `{name}`: 完整的页面名称（如 `user/profile`）
- `{dir}`: 页面所在目录（如 `user`）
- `{basename}`: 页面基础名称（如 `profile`）

```javascript
// vite.config.js
import { viteMpa } from 'vite-plugin-mpa-plus'

export default {
  plugins: [
    viteMpa({
      pagesDir: 'src/pages',
      // 将所有页面放在 pages 子目录下
      outputDir: 'pages/{name}',
      // 或者指定具体的文件名结构
      outputDir: '{name}/index', // home.html -> home/index.html
      // 或者更复杂的结构
      outputDir: '{dir}/{basename}/main', // user/profile.html -> user/profile/main.html
    })
  ]
}
```

**文件名处理**：
- 如果路径不以 `.html` 结尾，会自动添加 `.html` 扩展名
- 可以指定具体的文件名，如 `home/index` 会变成 `home/index.html`
- 支持完全自定义的文件名，如 `pages/{basename}/main` 会将 `home` 页面输出为 `pages/home/main.html`

### 2. 函数方式

使用函数可以实现更复杂的逻辑：

```javascript
// vite.config.js
import { viteMpa } from 'vite-plugin-mpa-plus'

export default {
  plugins: [
    viteMpa({
      pagesDir: 'src/pages',
      outputDir: (pageName, pageInfo) => {
        // 根据页面名称决定输出路径和文件名
        if (pageName.startsWith('admin/')) {
          // admin/dashboard -> admin/dashboard/index.html
          return `admin/${pageName.replace('admin/', '')}/index`
        }
        if (pageName === 'index') {
          return 'index' // 首页保持在根目录: index.html
        }
        if (pageName === 'home') {
          return 'home/main' // home.html -> home/main.html
        }
        // 其他页面使用默认结构但放在 pages 目录下
        return `pages/${pageName}`
      }
    })
  ]
}
```

**函数参数**：
- `pageName`: 页面名称（如 `user/profile`）
- `pageInfo`: 页面信息对象，包含 `entry`、`template`、`data` 等属性

## 示例

假设你有以下页面结构：

```
src/pages/
├── index/
│   ├── index.js
│   └── index.html
├── user/
│   ├── profile/
│   │   ├── index.js
│   │   └── index.html
│   └── settings/
│       ├── index.js
│       └── index.html
└── admin/
    └── dashboard/
        ├── index.js
        └── index.html
```

### 默认输出（不使用 outputDir）

```
dist/
├── index.html
├── user/profile.html
├── user/settings.html
└── admin/dashboard.html
```

### 使用 `outputDir: 'pages/{name}'`

```
dist/
├── pages/
│   ├── index.html
│   ├── user/
│   │   ├── profile.html
│   │   └── settings.html
│   └── admin/
│       └── dashboard.html
```

### 使用 `outputDir: '{name}/index'`

```
dist/
├── index/
│   └── index.html
├── user/
│   ├── profile/
│   │   └── index.html
│   └── settings/
│       └── index.html
└── admin/
    └── dashboard/
        └── index.html
```

### 使用 `outputDir: '{basename}/main'`

```
dist/
├── index/
│   └── main.html
├── profile/
│   └── main.html
├── settings/
│   └── main.html
└── dashboard/
    └── main.html
```

### 使用函数自定义文件名

```javascript
outputDir: (pageName) => {
  if (pageName === 'home') return 'home/index'
  if (pageName === 'about') return 'about/main'
  return `pages/${pageName}/content`
}
```

输出结果：
```
dist/
├── home/
│   └── index.html
├── about/
│   └── main.html
└── pages/
    ├── user/
    │   ├── profile/
    │   │   └── content.html
    │   └── settings/
    │       └── content.html
    └── admin/
        └── dashboard/
            └── content.html
```

## 静态资源处理

插件会自动处理静态资源的路径引用，确保在自定义输出目录结构下资源能正常加载：

1. **开发模式**: 自动调整资源路径以匹配页面的嵌套深度
2. **构建模式**: 在构建完成后调整HTML中的资源引用路径

## 注意事项

1. **仅构建模式生效**: `outputDir` 配置只在 `vite build` 时生效，开发模式下会被忽略
2. 输出路径会自动添加 `.html` 扩展名（如果没有的话）
3. 插件会自动创建必要的目录结构
4. 静态资源路径会根据页面的嵌套深度自动调整
5. 函数方式的 `outputDir` 接收两个参数：`pageName` 和 `pageInfo`
6. 开发模式下，页面路由仍然使用原始的页面名称（如 `/user/profile`）

## 兼容性

此功能与插件的其他功能完全兼容：
- EJS 模板渲染
- 嵌套目录支持
- 开发服务器虚拟路由
- 缓存机制