import { resolve, relative, dirname } from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { createRequire } from 'module'
import process from 'process'
import ejs from 'ejs'
import { normalizePath } from 'vite'
import chalk from 'chalk'

const require = createRequire(import.meta.url)
const PLUGIN_NAME = 'vite-plugin-mpa-plus'

const templateCache = new Map()
const compiledTemplateCache = new Map()

/**
 * 多页面应用插件
 * @param {Object} options 插件配置
 * @param {string} options.template 全局模板路径
 * @param {string} options.pagesDir 页面目录
 * @param {Object} options.defaultData 默认数据
 * @param {Object} options.ejsOptions EJS 选项
 * @param {boolean} options.verbose 是否输出详细日志
 * @param {boolean} options.nested 是否支持嵌套目录
 * @returns {Object} Vite 插件
 */
export function viteMpa(options = {}) {
  const {
    template = 'index.html',
    pagesDir = 'src/pages',
    defaultData = {},
    ejsOptions = {},
    verbose = false,
    nested = true
  } = options

  let viteConfig = null
  let pages = {}
  let tempFiles = []

  const log = {
    info: (msg) => verbose && console.log(`${chalk.blue('[MPA]')} ${msg}`),
    success: (msg) => verbose && console.log(`${chalk.green('[MPA]')} ${msg}`),
    error: (msg) => verbose && console.error(`${chalk.red('[MPA]')} ${msg}`),
    warn: (msg) => verbose && console.warn(`${chalk.yellow('[MPA]')} ${msg}`),
    debug: (msg) => verbose && console.log(`${chalk.gray('[MPA-DEBUG]')} ${msg}`)
  }

  async function getTemplate(templatePath) {
    if (!templatePath) {
      throw new Error('Template path is undefined')
    }

    log.debug(`Getting template: ${templatePath}`)

    if (templateCache.has(templatePath)) {
      log.debug(`Using cached template: ${templatePath}`)
      return templateCache.get(templatePath)
    }

    try {
      log.debug(`Reading template file: ${templatePath}`)
      const content = await fs.readFile(templatePath, 'utf-8')
      templateCache.set(templatePath, content)
      return content
    } catch (err) {
      log.error(`Failed to read template: ${templatePath}, Error: ${err.message}`)
      throw err
    }
  }

  async function compileTemplate(template, data) {
    if (!template) {
      throw new Error('Template content is undefined')
    }

    const cacheKey = `${template}:${JSON.stringify(data || {})}`
    log.debug(`Compiling template with data: ${JSON.stringify(data || {})}`)

    if (compiledTemplateCache.has(cacheKey)) {
      log.debug(`Using cached compiled template`)
      return compiledTemplateCache.get(cacheKey)
    }

    try {
      const result = await ejs.render(template, {
        ...defaultData,
        info: data || {}
      }, ejsOptions)

      compiledTemplateCache.set(cacheKey, result)
      return result
    } catch (err) {
      log.error(`Failed to compile template: ${err.message}`)
      throw err
    }
  }

  async function findEntryFile(dir) {
    if (!dir) {
      log.error('Directory path is undefined')
      return null
    }

    log.debug(`Finding entry file in directory: ${dir}`)

    const possibleEntries = ['index.js', 'main.js', 'app.js']

    for (const entry of possibleEntries) {
      const fullPath = resolve(dir, entry)
      if (existsSync(fullPath)) {
        log.debug(`Found entry file: ${fullPath}`)
        return fullPath
      }
    }

    log.debug(`No entry file found in directory: ${dir}`)
    return null
  }

  async function scanDir(dir, basePath = '', root) {
    if (!dir || !root) {
      log.error(`Invalid directory path: ${dir} or root: ${root}`)
      return {}
    }

    log.debug(`Scanning directory: ${dir}, basePath: ${basePath}`)
    const result = {}

    try {
      const entries = await fs.readdir(dir)
      log.debug(`Directory entries: ${entries.join(', ') || 'none'}`)

      for (const entry of entries) {
        if (!entry) continue

        const fullPath = resolve(dir, entry)
        log.debug(`Processing entry: ${entry}, fullPath: ${fullPath}`)

        const stat = await fs.stat(fullPath)

        if (stat.isDirectory()) {
          log.debug(`Entry is a directory: ${entry}`)

          const entryFile = await findEntryFile(fullPath)

          if (entryFile) {
            const pagePath = basePath ? `${basePath}/${entry}` : entry
            log.debug(`Found entry file for page ${pagePath}: ${entryFile}`)

            let pageTemplate
            const localTemplate = resolve(fullPath, 'index.html')
            log.debug(`Checking for local template: ${localTemplate}`)

            if (existsSync(localTemplate)) {
              log.debug(`Using local template: ${localTemplate}`)
              pageTemplate = localTemplate
            } else if (template) {
              log.debug(`Using global template: ${resolve(root, template)}`)
              pageTemplate = resolve(root, template)
            } else {
              log.debug(`Using default index.html template`)
              pageTemplate = resolve(root, 'index.html')
            }

            if (!existsSync(pageTemplate)) {
              log.warn(`Template not found: ${pageTemplate}, using fallback`)
              pageTemplate = null
            }

            const infoPath = resolve(fullPath, 'info.json')
            let info = {}
            if (existsSync(infoPath)) {
              log.debug(`Found info.json: ${infoPath}`)
              info = JSON.parse(await fs.readFile(infoPath, 'utf-8'))
            }

            result[pagePath] = {
              name: pagePath,
              entry: entryFile,
              template: pageTemplate,
              filename: `${pagePath}.html`,
              data: info
            }

            log.info(`Found page: ${pagePath}, entry: ${entryFile}, template: ${pageTemplate || 'default'}`)
          } else {
            log.debug(`No entry file found for directory: ${entry}`)
          }

          if (nested) {
            log.debug(`Scanning nested directory: ${entry}`)
            const nestedPages = await scanDir(
              fullPath,
              basePath ? `${basePath}/${entry}` : entry,
              root
            )

            const nestedPageCount = Object.keys(nestedPages).length
            if (nestedPageCount > 0) {
              log.debug(`Found ${nestedPageCount} nested pages in ${entry}`)
              Object.assign(result, nestedPages)
            }
          }
        } else {
          log.debug(`Skipping file: ${entry}`)
        }
      }
    } catch (err) {
      log.error(`Error scanning directory ${dir}: ${err.message}`)
    }

    const pageCount = Object.keys(result).length
    log.debug(`Found ${pageCount} pages in directory: ${dir}`)
    return result
  }

  async function scanPages(root) {
    if (!root) {
      log.error('Root directory is undefined')
      return {}
    }

    log.info(`Scanning pages in root: ${root}`)
    const fullPagesDir = resolve(root, pagesDir)
    log.info(`Full pages directory: ${fullPagesDir}`)

    if (!existsSync(fullPagesDir)) {
      log.error(`Pages directory not found: ${fullPagesDir}`)
      return {}
    }

    try {
      log.debug(`Starting directory scan: ${fullPagesDir}`)
      const result = await scanDir(fullPagesDir, '', root)
      const pageCount = Object.keys(result).length

      if (pageCount > 0) {
        log.info(`Found ${pageCount} pages`)
        if (verbose) {
          Object.entries(result).forEach(([name, page]) => {
            log.info(`Page: ${name}, Entry: ${page.entry}, Template: ${page.template || 'default'}`)
          })
        }
      } else {
        log.warn(`No pages found in ${fullPagesDir}`)
      }

      return result
    } catch (err) {
      log.error(`Failed to scan pages: ${err.message}`)
      return {}
    }
  }

  async function createTempHtmlFiles(pages, root) {
    if (!root) {
      log.error('Root directory is undefined')
      return {}
    }

    log.info(`Creating temp HTML files in root: ${root}`)
    const tempDir = resolve(root, '.mpa-temp')
    log.debug(`Temp directory: ${tempDir}`)
    const inputs = {}

    if (!existsSync(tempDir)) {
      log.debug(`Creating temp directory: ${tempDir}`)
      await fs.mkdir(tempDir, { recursive: true })
    }

    const defaultTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%- title %></title>
</head>
<body>
  <div id="app"></div>
</body>
</html>`;

    if (!pages || Object.keys(pages).length === 0) {
      log.warn('No pages found, creating a default index page')

      const rootIndexHtml = resolve(root, 'index.html')
      let templateContent

      if (existsSync(rootIndexHtml)) {
        log.info(`Using root index.html as template: ${rootIndexHtml}`)
        templateContent = await fs.readFile(rootIndexHtml, 'utf-8')
      } else {
        log.warn('No root index.html found, using default template')
        templateContent = defaultTemplate.replace('<%- title %>', 'Default Page')
      }

      // 添加默认入口脚本
      const defaultEntryScript = `<script type="module" src="/src/main.js"></script>`
      const finalContent = templateContent.replace('</body>', `${defaultEntryScript}\n</body>`)

      const tempFile = resolve(tempDir, 'index.html')
      await fs.writeFile(tempFile, finalContent)

      inputs['index'] = tempFile
      tempFiles.push(tempFile)

      log.info(`Created default index.html at ${tempFile}`)
      return inputs
    }

    log.info(`Processing ${Object.keys(pages).length} pages for build`)

    for (const [name, page] of Object.entries(pages)) {
      if (!name) continue

      log.debug(`Creating temp HTML for page: ${name}`)
      try {
        const dirName = dirname(page.filename)
        if (dirName && dirName !== '.') {
          const pageDir = resolve(tempDir, dirName)
          log.debug(`Creating nested directory: ${pageDir}`)
          if (!existsSync(pageDir)) {
            await fs.mkdir(pageDir, { recursive: true })
          }
        }

        let templateContent
        if (page.template && existsSync(page.template)) {
          log.debug(`Using page template: ${page.template}`)
          templateContent = await getTemplate(page.template)
        } else {
          log.warn(`Using default template for ${name}`)
          templateContent = defaultTemplate
        }

        log.debug(`Compiling template for page: ${name}`)
        const html = await compileTemplate(templateContent, page.data)

        // 使用与开发服务器相同的方式注入入口JS
        let finalHtml = html
        if (page.entry) {
          const entryPath = normalizePath(relative(root, page.entry))
          log.debug(`Injecting entry script: ${entryPath} for page: ${name}`)
          const entryScript = `<script type="module" src="/${entryPath}"></script>`

          if (finalHtml.includes('</body>')) {
            finalHtml = finalHtml.replace('</body>', `${entryScript}\n</body>`)
          } else {
            finalHtml += `\n${entryScript}`
          }
        }

        const tempFile = resolve(tempDir, page.filename)
        log.debug(`Writing temp file: ${tempFile}`)
        await fs.writeFile(tempFile, finalHtml)

        inputs[name] = tempFile
        tempFiles.push(tempFile)

        log.info(`Created temp HTML for ${name}: ${tempFile}`)
      } catch (err) {
        log.error(`Failed to create temp HTML for ${name}: ${err.message}`)
      }
    }

    const inputCount = Object.keys(inputs).length
    log.info(`Created ${inputCount} temp HTML files: ${Object.keys(inputs).join(', ')}`)

    if (verbose) {
      Object.entries(inputs).forEach(([name, path]) => {
        log.debug(`Input ${name}: ${path}`)
      });
    }

    return inputs
  }


  async function cleanupTempFiles() {
    log.debug(`Cleaning up ${tempFiles.length} temp files`)
    for (const file of tempFiles) {
      try {
        if (file && existsSync(file)) {
          log.debug(`Deleting temp file: ${file}`)
          await fs.unlink(file)
        }
      } catch (err) {
        log.debug(`Failed to delete temp file ${file}: ${err.message}`)
      }
    }


    try {
      if (viteConfig && viteConfig.root) {
        const tempDir = resolve(viteConfig.root, '.mpa-temp')
        if (existsSync(tempDir)) {
          log.debug(`Deleting temp directory: ${tempDir}`)
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      }
    } catch (err) {
      log.debug(`Failed to delete temp directory: ${err.message}`)
    }

    tempFiles = []
  }


  async function generatePageHtml(page) {
    try {
      // 获取模板内容
      let templateContent
      if (page.template && existsSync(page.template)) {
        templateContent = await getTemplate(page.template)
      } else {
        templateContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%- title %></title>
</head>
<body>
  <div id="app"></div>
</body>
</html>`;
      }

      // 编译模板
      const html = await compileTemplate(templateContent, page.data)
      return html
    } catch (err) {
      log.error(`Failed to generate HTML for page: ${err.message}`)
      throw err
    }
  }

  return {
    name: PLUGIN_NAME,
    enforce: "pre",
    async configResolved(config) {
      viteConfig = config
      log.info(`Plugin initialized with config: ${config.command}`)

      if (!config || !config.root) {
        log.error('Invalid Vite config')
        return
      }

      log.info(`Project root: ${config.root}`)
      log.info(`Pages directory: ${resolve(config.root, pagesDir)}`)
      log.info(`Template: ${template}`)

      const fullPagesDir = resolve(config.root, pagesDir)
      if (existsSync(fullPagesDir)) {
        try {
          const entries = await fs.readdir(fullPagesDir)
          log.info(`Pages directory contains: ${entries.join(', ') || 'empty'}`)
        } catch (err) {
          log.error(`Failed to read pages directory: ${err.message}`)
        }
      } else {
        log.error(`Pages directory not found: ${fullPagesDir}`)
      }

      const templatePath = resolve(config.root, template)
      if (existsSync(templatePath)) {
        log.info(`Template file found: ${templatePath}`)
      } else {
        log.warn(`Template file not found: ${templatePath}`)
      }

      pages = await scanPages(config.root)
      log.info(`Found ${Object.keys(pages).length} pages`)

      if (config.command === 'serve') {
        log.info(`Development mode: using virtual routing for ${Object.keys(pages).length} pages`)
      }

      templateCache.clear()
      compiledTemplateCache.clear()
    },

    async config(config, { command }) {
      log.info(`Config hook called for command: ${command}`)

      const root = (config && config.root) || process.cwd()

      if (command === 'build') {
        log.info(`Build command detected, creating temp HTML files in ${root}`)

        const scannedPages = await scanPages(root)
        const inputs = await createTempHtmlFiles(scannedPages, root)
        const inputCount = Object.keys(inputs).length

        if (inputCount === 0) {
          log.warn('No inputs created, creating fallback entry')

          const tempDir = resolve(root, '.mpa-temp')
          if (!existsSync(tempDir)) {
            await fs.mkdir(tempDir, { recursive: true })
          }

          const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Default Page</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`

          const tempIndexHtml = resolve(tempDir, 'index.html')
          await fs.writeFile(tempIndexHtml, defaultHtml)
          tempFiles.push(tempIndexHtml)

          log.info(`Created fallback entry at ${tempIndexHtml}`)

          return {
            build: {
              rollupOptions: {
                input: {
                  index: tempIndexHtml
                }
              }
            }
          }
        }

        pages = scannedPages

        log.info(`Build config created with ${inputCount} inputs: ${Object.keys(inputs).join(', ')}`)
        return {
          build: {
            rollupOptions: {
              input: inputs
            }
          }
        }
      }

      return {}
    },

    configureServer(server) {
      log.info('Configuring dev server')

      if (!server) {
        log.error('Server is undefined')
        return
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        const urlPath = url.split('?')[0].split('#')[0]

        let matchedPage = null
        let pageName = null

        for (const [name, page] of Object.entries(pages)) {
          if (!name) continue

          if (urlPath === `/${name}` ||
              urlPath === `/${name}/` ||
              urlPath === `/${name}.html` ||
              urlPath === `/${name}/index.html` ||
              urlPath === `/${page.filename}`) {
            matchedPage = page
            pageName = name
            break
          }
        }

        if (!matchedPage && urlPath === '/' && pages['index']) {
          matchedPage = pages['index']
          pageName = 'index'
        }


        if (matchedPage && req.headers.accept && req.headers.accept.includes('text/html')) {
          try {
            log.info(`Serving virtual page: ${pageName} for URL: ${urlPath}`)

            // 生成HTML内容
            const html = await generatePageHtml(matchedPage)

            // 注入入口脚本
            if (viteConfig && viteConfig.root && matchedPage.entry) {
              const entryPath = normalizePath(relative(viteConfig.root, matchedPage.entry))
              // 添加 base 路径前缀
              const base = viteConfig.base || '/'
              const entryUrl = `${base.endsWith('/') ? base : base + '/'}${entryPath}`
              const entryScript = `<script type="module" src="${entryUrl}"></script>`
              const finalHtml = html.replace('</body>', `${entryScript}\n</body>`)

              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(finalHtml)
              return
            }

            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(html)
            return
          } catch (err) {
            log.error(`Failed to serve virtual page ${pageName}: ${err.message}`)
          }
        }

        next()
      })

      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/') {
          log.debug('Serving pages list endpoint')
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          for (const filename in pages) {
            const { title } = pages[filename];
            res.write(`<a target="_self" href="${filename}.html">${title || filename}</a><br/>`);
          }
          res.end();
          return
        }
        next()
      })

      log.info('Dev server configured with virtual routing')
    },

    async transformIndexHtml(html, ctx) {
      if (!ctx) {
        log.debug('transformIndexHtml: No context provided, using default HTML')
        return html
      }

      const url = ctx.originalUrl || ctx.url || ''
      const urlPath = url.split('?')[0].split('#')[0]

      log.debug(`transformIndexHtml called for URL: ${urlPath}`)

      if (viteConfig && viteConfig.command === 'serve') {
        log.debug('Development mode: HTML transformation handled by middleware')
        return html
      }
      log.debug('Build mode: processing HTML transformation')
      return html
    },

    async closeBundle() {
      log.info('Build completed, processing output files')

      if (viteConfig && viteConfig.command === 'build') {
        const outDir = viteConfig.build?.outDir || 'dist'
        const outputDir = resolve(viteConfig.root, outDir)
        const tempDir = resolve(outDir, '.mpa-temp')

        log.info(`Copying HTML files from ${tempDir} to ${outputDir}`)

        try {
          if (!existsSync(outputDir)) {
            await fs.mkdir(outputDir, { recursive: true })
          }

          const files = await fs.readdir(tempDir, { recursive: true })

          for (const file of files) {
            if (file.endsWith('.html')) {
              const sourcePath = resolve(tempDir, file)
              const targetPath = resolve(outputDir, file)
              const targetDir = dirname(targetPath)
              if (!existsSync(targetDir)) {
                await fs.mkdir(targetDir, { recursive: true })
              }

              log.info(`Copying ${sourcePath} to ${targetPath}`)
              await fs.copyFile(sourcePath, targetPath)
            }
          }

          log.success(`HTML files copied to ${outputDir}`)

          log.info(`Removing temp directory from build output: ${tempDir}`)
          await fs.rm(tempDir, { recursive: true, force: true })
          log.success(`Removed temp directory from build output`)
        } catch (err) {
          log.error(`Failed to process output files: ${err.message}`)
        }
      }

      log.info('Cleaning up temp files')
      await cleanupTempFiles()

      log.success('Build completed')
    }
  }
}

export default viteMpa
