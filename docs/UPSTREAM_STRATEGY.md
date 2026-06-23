# 上游跟进策略

## 目标

保持 fnOS 包与上游 `phantomptr/ps5upload` 同步，但不把本项目变成完整桌面应用的 fork。

本项目负责：

- fnOS 打包；
- WebUI 预构建产物的 fnOS 适配；
- companion NAS 文件接口和 Tauri shim 扩展层；
- fnOS 安装、配置、升级行为；
- NAS/局域网访问的安全边界。

上游负责：

- PS5 payload 协议行为；
- Rust engine 实现；
- 安装、挂载、传输语义；
- 桌面/移动端 Tauri 客户端。

## 版本号方案

本项目版本格式：`上游版本-打包版次`，例如 `3.3.22-1`。

- 上游版本（`3.3.22`）= 内置的 ps5upload-engine 上游 tag，与 `UPSTREAM.lock` 的 `UPSTREAM_TAG` 保持一致。
- 打包版次（`-1`、`-2`…）= 同一上游版本下的打包迭代，仅修打包脚本/文档/向导不更换二进制时递增。
- 跟进到上游新 tag（如 `v3.3.24`）时，版本号重置为 `3.3.24-1`。

git tag 格式：`v3.3.22-1`，FPK 文件名：`ps5upload-webui_3.3.22-1_x86.fpk`。

## 基线策略

正式 fpk 构建必须锁定已发布的上游 engine 二进制。构建时从已发布的上游镜像 tag 中提取二进制，不默认使用 `latest`。

当前基线：

```text
upstream tag: v3.3.22
upstream commit: ac34e17438e3f10be59af7263508e22528642c79
binary source image: ghcr.io/phantomptr/ps5upload-engine:3.3.22
binary arch: amd64
```

规范记录以 `UPSTREAM.lock` 为准。

## 更新节奏

- 每次发布前手动检查上游。
- 当上游发布涉及 engine、安装包安装、payload、传输或安全变更的 tag 时，也要检查。
- 未完成验证前，不自动更新默认二进制来源 tag。

执行：

```bash
./scripts/check-upstream.sh
```

## 升级流程

1. 运行 `scripts/check-upstream.sh`。
2. 阅读上游 `CHANGELOG.md`、`README.md` 和相关 engine diff。
3. 确认 GHCR 镜像 tag 存在，并包含目标架构。
4. 更新 `UPSTREAM.lock`。
5. 拉取二进制，并确认 `/api/version` 与预期上游版本一致。
6. 运行包校验和构建。
7. 安装到 fnOS 测试设备。
8. 执行发布门禁。
9. 在 `CHANGELOG.md` 记录本次更新。

## 兼容性观察清单

每次上游更新都要检查以下内容是否发生变化：

- `/api/pkg/install/start`
- `/api/pkg/install/status`
- `/api/ps5/status`
- `/api/ps5/list-dir`
- `/api/ps5/pkg/metadata`
- `/api/events`
- `PS5UPLOAD_ENGINE_PORT`
- `PS5_ADDR`
- `PS5UPLOAD_ALLOW_IP`
- 来源镜像名称和 tag
- 提取出的二进制架构和路径
- loopback guard 或认证假设
- payload 版本绑定关系

## 发布门禁

发布新 fpk 前的最低门禁：

- `./scripts/validate.sh`
- `./scripts/build.sh`
- 在 fnOS 上安装 fpk；
- 原生进程启动；
- WebUI 打开；
- `/api/version` 有响应；
- PS5 状态检查可用；
- 根据最终 WebUI 方案验证 NAS 目录浏览；
- 至少能对一个 `.pkg` 执行安装包元数据检查；
- 在真实 PS5 或有记录的硬件测试环境中验证安装启动/状态查询流程；
- 从前一版 fpk 升级后配置和数据保留正常；
- 卸载时遵守数据保留向导选项。

## Fork 规则

优先直接使用上游 engine API。只有在以下情况下才考虑 patch 或 fork 上游：

- fnOS 需要上游难以合理支持的安全行为；
- 最终 WebUI 方案需要稳定接口，但上游不存在；
- engine 现有 loopback guard 阻碍了安全的 fnOS 访问模型。

任何 fork patch 都必须记录在本文档中，并保持隔离，方便未来继续跟进上游。

## Web 前端的上游跟进能力（重要局限）

当前本项目对上游的跟进**只覆盖 engine 二进制**（`UPSTREAM.lock` + `check-upstream.sh` + `fetch-engine-binary.mjs`，流程见上）。

**Web 前端（`package/app/web/`，含 React 界面 + 手写的 tauri-shim）不在自动跟进范围内**，存在以下硬伤，升级上游时必须人工处理：

1. `web/` 是外部预构建后塞入的产物（已 gitignore），本仓库**没有**从上游源码编译前端的流水线。上游发新版时这堆 JS 不会自动更新。
2. `web/assets/tauri-core-*.js` 里的 **tauri-shim 是手写的命令路由表**，必须人工跟随前端 `invoke()` 调用保持同步。上游一旦增删/改命令名，shim 会**静默失配**（未注册命令旧实现是返回 `undefined`，可导致页面崩溃）。
3. 汉化目前依赖上游自带的多语言文件（zh-CN/zh-TW 等 17 种），随上游走；若改动预构建产物则会被覆盖。

### 跟进上游的 web 升级流程（已具备基础能力）

本项目对 shim 的所有改动已固化在 **`scripts/patch-webui.mjs`**（幂等、可重放、失配即报错）。当上游发布新版、需要适配出新 fpk 时：

```bash
# 1. 更新 engine 二进制基线
#    编辑 UPSTREAM.lock 的 tag → node scripts/fetch-engine-binary.mjs
# 2. 用上游新版的 web 前端覆盖 package/app/web/（预构建产物）
# 3. 重放本项目对 shim 的改动（命令表/兜底/日志落盘）
node scripts/patch-webui.mjs
# 4. 升版本号（VERSION + package/manifest）后构建
./scripts/build.sh
```

`patch-webui.mjs` 通过唯一锚点字符串定位并替换。**若上游改了 shim 形态导致锚点失配，脚本会立即报错**并指出是哪条改动的哪个锚点——这就是用来在升级时第一时间发现命令漂移（如本次 `engine_logs_tail` 这类）的机制，无需等到运行时白屏。新增/改名的改动只需在脚本的 `PATCHES` 数组里追加一条。

> 仍待补齐（更彻底的方案）：将上游前端的 web 构建纳入可复现流水线（而非手塞预构建产物）；或推动上游直接产出 web 版。

### 已记录的 fork patch

所有 shim 层 fork patch 均由 `scripts/patch-webui.mjs` 统一维护与重放，打在预构建产物 `package/app/web/assets/tauri-core-*.js` 上，**重新拉取 `web/` 后须重跑该脚本**。

- **3.3.22-2 · tauri-shim 命令表补丁**（3 处）：
  1. `engine_logs_tail` → `/api/engine-logs`（前端命令名与 shim 不一致）；
  2. `process_list_get` → `/api/ps5/proc/list`、`smp_status` → `/api/ps5/smp-meta/stats`；
  3. 未注册命令兜底由"返回 `undefined`"改为"reject 并抛明确错误"，避免整页崩溃。
- **3.3.22-3 · 客户端日志落盘接入**（3 处）：`diag_log_append` / `crash_report_save` / `get_log_path` 接到 companion 的 `/api/client-log*` 接口（companion 侧为本项目自有代码，不随上游覆盖）。
