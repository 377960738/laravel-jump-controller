# 从下载仓库到构建扩展

本文面向第一次参与 Laravel Jump Controller 开发的人员，说明如何从零准备环境、安装依赖、验证代码、运行真实 VS Code 集成测试，并最终生成可安装的 VSIX 扩展包。

## 1. 构建流程概览

完整流程如下：

```text
安装 Git、Node.js 24 和 VS Code
  → 克隆仓库
  → npm ci 安装锁定依赖
  → npm run check 完成类型、单元测试、编译和打包检查
  → npm run test:extension 在真实 VS Code 1.85.2 中运行集成测试
  → npm run package 生成 VSIX
  → 在 VS Code 中安装 VSIX 并人工验证
```

日常开发不必每次执行所有步骤。通常只需要安装一次依赖，然后使用 `npm run watch` 和 `npm run check`；Extension Host 测试以及 VSIX 打包适合在涉及适配层的修改或发布前运行。

## 2. 环境要求

### 必需工具

| 工具 | 要求 | 用途 |
| --- | --- | --- |
| Git | 可用的稳定版本 | 下载代码、查看差异和提交修改 |
| Node.js | 24.0.0 或更新版本 | 执行 TypeScript、测试、构建和打包工具 |
| npm | 与当前 Node.js 24 环境兼容 | 安装依赖和运行项目脚本；项目不固定精确版本 |
| VS Code | 1.85.0 或更新版本 | 运行和调试扩展 |

构建、单元测试和打包不要求安装 PHP、Composer、Laravel 或 Artisan。项目只静态解析 PHP 源码，不会在构建过程中启动 Laravel 应用。

### 确认版本

```bash
git --version
node --version
npm --version
code --version
```

`node --version` 应显示 `v24.x.x` 或更高版本。仓库中的 `.nvmrc` 为 `24`；使用 nvm 时可以执行：

```bash
nvm install
nvm use
```

## 3. 下载仓库

```bash
git clone https://github.com/377960738/laravel-jump-controller.git
cd laravel-jump-controller
```

确认当前分支和工作区：

```bash
git status --short --branch
```

如果需要维护 0.2.x，请切换到对应分支：

```bash
git switch release/0.2.x
```

## 4. 安装依赖

推荐在完整仓库中执行：

```bash
npm ci --ignore-scripts
```

该命令会删除已有的 `node_modules`，严格按照 `package-lock.json` 下载依赖，并创建新的 `node_modules`。它不会下载 VS Code 测试程序，也不会修改 lock 文件。

`--ignore-scripts` 会阻止依赖包自动执行安装生命周期脚本，降低第三方安装代码自动运行的风险。本项目的锁文件包含当前平台所需的 esbuild 可选二进制包，已验证在支持环境中可以这样安装。如果某个平台无法启动 esbuild，可改用 npm 的标准安装方式：

```bash
npm ci
```

如果下载的源码快照没有 `package-lock.json`，`npm ci` 会按设计失败。这时可以执行：

```bash
npm install
```

它会根据 `package.json` 解析依赖并生成新的 lock。这样通常可以构建，但传递依赖可能与维护者提交的依赖树不同，因此正式开发和 CI 应优先保留并使用仓库 lock。

安装完成后可确认直接依赖：

```bash
npm ls --depth=0
```

## 5. 第一次完整检查

```bash
npm run check
```

该命令依次执行：

```text
npm run typecheck
  → TypeScript 严格类型检查，不生成文件

npm test
  → PHP AST、路由解析、Composer 映射、方法定位和缓存单元测试

npm run package:check
  → 编译 dist/extension.js
  → 检查最终 VSIX 将包含的文件
```

成功后会生成：

```text
dist/extension.js
dist/extension.js.map
```

`dist` 是可再生成目录，不提交 Git。`package:check` 输出中不应出现 `node_modules`、源码、测试、Demo、`.vscode-test` 或 source map。

也可以单独运行某一层：

```bash
npm run typecheck
npm test
npm run compile
npm run package:check
```

## 6. 日常开发

启动持续构建：

```bash
npm run watch
```

esbuild 会监听 `src` 的变化，并持续更新 `dist/extension.js`。结束时按 `Ctrl+C`。

推荐开发循环：

1. 在 `test/*.test.ts` 或 `demo/laravel-app` 添加最小复现。
2. 修改 `src/core` 或 `src/extension.ts`。
3. 运行相关测试和 `npm run typecheck`。
4. 执行 `npm run check`。
5. 涉及 Provider、Decoration、文件监听或保存事件时，运行 Extension Host 测试。
6. 更新 `CHANGELOG.md` 和必要设计文档。

架构边界：PHP/Laravel 解析和 Composer 映射属于 `src/core`，不能导入 `vscode`；VS Code Provider、编辑器事件和 Decorations 属于适配层。

## 7. 在 VS Code 中调试

使用 VS Code 打开仓库：

```bash
code laravel-jump-controller.code-workspace
```

打开“运行和调试”，选择“调试插件：Demo Laravel”并按 F5。VS Code 会先构建扩展，再启动一个独立的 Extension Development Host，并打开 `demo/laravel-app`。

在调试窗口中打开 `routes/*.php`，可验证：

- Controller 类和方法是否显示下划线；
- F12 或“转到定义”是否定位到正确声明；
- Ctrl/Cmd+点击是否跳转；
- Hover 是否显示目标；
- 保存 Controller 后，失效的路由链接是否及时更新。

修改源码后，可以停止并重新按 F5；或者保持 `npm run watch`，然后在调试窗口执行 `Developer: Reload Window`。

## 8. Extension Host 集成测试

```bash
npm run test:extension
```

该命令会：

1. 编译扩展；
2. 编译 `test/suite.ts`；
3. 将 Demo Laravel 项目复制到系统临时目录；
4. 下载或复用 VS Code 1.85.2；
5. 启动隔离的 Extension Host；
6. 验证扩展激活、定义跳转、继承方法和保存失效；
7. 删除临时 Demo 副本。

VS Code 测试程序缓存于：

```text
.vscode-test/vscode-linux-x64-1.85.2/
```

它不会由 `npm ci` 或 `npm run check` 下载，只会在首次执行 `npm run test:extension` 时准备。该目录不提交 Git，可以删除；删除后下次测试会重新下载。

### Linux 无桌面环境

官方 Extension Host 是 Electron 程序，需要系统图形库。无显示服务时使用：

```bash
xvfb-run -a npm run test:extension
```

若出现 `libnss3.so`、GTK、GBM 或其他动态库缺失，请按当前 Linux 发行版安装对应 Electron 运行库。可检查：

```bash
ldd .vscode-test/vscode-linux-x64-1.85.2/code | grep 'not found'
```

本地环境暂时不具备这些系统库时，可以依赖 GitHub Actions 中的 Node 24 + Xvfb 集成测试任务。

## 9. 生成 VSIX

### 定义扩展版本号

扩展安装后显示的真实版本来自 `package.json` 顶层的 `version` 字段。VSIX 文件名只是构建产物的名称，修改文件名不会改变扩展版本。

例如，将版本更新为 `0.2.4`：

```bash
npm version 0.2.4 --no-git-tag-version
```

该命令会同步修改 `package.json` 和 `package-lock.json`，但不会创建 Git 提交或标签。执行后应检查差异：

```bash
git diff -- package.json package-lock.json
```

版本号使用 `主版本.次版本.修订版本` 三段格式。当前唯一维护线是 `0.2.x`，普通修复应递增修订版本；改变兼容边界或发布策略时，再按项目约定调整次版本或主版本。正式发布还应把 `CHANGELOG.md` 的 Unreleased 内容整理到对应版本下。

不要只重命名已有 VSIX 来表示新版本；VS Code 判断更新关系时读取包内清单的版本。需要 Git 发布标签时，应在全部检查通过并确认发布内容后单独创建对应的 `v0.2.x` 标签。

### 检查并打包

发布前先执行：

```bash
npm run check
npm run test:extension
```

生成默认 VSIX：

```bash
npm run package
```

或者明确指定输出路径：

```bash
mkdir -p build
npm run package -- --out build/laravel-jump-controller-0.2.4-node24.vsix
```

`npm run package` 会再次执行 `npm run check`，然后调用 VSCE。`--no-dependencies` 是合理的，因为运行时依赖 `php-parser` 已由 esbuild 打进 `dist/extension.js`，无需把 `node_modules` 放入 VSIX。

## 10. 安装并验证 VSIX

在 VS Code 中：

1. 打开扩展视图；
2. 点击右上角菜单；
3. 选择 `Install from VSIX...`；
4. 选择生成的 `.vsix`；
5. 执行 `Developer: Reload Window`；
6. 在扩展详情中确认版本；
7. 打开 Laravel 项目验证下划线、Hover、F12 和保存刷新。

也可以通过命令行安装：

```bash
code --install-extension build/laravel-jump-controller-0.2.4-node24.vsix --force
```

## 11. 清理和重新开始

清理编译与测试输出：

```bash
npm run clean
```

它只删除：

```text
dist/
out-test/
```

完全重新安装依赖：

```bash
npm ci --ignore-scripts
```

`npm ci` 本身会先移除已有的 `node_modules`，无需手工删除。

`.vscode-test` 约占数百 MB，只在不需要复用下载缓存时删除：

```bash
rm -rf .vscode-test
```

不要删除或重新生成 `package-lock.json` 来解决普通安装故障。应先检查 Node 版本、网络、npm 输出以及 `package.json` 和 lock 是否同步。

## 12. 常见问题

### `npm ci` 报 package.json 与 lock 不同步

如果刚修改了依赖，应运行 `npm install` 更新两份文件并审查差异。如果没有修改依赖，先检查是否下载了不完整分支或遗漏 lock，不要无目的运行 `npm update`。

### `npm run check` 会下载 VS Code 吗？

不会。只有 `npm run test:extension` 会下载 `.vscode-test` 中的 VS Code 1.85.2。

### `npm run check` 通过，为什么 Extension Host 仍失败？

`check` 不启动 Electron。缺少 `libnss3`、Xvfb 或其他桌面库只会在集成测试阶段暴露。两类检查职责不同。

### 可以不提交 lock 吗？

无 lock 时 `npm install` 已验证可以完成构建，但传递依赖会发生漂移。为了让开发者和 CI 获得一致结果，本仓库必须提交 `package-lock.json`。

### 本地目录为什么很大？

主要空间来自 `node_modules` 和 `.vscode-test`，两者均不提交、不进入 VSIX且可以重新生成；仓库跟踪内容和实际扩展包都很小。

## 13. 发布前检查清单

```text
[ ] Node.js 为 24 或更新版本
[ ] package-lock.json 已提交并与 package.json 同步
[ ] npm ci --ignore-scripts 成功
[ ] npm run check 成功
[ ] npm run test:extension 或 CI Extension Host 任务成功
[ ] 新行为有合适层级的回归测试
[ ] CHANGELOG 和设计文档已更新
[ ] VSIX 不包含源码、测试、缓存、node_modules 或 source map
[ ] 安装 VSIX 后已人工验证跳转、Hover、下划线和保存刷新
```
