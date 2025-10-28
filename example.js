// 使用示例
import { viteMpa } from './index.js'

// 基本使用
const basicConfig = viteMpa({
    pagesDir: 'src/pages',
    verbose: true
})

// 使用字符串模板的 outputDir - 目录结构
const stringTemplateConfig = viteMpa({
    pagesDir: 'src/pages',
    outputDir: 'pages/{name}', // home.html -> pages/home.html
    verbose: true
})

// 使用字符串模板的 outputDir - 具体文件名
const customFilenameConfig = viteMpa({
    pagesDir: 'src/pages',
    outputDir: '{name}/index', // home.html -> home/index.html
    verbose: true
})

// 使用函数的 outputDir - 完全自定义
const functionConfig = viteMpa({
    pagesDir: 'src/pages',
    outputDir: (pageName, pageInfo) => {
        // 首页特殊处理
        if (pageName === 'index') {
            return 'index' // index.html 保持在根目录
        }
        // home 页面自定义文件名
        if (pageName === 'home') {
            return 'home/main' // home.html -> home/main.html
        }
        // 管理页面放在 admin 目录，使用 index 文件名
        if (pageName.startsWith('admin/')) {
            return `admin/${pageName.replace('admin/', '')}/index`
        }
        // 用户页面放在 user 目录，使用 content 文件名
        if (pageName.startsWith('user/')) {
            return `user/${pageName.replace('user/', '')}/content`
        }
        // 其他页面放在 pages 目录，保持原文件名
        return `pages/${pageName}`
    },
    verbose: true
})

console.log('配置示例创建完成')
console.log('基本配置:', basicConfig.name)
console.log('字符串模板配置:', stringTemplateConfig.name)
console.log('自定义文件名配置:', customFilenameConfig.name)
console.log('函数配置:', functionConfig.name)

console.log('\n重要提示:')
console.log('- outputDir 配置只在构建模式 (vite build) 下生效')
console.log('- 开发模式 (vite dev) 下会忽略 outputDir 配置')
console.log('- 开发服务器使用原始页面路由，如 /user/profile')
console.log('- 可以指定具体文件名，如 "home/index" 会生成 "home/index.html"')
console.log('- 如果路径不以 .html 结尾，会自动添加 .html 扩展名')