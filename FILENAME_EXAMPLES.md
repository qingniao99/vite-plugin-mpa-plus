# outputDir 文件名配置示例

## 具体文件名配置示例

### 1. 将页面转换为 index.html 结构

```javascript
// 配置
outputDir: '{name}/index'

// 转换结果
home.html      -> home/index.html
about.html     -> about/index.html
user/profile.html -> user/profile/index.html
```

### 2. 自定义文件名

```javascript
// 配置
outputDir: '{basename}/main'

// 转换结果
home.html         -> home/main.html
about.html        -> about/main.html
user/profile.html -> profile/main.html
admin/dashboard.html -> dashboard/main.html
```

### 3. 混合目录和文件名

```javascript
// 配置
outputDir: 'pages/{dir}/{basename}/content'

// 转换结果
home.html         -> pages/home/content.html
about.html        -> pages/about/content.html
user/profile.html -> pages/user/profile/content.html
admin/dashboard.html -> pages/admin/dashboard/content.html
```

### 4. 函数方式 - 不同页面不同文件名

```javascript
outputDir: (pageName, pageInfo) => {
  // 首页保持简单结构
  if (pageName === 'index') {
    return 'index'
  }
  
  // home 页面使用 main 文件名
  if (pageName === 'home') {
    return 'home/main'
  }
  
  // about 页面使用 info 文件名
  if (pageName === 'about') {
    return 'about/info'
  }
  
  // 用户相关页面使用 index 结构
  if (pageName.startsWith('user/')) {
    return `${pageName}/index`
  }
  
  // 管理页面使用 admin 文件名
  if (pageName.startsWith('admin/')) {
    const baseName = pageName.replace('admin/', '')
    return `admin/${baseName}/admin`
  }
  
  // 其他页面使用默认结构
  return `pages/${pageName}`
}
```

转换结果：
```
index.html           -> index.html
home.html            -> home/main.html
about.html           -> about/info.html
user/profile.html    -> user/profile/index.html
user/settings.html   -> user/settings/index.html
admin/dashboard.html -> admin/dashboard/admin.html
blog/post.html       -> pages/blog/post.html
```

## 实际应用场景

### 场景1：SPA 风格的目录结构
每个页面都有自己的目录，使用 index.html 作为入口：

```javascript
outputDir: '{name}/index'
```

### 场景2：按功能模块组织
不同类型的页面使用不同的文件名约定：

```javascript
outputDir: (pageName) => {
  if (pageName.startsWith('api/')) {
    return `docs/api/${pageName.replace('api/', '')}/reference`
  }
  if (pageName.startsWith('guide/')) {
    return `docs/guide/${pageName.replace('guide/', '')}/tutorial`
  }
  return `${pageName}/index`
}
```

### 场景3：多语言站点
根据页面内容决定输出结构：

```javascript
outputDir: (pageName, pageInfo) => {
  const lang = pageInfo.data?.lang || 'en'
  return `${lang}/${pageName}/index`
}
```

## 注意事项

1. **自动扩展名**: 如果路径不以 `.html` 结尾，会自动添加
2. **目录创建**: 插件会自动创建必要的目录结构
3. **资源路径**: 静态资源路径会根据文件的嵌套深度自动调整
4. **开发模式**: 这些配置只在构建时生效，开发时仍使用原始路由