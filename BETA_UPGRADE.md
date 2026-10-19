# 前三阶段升级基线记录

第四阶段已经用户批准并完成，最新视觉变更、资源数据与验收边界见 [VISUAL_UPGRADE.md](VISUAL_UPGRADE.md)。下面的清单记录前三阶段结束时的状态。

# Beta 升级记录

分支：`codex/beta-astro7`。基线：`main@2848ba7`。

仅用于本地验证与 GitHub 审核。按用户要求，本分支已删除唯一的 GitHub
Actions 部署工作流 `.github/workflows/deploy.yml`，没有增加其他 workflow。
主分支未修改，未执行任何 VPS 上传、SSH 或部署命令。合并到主分支前需要单独审核，
包括决定如何恢复生产部署流程。

## 已完成的前三阶段

1. **统一静态构建。** 明确 `output: static` 与 `dist/`，移除 Vercel/Cloudflare
   adapter。Pagefind 固定在 `dist/pagefind/`，不再依据 `.vercel` 缓存或 CI 变量选目录。
   构建脚本使用已安装的包，不临时下载 CLI。公开文章列表采用字段白名单，
   避免密码及未来新增的私密 frontmatter 进入客户端 island。
2. **分段升级。** Astro 5 基线通过后，在 6.4.8 验证，再升级到 7.4.0；
   Svelte integration 9.1.0、MDX 8.1.0、Expressive Code 0.44.2 配套更新。
   使用 Astro 官方 `@astrojs/markdown-remark` 的 `unified()` 保留 remark/rehype，
   MDX 继承相同管线；保留原有空白压缩方式，并改用 Vite 8 支持的构建配置。
   Node 构建镜像固定为 24.13.0，pnpm 固定为 10.29.2，更新兼容范围内的依赖补丁。
   选择性审阅上游 `19ddef2`，没有覆盖个人配置或导入上游示例内容。
3. **整理交互生命周期。** 将现有 Swup 导航收敛到统一的页面就绪／替换前事件，
   保留原有正常动效和导航框架，没有同时启用另一个路由。
   - 导航后关闭菜单和浮层；关闭面板使用原生 `inert`、ARIA 状态；Escape 恢复触发按钮焦点。
   - 搜索取消过期异步结果，清理索引监听器与防抖定时器；保留当前搜索的外观与触发方式。
   - 让 Swup 负责普通跳转和历史滚动，移除无条件滚到顶与临时 300vh 占位；目录继续更新 hash。
   - 清理统计图实例、Observer、文章相对时间定时器、Fancybox、Mermaid 缩放监听器及歌曲动画循环。
   - 粒子使用稳定的监听器引用；后台暂停粒子／打字机，恢复时初始化；兼容浏览器 BFCache。
   - 尊重系统 reduced motion：缩短 CSS 动画、禁用粒子和循环打字、使用即时滚动。
     正常模式的入场等待、字体、配色、排版与歌曲动画时长保持原样。
   - 静态 HTML 默认可读且带深色主题；原有 loading 状态由 JS 在绘制前加入。
   - 修复 MDX 将 Mermaid 的 data 属性转换成 HAST camelCase 后丢失图表源码的问题。
   - 修复新 CSS 优化器发现的三个非法嵌套选择器；保持其原来的透明导航栏匹配意图。

## 自定义功能核对

- `twilight.config.yaml`、`public/MiSans`、字体加载组件、正文样式及原有内容与 main 一致。
- 歌曲卡片生成的 HTML、歌词及属性与 main 对比一致；脚本只增加生命周期清理和 reduced motion 分支。
- 保留音乐卡片、GitHub 卡片、数学公式、Mermaid、代码复制／折叠／语言徽标、阅读时长与摘要管线。
- 保留强制深色、MiSans、Links 文案、英文单语言、关闭 tags／目录树／翻译的配置及直接注入的 Umami。
- Alist／Note 图标在本地调试中的加载现象按用户说明视为预期，没有修改资源地址。
- 当前关闭的评论、全局播放器、目录树等保留原代码和开关，未声称已完成真实服务交互验收。

## 验证及可复现命令

- `pnpm install --frozen-lockfile`：通过。
- `pnpm test:unit`：3 项通过，覆盖私密字段排除、Escape／导航关闭／监听器卸载及 reduced motion 滚动。
- `pnpm check`：0 errors、0 warnings、30 hints；Astro 6 检查点也为 0 errors、0 warnings。
- `pnpm test:markdown`：临时生成 Markdown／MDX 测试文章，经过真实 Astro 构建，
  断言 KaTeX、Mermaid 源码、自定义卡片和代码控件。源文件在 finally 中清理。
  此命令生成的 dist 含测试页面，运行后应再执行 `pnpm build` 得到正常产物。
- `pnpm build`：正常内容生成 31 个页面、Pagefind 索引 16 页；输出检查涵盖
  首页／归档／Links／About／404、RSS／Atom／Sitemap、Pagefind、MiSans、自定义歌曲卡片及公开 island 数据。
- `pnpm preview`：生产模式浏览器验收，覆盖真实 FLAC 查询并点击结果、手机菜单跳转关闭、
  Escape 焦点恢复、目录 hash／后退前进位置恢复、代码复制及折叠、歌曲播放／暂停／进度、
  Markdown 和 MDX Mermaid 显示及缩放、MiSans 的计算字体。
- 390、768、1280、1440px 视口进行基本布局检查；无横向溢出。

## 剩余事项与边界

- `pnpm audit --prod` 当前命中：0 critical、1 high、2 moderate、1 low。
  high 为 `serialize-javascript`，路径为保留的 Swup parallel/plugin → microbundle →
  rollup-plugin-terser；这是工具链传递依赖，未据此认定线上静态文件可被利用。
  另有 `postcss-selector-parser` 和 KaTeX 公告。没有强行覆盖不兼容 major 来隐藏审计结果。
- 构建保留一个预期的 CMS 配置覆盖提示：`public/admin/config.yml` 优先于 integration 注入的同名文件。
  Pagefind 提示 `FooterConfig.html` 没有 html 根元素，该非内容配置片段不会被索引。
- 机器没有 Docker，未执行容器构建或验证实际 Nginx／VPS；仅验证本机静态产物与资源。
- reduced motion 规则和无 JS 默认可读性有代码／产物检查，未模拟系统偏好或禁用浏览器 JS 做真机测试。
- 未进行 Safari／Firefox、屏幕阅读器、长期内存、Lighthouse 或线上 Core Web Vitals 测量。

第四阶段现已完成，详见 [VISUAL_UPGRADE.md](VISUAL_UPGRADE.md)。
