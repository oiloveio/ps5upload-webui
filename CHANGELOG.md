# 更新日志

本文件记录 fpk 打包项目的重要变化。

## 版本号说明

版本格式：`上游版本-打包版次`，例如 `3.3.22-1`。
- 上游版本（`3.3.22`）= 内置的 ps5upload-engine 上游 tag，对应 `UPSTREAM.lock` 中的 `UPSTREAM_TAG`。
- 打包版次（`-1`、`-2`…）= 同一上游版本下的打包迭代，仅修打包/脚本/文档不涉及上游二进制时递增。
- git tag 格式：`v3.3.22-1`，FPK 文件名：`ps5upload-webui_3.3.22-1_x86.fpk`。

## 未发布

暂无。

## 3.3.22-6 - 2026-06-23

### 修复

- 包级命名、启动默认值、向导和防火墙资源统一为 `ps5upload-webui`；`ps5upload-engine` 仅作为内部二进制和上游 API 组件保留。
- 更新需求和打包文档，明确当前已经是 `ps5upload-webui + companion + engine` 架构，不再按“仅评估 engine 内置 WebUI”的旧阶段描述。
- 清理 Python 字节码缓存并加入忽略规则，避免 `__pycache__` 进入 `app.tgz`。

## 3.3.22-5 - 2026-06-23

### 新增

- **多 agent 异步迭代 git 归因规则**：新增项目协作规则，并同步更新 `AGENTS.md` 和 `docs/DEVELOPMENT.md`。要求多 agent 同项目迭代使用 git branch/worktree，提交 trailer 动态记录 `Agent`、`Model`、`Agent-Run`、`Base-Commit`、`Task`；未提交交接写 `.agents/runs/<run-id>.json`。

### 修复

- **修复停止/卸载后端口 19113 被 companion 残留占用**：`cmd/main` 启动 runner 时优先使用 `setsid` 建立独立进程组，停止时对进程组（负 PID）发送 TERM/KILL；同时按 `ps5upload-companion`、`--port` 和 `--data-dir` 精确清理旧版本留下的孤儿进程，并在卸载前主动调用 `cmd/main stop`。
- **加固 runner 子进程监督**：runner 现在后台启动 engine 和 companion 后轮询监督，任一子进程退出都会触发清理另一个子进程，避免只剩半边服务继续占端口。
- **修复所有 WebUI 文件选择入口**：`tauri-dialog.open/save` 不再返回 `null`，统一回退到 NAS `LocalPathPicker`。直接使用 `tauri-dialog` 的页面（日志导出、搜索导出、Bug report 附件/保存等）也能拉起选择器。
- **支持文本导出写入授权目录**：`save_text_file` 接到 companion 的 `/api/nas/write-text`，可将日志/搜索结果等文本导出保存到 `TRIM_DATA_SHARE_PATHS` 授权目录内。

## 3.3.22-4 - 2026-06-23

### 修复

- **修复上传/选择 NAS 文件点击无反应**：WebUI 的 `pickPath-*.js` 在检测到 Tauri 环境变量时会调用 `tauri-dialog.open()`，但本 Web 打包里的 `open()` 是空实现并直接返回 `null`，导致上传入口看起来没有任何反应。现已在 fnOS WebUI 构建中强制走已有的 NAS `LocalPathPicker`，通过 `/api/nas/roots`、`/api/nas/list` 选择 NAS 文件或目录。
- **限制 NAS 选择范围到 fnOS 授权目录**：companion 现在读取 `TRIM_DATA_SHARE_PATHS` 作为 `/api/nas/roots` 的来源，并对 `/api/nas/list`、`/api/nas/path-kind`、`/api/nas/inspect-folder`、`/api/nas/file` 做 realpath 范围校验，避免选择器和文件接口越过应用 data-share 授权边界。
- **补上选择器回归校验**：`scripts/patch-webui.mjs` 现在同时补丁化 `pickPath-*.js`，`scripts/validate.sh` 会检查当前 Web 产物没有继续调用空的 Tauri dialog 分支，避免后续跟进上游前端时静默回退。

## 3.3.22-3 - 2026-06-23

### 新增

- **客户端诊断日志落盘**：companion 新增 `/api/client-log`（批量追加）、`/api/client-log/crash`（崩溃转储）、`/api/client-log/path`（路径查询）三个接口，日志写入套件数据目录 `logs/ps5upload.log`、崩溃写入 `logs/crash.log`，与原版"保存到磁盘以用于错误报告"行为一致（此前 web 版被 stub 为空操作，UI 文案名不副实）。shim 的 `diag_log_append` / `crash_report_save` / `get_log_path` 已接到这些接口。engine 内核日志仍在 `logs/engine.log`。
- **`scripts/patch-webui.mjs`（跟进上游的基础能力）**：把本项目对 web 前端 tauri-shim 的所有改动（命令表补齐 + 兜底加固 + 日志落盘接入）固化为可重放、幂等、失配即报错的补丁脚本。上游升级流程变为：重新拉取 `web/` → `node scripts/patch-webui.mjs` → `./scripts/build.sh`。若上游改了 shim 形态导致锚点失配，脚本会立刻报错提示人工复核——避免命令漂移被静默带过。

### 变更

- `package/manifest` 的 `distributor` 改为 `oiloveio`（本 fpk 发布创作者）。
- `scripts/build.sh` 构建前不再删除所有版本的 webui fpk，仅覆盖同版本号目标，**保留历史版本作回滚归档**。

## 3.3.22-2 - 2026-06-23

### 修复

- **修复 Payloads 页面崩溃（`TypeError: i is not iterable`）**：tauri-shim（`web/assets/tauri-core-*.js`）未注册 `payloads_catalog` / `payloads_local_inventory` 等命令，invoke 静默返回 `undefined`，被 `for...of` 迭代时崩溃。现已补齐命令路由并加固兜底。
- **修复日志页拿不到内核日志 + 每秒刷 `unhandled invoke` 警告**：前端轮询的命令名是 `engine_logs_tail`，而 shim 只注册了 `engine_logs`。已新增 `engine_logs_tail` → `/api/engine-logs` 映射（日志桥接报错 `Cannot read properties of undefined (reading 'entries')` 随之消除）。
- **修复进程页、SMP 状态拿不到数据**：补齐 `process_list_get` → `/api/ps5/proc/list`、`smp_status` → `/api/ps5/smp-meta/stats` 两个命令名映射（engine 确有这些接口，仅 shim 命令名对不上）。
- **加固 shim 兜底**：未注册命令（桌面版专属、engine 无对应接口的功能，如 payload 目录下载、`update_check`、`changelog_load`、`companion_probe`、`fs_read_preview` 等）由原先静默返回 `undefined` 改为 reject 并抛出明确错误，页面降级为错误提示而非整页白屏崩溃。

## 3.3.22-1 - 2026-06-23

### 修复

- **修复「loopback only」错误**：经源码确认，engine 的 loopback guard 仅支持精确 IP，不支持 CIDR/通配符。安装向导的 `wizard_allow_ip` 字段改为必填，帮助文本明确说明需要填写访问此网页的电脑/手机 IP。
- **向导简化**：PS5 地址字段拆为仅填 IP（`wizard_ps5_ip`），端口固定为 9113（经源码确认为当前唯一默认端口，9114 为 2.1.x 以前的历史端口）。runner 脚本自动拼接 `:9113`。
- **修复 wizard/config 残留「容器」措辞**：改为「使新配置生效」。

### 新增

- 新增防火墙端口声明文件 `package/ps5upload-engine.sc`，声明 TCP 19113。
- `config/resource` 加入 `port-config` 引用，飞牛可据此管理端口放行规则。
- **FPK 输出带版本号**：`scripts/build.sh` 现在输出 `ps5upload-engine_0.2.2_x86.fpk` 格式，便于版本管理和分发。
- `scripts/validate.sh` 新增 `.sc` 文件存在性检查。

## 0.2.1 - 2026-06-22

- 新增 `AGENTS.md`，把“项目说明文件默认使用中文”的协作偏好持久化到仓库。
- 将 `README.md`、`CHANGELOG.md` 和 `docs/` 下的说明文档统一改为中文。
- 将 fpk `manifest` 和桌面入口中的用户可见描述改为中文。
- 保留命令、环境变量、API 路径、上游镜像名等技术标识原文，避免翻译导致实现歧义。

## 0.2.0 - 2026-06-22

- 将 Docker 包基线替换为 fnOS 原生 x86 包。
- 新增 `scripts/fetch-engine-binary.mjs`，可在不依赖 Docker daemon 的情况下，从 GHCR OCI 镜像中提取锁定版本的上游 engine 二进制。
- 将 `ps5upload-engine` 打入 `app.tgz`。
- 移除 Docker 生命周期假设，改为由 `cmd/main` 直接管理进程。
- 新增 `ps5upload-engine-runner`，用于加载 fnOS 向导持久化配置，并用 `PS5_ADDR`、`PS5UPLOAD_ENGINE_PORT`、`PS5UPLOAD_ALLOW_IP` 启动 engine。
- 从 `config/resource` 中移除 Docker 资源声明。
- 已验证本地原生 start/status/stop 和 `/api/version`。

## 0.1.1 - 2026-06-22

- 将默认上游 engine 镜像锁定为 `ghcr.io/phantomptr/ps5upload-engine:3.3.22`。
- 新增 `UPSTREAM.lock`，记录上游仓库、tag、commit 和镜像基线。
- 新增 `scripts/check-upstream.sh`，用于比较当前打包基线与上游 HEAD/latest tag。
- 新增上游跟进策略，覆盖更新节奏、兼容性检查和发布门禁。
- 明确产品需求：fnOS 应用需要提供 NAS 托管的 WebUI，用于连接 PS5 并安装 NAS 上保存的游戏。
- 记录目标体验需要围绕上游 engine 内置 WebUI 做实测评估，避免过早假设需要另做完整 NAS WebUI。

## 0.1.0 - 2026-06-22

- 在 `/AiStudios/code` 下创建专用 fnOS 打包项目。
- 按官方 `fnpack` 结构新增 `package/`。
- 初始实现 Docker 运行形态，使用 `ghcr.io/phantomptr/ps5upload-engine`。
- 新增 fnOS manifest、应用入口、权限/资源声明和安装向导。
- 新增 Docker 状态报告和卸载数据清理相关生命周期脚本。
- 新增构建、校验和 `fnpack` 安装脚本。
- 记录已知限制和安全边界。

## 0.0.0 - 可行性记录

- 确认 `ps5upload-engine` 是第一阶段最合适的打包目标。
- 暂缓移植完整 Tauri 客户端，因为它需要重写为浏览器原生 WebUI。
