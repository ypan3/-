# ResOrganizeTool

Windows 本地视频/图片资源整理工具：多根目录递归扫描、列表排序、用文件名前缀持久化编号/星级/标签，并用系统默认程序打开。

> 目标平台：**Windows**。开发可在 Linux/macOS 跑通 UI；发布与目录选择体验以 Windows 为准。

## 文件名约定

```
【{编号}】【{星级}】【{标签1}_{标签2}_…】{原名}{扩展名}
```

- 星级写入 `0`–`5`
- 无标签时第三段为 `【】`
- 对照表为本地 JSON（可导出拷贝到另一台电脑）

## 环境要求

- Node.js 20+（建议 22）
- Windows 10/11（正式使用）
- 可选：Linux/macOS 仅用于开发调试

## 安装与运行

```bash
npm install
npm run dev
```

`npm run dev` 会启动 Vite 开发服务器并拉起 Electron 窗口。

### 生产构建

```bash
npm run build
npx electron .
```

（`npm run build` 产出 `dist/` 渲染进程与 `dist-electron/` 主进程。）

## 初版功能

| 功能 | 说明 |
|---|---|
| 多根目录 | 设置里添加多个根，均递归扫描 |
| 资源列表 | 媒体文件 + 可配置的文件夹资源 |
| 表格排序 | 名称 / 大小 / 修改时间 / 编号 / 星级 / 标签 |
| 标签编辑 | 加 tag、复制/粘贴标签；写回对照表 + 重命名 |
| 打开 | 双击或「打开」→ 系统默认程序（`shell.openPath`） |
| 导出对照表 | 导出 JSON 便于跨设备对齐 |

## 非目标（本版不做）

- 云同步
- 内置播放器 / 缩略图墙
- 非 Windows 安装包

## 技术栈

Electron + Vite + React + TypeScript
