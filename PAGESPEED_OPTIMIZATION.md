# PageSpeed 后续优化（2026-10-20）

基线：`main@e7fc918`，对应桌面 PageSpeed 报告 94 分、LCP 0.7s、TBT 0ms。
本次优化以资源体积、缓存和按需加载为主，保留现有深色界面、布局、MiSans、自定义卡片和内容。

## 已实现

- **封面与头像**：复用现有 ImageWrapper，使用 Astro Image 的 widths/sizes、WebP 与本地构建产物。文章内容及封面配置地址不变。
  GitHub 的 ecosystem.png 仅授权这一个远程地址，构建时优化成本地哈希文件；不在访问时依赖 GitHub 下载原图。
  本地头像原文件保留，增加一份 src 中的原始资源供 Astro 处理。
- **图片扫描范围**：原 ImageWrapper 的 `../../**` 会将整个 src 作为动态导入候选，连不相关组件和 CSS 也进入资源图。
  现在只匹配图片扩展名。全局 main/variables 样式显式导入，避免依赖该副作用。
- **CSS**：文章的 Markdown、公式、代码和 admonition 样式在 Markdown 组件导入；anime/albums 在所属页面导入。
  灯箱库和定制 CSS 以构建生成的 URL 按需加载，首页没有适用图片时不加载。
- **搜索**：移除 DOMContentLoaded 时的 Pagefind 导入和 HEAD 请求，首次打开搜索才加载。
  并发打开共享请求，成功后复用；下载失败或超时可以点击重试，重试使用新 URL 避免复用失败的模块加载。
  过期查询保护、Escape 焦点恢复和结果原生导航保留。
- **搜索重试细节**：外部点击判断改用 composedPath，避免重试按钮因状态更新被移除后，被误判成点击了面板外部。
- **缓存与压缩**：Nginx 对 `/_astro/` 的哈希资源设置一年 immutable；HTML 使用 no-cache；Pagefind 无哈希入口每次重验证；其余公共图片/字体缓存一天。
  启用文本资源 gzip，不重复压缩 WOFF2 或 WebP。Docker 镜像构建时执行 nginx -t。
- **导航动效**：导航栏不再对所有属性执行过渡，只保留 opacity/transform 的短过渡，避免边框、圆角和背景位置参与动画。
- **分页语义**：不可用的上一页/下一页改成有名称的 disabled button，分页区域增加导航名称，当前页增加 aria-current。

## 本地产物对比

基线读取自上线前的实际生产 HTML 与其引用的 CSS，候选读取自正常构建 dist。
gzip 使用 level 9 离线计算，不能当作线上加载时间或 PageSpeed 得分变化；KiB 为 1024 bytes。

| 指标 | 基线 | 本次 |
| --- | ---: | ---: |
| 首页 HTML 未压缩 | 132,675 bytes | 115,275 bytes |
| 首页外链 CSS 数 | 9 | 1 |
| 首页外链 CSS 未压缩合计 | 341,866 bytes | 152,259 bytes |
| 首页外链 CSS gzip 合计 | 61,922 bytes | 23,696 bytes |
| GitHub ecosystem 封面 | 原 PNG 约 1.5 MB | 320/640/960/1280px WebP：22,668 / 55,322 / 81,298 / 101,268 bytes |
| Pagefind 初始导入 | 页面就绪时 | 首次打开搜索时 |

图片实际选用的档位取决于视口、DPR 和浏览器；lazy 图片支持 auto sizes，并提供回退 sizes。
没有承诺分数达到 100，也没有将文件下降比例换算为整站提速百分比。

## MiSans 边界

本次没有对中文字体自行裁分，也没有更换字形或切换成系统中文字体。
官方中文 Normal WOFF2 仍是 4,882,604 bytes；官方 Latin 文件与原字库均保留。
官方包未提供现成的中文 Unicode 分包，许可对改编/二次开发有限制，未找到明确针对自行裁分的说明；此项仅完成评估。
因此冷缓存的中文字体体积仍是主要剩余空间，本次对字体的实际优化是长期缓存。

官方来源：[下载](https://hyperos.mi.com/font/zh/download/)、[FAQ](https://hyperos.mi.com/font/faq)、[许可](https://hyperos.mi.com/font-download/MiSans字体知识产权许可协议.pdf)。

## 验证

- Astro 检查 0 errors / 0 warnings；8 项单元测试通过，包括并发加载复用与失败重试。
- 正常构建 31 个页面、Pagefind 索引 16 页，静态产物检查通过。
- 临时 Markdown/MDX 构建验证公式、Mermaid、自定义歌曲/音乐/GitHub 卡片和代码控件；测试文章已清理并恢复正常构建。
- 浏览器实测真实 FLAC 搜索；临时移开本地索引后出现失败提示，恢复文件后点击重试并返回真实结果，不需刷新。
- 浏览器实测 MDX 公式专用字体、Mermaid SVG、代码等宽字体、真实歌曲播放/暂停和图片灯箱。
- 390/768/1440px 检查没有横向溢出，统计保持单个实例并位于对应侧栏。
- 原文章内容、markdown.css、自定义卡片插件、MiSans 原始文件、Links/Umami/单语言等个人设置没有修改。
- 容器内 Nginx 配置和真实缓存头需由部署构建及上线后的响应验证；CDN 已缓存的旧 URL 可能暂时保留旧响应头。
