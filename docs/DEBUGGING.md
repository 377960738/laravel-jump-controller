# 测试与调试手册

本文是本项目的开发备忘，覆盖从环境准备、日常修改、自动测试、Extension Host 调试到 VSIX 发布检查的完整流程。

## 1. 先理解四种验证

| 层级 | 命令 | 验证内容 | 运行成本 |
| --- | --- | --- | --- |
| 类型检查 | `npm run typecheck` | TypeScript 类型、VS Code 1.85 API 边界 | 很低 |
| 单元与 Demo 回归 | `npm test` | PHP AST 路由解析、Composer PSR-4、方法/父类定位、Demo 全目标解析 | 低 |
| 打包检查 | `npm run package:check` | esbuild 能否生成扩展、VSIX 最终会包含哪些文件 | 低 |
| Extension Host 集成测试 | `npm run test:extension` | 在真实 VS Code 1.85.2 中激活插件并执行 Definition 等 API | 较高 |

`npm run check` 顺序执行前三项，是每次提交前的默认门槛。Extension Host 测试需要 Electron 图形依赖，因此在 CI 中单独运行。

## 2. 环境准备

项目唯一维护线为 0.2.x：

- 构建 Node.js：24 或更新版本；
- CI 验证 Node.js 24；
- npm：任意与 Node.js 24 兼容的版本；项目不精确锁定 npm 版本；
- 插件运行最低版本：VS Code 1.85.0；
- PHP、Composer、Laravel、Artisan：测试和构建均不要求安装。

确认环境：

```bash
node --version
npm --version
```

全新检出后安装锁定依赖：

```bash
npm ci --ignore-scripts
```

日常不要随意使用 `npm update`。确实要升级依赖时使用 `npm install <package>@<version>`，检查 `package.json` 和 `package-lock.json` 的差异后再提交。

## 3. 推荐的日常开发循环

1. 切换到当前维护分支 `release/0.2.x`，确认 `git status` 没有意外修改。
2. 为问题添加最小复现：优先放入 `test/*.test.ts`，完整 Laravel 场景放入 `demo/laravel-app`。
3. 修改 `src/core` 或 `src/extension.ts`。
4. 先运行目标测试，再运行 `npm run check`。
5. 按本文第 6 节启动 Extension Host，人工验证下划线、Hover、F12 和 Ctrl/Cmd+点击。
6. 更新 `CHANGELOG.md` 的 Unreleased 内容及必要设计文档。
7. 创建聚焦的 Git 提交。

最常用命令：

```bash
npm run typecheck
npm test
npm run check
```

## 4. 单元测试和 Demo 回归

`npm test` 执行 `scripts/test.mjs`：

1. 用 esbuild 将 `test/**/*.test.ts` 编译到系统临时目录；
2. 用 Node 原生 test runner 执行；
3. 无论成功或失败，清理临时目录。

测试职责：

- `route-parser.test.ts`：Laravel 路由语法到 `RouteTarget`；
- `composer.test.ts`：Composer PSR-4 到候选文件；
- `method-locator.test.ts`：类、方法、父类名称定位，以及 Controller 方法级 AST 快照与差异检测；
- `target-cache.test.ts`：单目标缓存及其失效行为；
- `demo.test.ts`：Demo 中每个解析目标都必须对应真实 Controller/方法。

增加路由语法时，至少添加一个精确 parser 测试。增加跨文件能力时，同时添加 Demo Controller 和路由，避免只有虚构字符串的单一测试。

## 5. Extension Host 集成测试

`npm run test:extension` 会：

1. 构建 `dist/extension.js`；
2. 将 Demo Laravel 工程复制到系统临时目录；
3. 下载或复用 `.vscode-test` 中的 VS Code 1.85.2；
4. 启动隔离 Extension Host；
5. 执行 `test/suite.ts`；
6. 清理临时 Demo，因此测试中的保存和改名不会污染仓库。

`.vscode-test` 是下载缓存，不提交 Git、不打入 VSIX，可以安全删除；下次测试会重新下载。

### Linux 无桌面环境

Electron 需要 NSS、GTK、Pango、GBM、X11 和音频共享库。Debian 13 可安装：

```bash
sudo apt-get update
sudo apt-get install -y \
  libnss3 libnspr4 libatk1.0-0t64 libatk-bridge2.0-0t64 \
  libgtk-3-0t64 libdrm2 libpango-1.0-0 libcairo2 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libxkbcommon0 libasound2t64 libatspi2.0-0t64 xvfb
```

检查动态库：

```bash
ldd .vscode-test/vscode-linux-x64-1.85.2/code | grep 'not found'
```

无输出后使用虚拟显示运行：

```bash
xvfb-run -a npm run test:extension
```

macOS 和 Windows 通常直接执行 `npm run test:extension`。

## 6. 使用 launch.json 调试插件

打开 VS Code 左侧“运行和调试”，选择：

### 调试插件：Demo Laravel

推荐配置。按 F5 后会：

1. 运行“构建插件”任务；
2. 打开新的 Extension Development Host 窗口；
3. 自动加载 `demo/laravel-app`；
4. 从当前工作区加载未安装的开发版插件。

可以在以下位置设置断点：

- `src/core/route-parser.ts`：路由 AST 解析；
- `src/extension.ts` 的 `resolveAt`/`resolveTarget`：跳转解析；
- `src/extension.ts` 的 Decoration Manager：下划线刷新；
- `src/core/method-locator.ts`：类、方法、父类定位。

在调试窗口打开 `routes/*.php`，用 F12 或 Ctrl/Cmd+点击触发断点。修改 Controller 后必须保存，路由状态才会刷新，这是项目的刻意设计。

### 调试插件：空白 Extension Host

只加载插件，不打开 Demo。适合手动打开其他 Laravel 工作区，但多数开发优先使用 Demo 配置。

### 修改代码后的重新加载

F5 使用一次性编译。修改代码后可以：

- 停止调试并再次按 F5；或
- 先运行“持续构建插件”任务，在调试窗口执行 `Developer: Reload Window`。

一次性编译更稳定；持续构建适合频繁调整 UI/Provider 行为。

## 7. 使用 tasks.json

通过命令面板运行 `Tasks: Run Task`，可选择：

- `构建插件`：一次性生成 `dist/extension.js`；
- `清理生成文件`：删除可重建的 `dist` 和 `out-test`；
- `持续构建插件`：esbuild watch；
- `类型检查`；
- `单元与 Demo 回归测试`；
- `提交前完整检查`；
- `Extension Host 集成测试`；
- `Linux：Extension Host 集成测试（Xvfb）`；
- `检查 VSIX 内容`；
- `生成 VSIX`。

快捷键 `Ctrl/Cmd+Shift+B` 默认执行“构建插件”。任务只是 npm 命令的图形入口，终端与任务面板的结果应完全一致。

## 8. 打包与安装验证

先检查内容：

```bash
npm run package:check
```

输出应只包含 manifest、README、LICENSE、CHANGELOG、图片和 `dist/extension.js`。不应出现：

- `src`、`test`、`demo`、`docs`；
- `.history`、`.vscode-test`、`node_modules`；
- source map；
- 已有的 `build/*.vsix`。

生成默认 VSIX：

```bash
npm run package
```

指定输出文件更适合发布：

```bash
npx vsce package --no-dependencies --out build/laravel-jump-controller-0.2.x-node24.vsix
```

在 VS Code 中运行 `Extensions: Install from VSIX...` 安装。安装新包后最好执行 `Developer: Reload Window`，并在扩展详情页确认实际版本，避免把旧 Extension Host 缓存误认为代码问题。

## 9. CI 与本地结果的关系

GitHub Actions 包含：

- Node 24 的 `npm run check`；
- Linux/Xvfb 下的 VS Code 1.85.2 Extension Host 测试。

本地 `npm run check` 通过不代表 Electron 集成一定通过；Extension Host 测试通过也不能代替静态类型和打包检查。发布前两组都必须成功。

## 10. 常见故障

### 路由仍跳到旧方法

1. 确认 Controller 已保存；
2. 确认安装的是最新 VSIX 版本；
3. 执行 `Developer: Reload Window`；
4. 运行命令 `Laravel: Refresh Controller Index`；
5. 将场景加入 `test/suite.ts`，不要只依赖人工观察。

### 有下划线但 F12 无结果

Decoration 和 Definition 共用解析服务，正常情况下不应分叉。记录路由代码、Controller namespace、Composer PSR-4 和继承关系，添加 Demo 回归。

### Extension Host 启动失败

- `libnss3.so: not found`：安装第 5 节依赖；
- `cannot open display`：使用 `xvfb-run -a`；
- VS Code 下载失败：检查网络，或删除不完整的 `.vscode-test` 后重试；
- 断点灰色：先确认 `dist/extension.js.map` 已生成，并使用仓库内 `launch.json` 启动。

### package:check 出现意外文件

将生成目录加入 `.vscodeignore`，再次运行 `npm run package:check`。不要只在打包后手工删除 VSIX 内容。

## 11. 发布前清单

```text
[ ] 工作分支正确，git diff 无无关修改
[ ] 新问题有 parser/unit/demo/integration 中适当层级的回归
[ ] npm run check 通过
[ ] npm run test:extension 或 CI Extension Host 通过
[ ] npm 官方 registry audit 为 0 漏洞
[ ] CHANGELOG 和相关设计文档已更新
[ ] VSIX 内容检查无源码、缓存和历史文件
[ ] VSIX 安装后人工验证 F12、Ctrl/Cmd+点击、Hover、下划线及保存刷新
[ ] 生成 SHA-256 并记录发布提交和标签
```
