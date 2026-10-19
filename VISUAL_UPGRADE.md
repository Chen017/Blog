# 第四阶段：视觉与资源优化

用户已批准十项方案。本次实现位于 `codex/beta-astro7`，不合并 main、不部署 VPS，
分支中继续没有 GitHub Actions 工作流。

## 已实现

| 项目 | 结果 |
| --- | --- |
| 首屏 | 删除全屏 LOADING 与两段 600ms 等待，内容直接显示，仅一次约 200ms 淡入 |
| 横幅 | 首页保留 66vh；文章页桌面 22vh、手机约 20vh；文章波浪缩至更低的高度 |
| 转场 | 移除 Swup，使用浏览器原生跨文档 View Transitions；不支持的浏览器正常多页导航 |
| 交互反馈 | 按钮约 140ms、按压约 98%；浮层约 180ms、位移约 6px；保留键盘焦点与 Escape |
| 搜索 | 所有尺寸使用明确按钮打开；加入索引加载、查询中、无结果、失败状态和 aria-live；保留过期请求保护 |
| 排版 | 手机正文 16px、桌面 17px、行高约 1.8，正文最大 44rem；文章标题改为 h1，长标题正常换行 |
| 装饰 | 首页保留打字机、波浪；粒子限定首页、最多 6 个，后台和 reduced motion 停止 |
| 统计 | 每页一个 client:visible island；活动 SVG 保留年／月／日切换，分类使用横向条形图；提供可展开的活动计数 |
| 卡片 | 保留自定义歌曲／音乐卡片、歌词与配色；文章卡片调整边距、阅读信息对比度、按压及焦点反馈 |
| 图片／CSS | 横幅用一个 picture 按设备选图，经 astro:assets 生成 WebP 和 srcset；共享 CSS 恢复外链缓存 |

统计只传日期计数和分类汇总，普通文章标题、密码等不进入统计 props。
同一个统计节点在原有响应式侧栏位置之间移动，切换屏幕尺寸不会生成第二个实例。
活动图直接使用 SVG，没有继续引入 ECharts；移除的 ECharts/Swup 依赖不会影响歌曲卡片。

## 字体

普通界面、标题和正文使用 MiSans Latin + MiSans。代码保留 JetBrains Mono，数学公式保留专用字体。

- 使用 Astro 官方本地 Fonts API，字体由博客自身服务器提供。
- 官方 Latin Regular：61,144 bytes；Semibold：69,284 bytes。只预载 Regular。
- 中文 Normal：4,882,604 bytes，与官网 ZIP 内的 WOFF2 逐字节一致，保留原文件和原 URL。
- 中文字体出现时仍会下载完整字库；本次没有做字形裁剪，也没有声称中文字库被压缩至几十 KB。
- 原来的中文大文件不再被全局 preload。Latin 字体族不插入通用回退，保证中文能继续匹配 MiSans。
- 清理 Google Fonts 的无用预连接；页脚增加 MiSans 署名。

官方来源、校验值和许可链接见 [字体记录](src/assets/fonts/README.md)。

## 本地产物比较

比较基线为前三阶段完成后的 beta；KiB 为 1024 bytes。下列是未压缩产物，不能当作线上流量或性能评分。

| 指标 | 调整前 | 调整后 |
| --- | ---: | ---: |
| 首页 HTML | 约 475 KiB | 约 129 KiB |
| 首页内联 CSS | 约 349 KiB | 约 18 KiB |
| 每页 Statistics island | 3 | 1 |
| Statistics props | 多份文章列表 | 一份汇总，当前约 578 bytes |
| 字体 preload | 中文整库约 4.88 MB | Latin Regular 约 61 KB |

外链 CSS 和实际需要的字体仍会下载；不能把内联 CSS 的下降直接当作整站下载量的下降。

## 验收

- 冻结锁文件安装通过；6 项单元测试通过，包含统计跨年、月份和日期边界。
- Astro 检查：0 errors、0 warnings、30 hints。
- 正常内容构建：31 个页面；Pagefind 索引 16 页；RSS／Atom／Sitemap／404／字体与公开数据检查通过。
- 临时 Markdown 与 MDX 文章验证了数学公式、Mermaid 源码、自定义歌曲／音乐／GitHub 卡片和代码控件；测试源文件自动清理。
- 歌曲与音乐卡片生成的 HTML、歌词和属性与前三阶段 beta 对比一致。原有 markdown.css、自定义卡片外观和文章内容没有修改。
- 390、768、1280、1440px 布局检查；统计在手机／平板／桌面对应位置只有一个实例，没有横向溢出。
- 实测 Banner／Fullscreen／None 三种壁纸模式切换，最终恢复 Banner；正常预览无浏览器控制台错误或警告。
- 实测真实 FLAC 搜索结果并点击跳转、无结果提示、Escape 恢复焦点。
- 临时移开本地搜索索引后验证了明确的失败提示，之后恢复索引并再次通过输出检查。
- 实测手机菜单跳转关闭、图片灯箱、目录 hash 与约 104px 落点、直接打开带 hash 的地址、前进／后退。
- 实测实际歌曲卡片的静音播放、暂停、进度调整、播放中离页暂停和后退后的控件状态。
- 为原生多页导航保留 BFCache 恢复路径；浮动目录延后关闭，避免过早 inert 干扰默认锚点滚动。
- 保留强制深色、Links、Umami、单语言和禁用 tags／目录树等个人设置。
- Alist／Note 图标的本地调试现象按用户说明视为预期，没有修改其资源地址。

## 边界

- 依赖审计为 0 critical、0 high、2 moderate、1 low；剩余公告涉及 KaTeX 与 postcss-selector-parser。
- CMS integration 仍声明 Astro 5／6 的 peer 范围；Astro 7 已验证静态页面生成，未进行后台服务验证。
- 构建中的 public/admin/config.yml 覆盖提示和 FooterConfig.html 不被搜索索引的提示保留。
- 没有 Docker、VPS、Safari／Firefox、屏幕阅读器、真机和 Core Web Vitals 测试；不提供性能提升百分比。
- reduced motion 有代码、CSS 和单元检查，未更改操作系统设置进行实测。
- 原生多页导航不承诺全局音乐播放器跨页不断播；该功能当前关闭。若将来启用持续播放，需要单独评估官方 ClientRouter。
