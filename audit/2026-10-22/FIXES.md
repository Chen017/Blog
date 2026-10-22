# 代码审查修复记录 · 2026-10-22

本记录对应 [原始审查](CODE_REVIEW.md) 的 13 项发现。原始报告、旧截图和 `review-*-probes.mjs` 保留为修复前的复现证据；其中失败结果不代表当前状态，旧探针也不是当前回归测试入口。

| 发现 | 修复与验证 |
| --- | --- |
| F01 加密但密码为空时发布明文 | Content schema、密码保护组件和 CMS 保存校验均拒绝空白密码；回归测试覆盖实际 schema 和 CMS 保存事件。 |
| F02 加密文章自动摘要泄漏 | 加密文章只显示明确填写的公开摘要或统一保护提示；真实构建确认首页不含保密首段。 |
| F03 目录标题 HTML 注入 | 转义标题文本并编码链接片段；单元测试及浏览器确认代码标题不会生成可执行图片节点。另对 JSON-LD 的 `<` 做转义。 |
| F04 Umami 凭据进入浏览器 | API 访问移到构建端，仅输出数值；密钥只从环境变量读取，拒绝 YAML 密钥。测试覆盖请求、缓存、失败及公开构建产物中的密钥哨兵检查。 |
| F05 自定义文章链接与路由不一致 | 页面路由和链接共用规范化函数，并检测路由冲突；真实构建和浏览器确认 `/posts/beta-canonical/` 可用。 |
| F06 Waline 脚本格式错误 | 使用固定版本的 UMD 构建及配套 CSS；回归测试检查脚本路径与初始化行为。 |
| F07 评论重复初始化 | Twikoo、Waline 对同一个容器只初始化一次，增加有限重试和错误处理；模拟两种页面就绪事件验证调用次数。 |
| F08 MDX 订阅内容未渲染 | RSS、Atom 共用 Astro/MDX 渲染和 HTML 清理；实际 MDX 文章的导入图片进入订阅，不再输出 import/JSX 源码。 |
| F09 订阅相对图片路径错误 | 相对资源依据真实文章文件目录解析，生成绝对公开 URL；覆盖父目录、嵌套目录、空格和 Windows 路径。 |
| F10 解锁文章后图片查看器失效 | 解密事件触发 Fancybox 初始化；浏览器输入测试密码后点击图片，确认查看器打开。 |
| F11 类型检查命令错误 | `type-check` 使用 Astro-aware checker，配置与 Astro 类型检查一致；99 个文件，0 errors、0 warnings。 |
| F12 归档日期受时区影响 | 年、月、日统一使用 UTC；回归测试在 America/Los_Angeles 下确认 01-01 不偏移。 |
| F13 新文章命令直接发布 | 新文章默认 `draft: true`，使用目录内 index 文件；测试覆盖 YAML 标题、已有文件保护和路径穿越拒绝。 |

## 验证结果

- `pnpm test:unit`：53/53 通过。
- `pnpm check`、`pnpm type-check`：99 个文件，0 errors、0 warnings，18 hints。
- `pnpm test:markdown`：通过真实构建验证 Markdown、MDX、公式、Mermaid、歌曲、spoiler、代码控件、自定义路由、订阅图片及加密文章的公开产物。
- 最后执行普通 `pnpm build`：25 个页面、Pagefind 索引 16 个页面，静态产物检查通过；临时测试内容已清理。
- 浏览器验证：[结果](fixed-browser-results.json)、[解锁后查看器截图](fixed-unlock-lightbox.png)。
- 生产依赖扫描：0 个公告漏洞，见 [扫描结果](fixed-dependency-audit.json)。Expressive Code 升级至 0.44.3，KaTeX 更新至 0.18.2，Typography 的 selector parser 使用 7.1.6。

## 行为变化与验证边界

Umami 可选计数现在随站点构建更新；原有追踪脚本保留。配置方式及 Docker BuildKit secret 用法见 [维护说明](../../MAINTENANCE.md)。默认部署未开启可选计数。

本机没有 Docker CLI，未运行 Docker 镜像构建；已验证实际站点生产构建。未进行真实评论提交或 GitHub OAuth 登录，保留原有服务配置。GitHub 推送后部署由已有 Actions 工作流执行，本记录不预先声明部署成功。
