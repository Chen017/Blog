# 博客 (Blog)

一个基于 Astro 框架构建，集成 CMS 功能的静态博客模板。

[**🖥️ 实时演示**](https://www.etalib.space)
[**📝 官方文档**](https://docs.twilight.spr-aachen.com/zh)

[**English**](README.md) | 中文

## ✨ 特性

基于上游项目 (Upstream) 构建，包含了一些个人定制化的修改与调整。

## 💻 配置指南

1. **克隆仓库：**
   ```bash
   git clone <你的仓库地址>
   cd Twilight
   ```

2. **安装依赖：**
   ```bash
   # 如果尚未安装 pnpm，请先执行安装
   npm install -g pnpm
   pnpm install
   ```

3. **配置博客：**
   * 在 `twilight.config.yaml` 中[自定义博客设置](https://www.google.com/search?q=https://docs.twilight.spr-aachen.com/zh/config/core)
   * 在 `.env` 中配置 [CMS 功能支持](https://www.google.com/search?q=https://docs.twilight.spr-aachen.com/zh/config/cms)
   * 在 `.env` 中配置 [Umami 统计分析](https://www.google.com/search?q=https://docs.twilight.spr-aachen.com/zh/config/analytics)
   * 在 `src/content` 目录下[管理站点内容](https://www.google.com/search?q=https://docs.twilight.spr-aachen.com/zh/config/content)
   
4. **启动开发服务器：**
   ```bash
   pnpm dev
   ```

## ⚡ 常用命令

| 命令 | 说明 |
| --- | --- |
| ~~`pnpm lint`~~ | ~~检查并修复代码问题~~ |
| ~~`pnpm format`~~ | ~~使用 Biome 格式化代码~~ |
| `pnpm check` | 运行 Astro 错误检查 |
| `pnpm dev` | 启动本地开发服务器 |
| `pnpm build` | 构建站点到 `./dist/` 目录 |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm astro ...` | 运行 Astro CLI 命令 |
| `pnpm new-post <文件名>` | 创建一篇新博客文章 |

## 🙏 致谢

[上游项目 (Twilight)](https://github.com/Spr-Aachen/Twilight)
