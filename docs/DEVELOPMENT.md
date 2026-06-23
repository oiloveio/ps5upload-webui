# 开发说明

## 工作目录

项目目录：

```text
/AiStudios/code/ps5upload-webui
```

`/AiStudios/code` 是当前工作区专门存放代码项目的根目录。

## 打包策略

当前里程碑是 fnOS 原生 x86 fpk：

1. 从 GHCR OCI 镜像中提取锁定版本的上游 engine 二进制。
2. 将二进制放入 `package/app/bin/ps5upload-engine`。
3. 通过 `package/cmd/main` 直接启动和停止 engine 进程。
4. 通过标准应用入口暴露上游 engine 的内置页面。
5. 用户数据放在应用 data-share 挂载目录中。

该包运行时不依赖 Docker。

## 校验门禁

构建前：

```bash
./scripts/validate.sh
```

发布前：

```bash
./scripts/build.sh
```

然后在 fnOS 测试设备上手动安装生成的 `.fpk` 并验证：

- 应用可以正常安装；
- 原生进程可以启动；
- 应用入口可以打开；
- `/api/version` 有响应；
- 可信局域网客户端 IP 只有在显式加入 allowlist 后才能访问 API；
- 安装包流程中 PS5 可以访问 `/pkg-host/*`。

## 多 agent 异步迭代

本项目允许多个 agent 异步迭代，但必须通过 git 留下可追溯边界：

- 每个 agent/run 使用独立 branch 或 worktree；接手前先查看 `git status --short`、当前分支和 `git rev-parse HEAD`。
- 不回滚其他 agent 或用户的未提交改动；如有冲突，先记录冲突点。
- 可运行迭代必须提交，提交信息带 trailer：

```text
Agent: <agent-name>
Model: <dynamic-model-name-or-unknown>
Agent-Run: <run-id-or-timestamp>
Base-Commit: <git-sha>
Task: <short-reason>
```

- 模型名必须动态读取：优先 agent runtime / 平台元数据，其次环境变量（如 `MODEL_NAME` / `OPENAI_MODEL`），再其次当前会话可确认模型；无法确认时写 `unknown`。
- 暂不能提交时，写 `.agents/runs/<run-id>.json`，记录 agent、model、base commit、原因、时间、变更文件、验证结果和未完成事项。

## 本地原生冒烟测试

```bash
rm -rf /tmp/ps5upload-webui-smoke
TRIM_APPNAME=ps5upload-webui \
TRIM_APPDEST="$PWD/package/app" \
TRIM_PKGVAR=/tmp/ps5upload-webui-smoke \
TRIM_SERVICE_PORT=19113 \
  ./package/cmd/install_callback

TRIM_APPNAME=ps5upload-webui \
TRIM_APPDEST="$PWD/package/app" \
TRIM_PKGVAR=/tmp/ps5upload-webui-smoke \
TRIM_SERVICE_PORT=19113 \
  ./package/cmd/main start

curl http://127.0.0.1:19113/api/version

TRIM_APPNAME=ps5upload-webui \
TRIM_APPDEST="$PWD/package/app" \
TRIM_PKGVAR=/tmp/ps5upload-webui-smoke \
TRIM_SERVICE_PORT=19113 \
  ./package/cmd/main stop
```

## 发布流程

版本号方案：`上游版本-打包版次`（如 `3.3.22-1`）。详见 `docs/UPSTREAM_STRATEGY.md`。

发布步骤：

```bash
# 1. 修改版本号（两处保持一致）
echo "3.3.22-1" > VERSION
# 同时修改 package/manifest 中的 version= 和 changelog= 行

# 2. 在 CHANGELOG.md 补充本次变更

# 3. 构建
./scripts/build.sh
# 输出：dist/ps5upload-webui_3.3.22-1_x86.fpk

# 4. 校验通过后打 tag
git add -A && git commit -m "release: v3.3.22-1"
git tag v3.3.22-1

# 5. 分发 dist/ 中的 FPK 文件
```

打包版次递增（不换上游二进制，只改打包内容）：
- `3.3.22-1` → `3.3.22-2`：修了向导 / 脚本 / 文档

跟进上游新 tag：
- `3.3.22-x` → `3.3.24-1`：更换二进制，打包版次重置为 1

## 文档语言规范

本项目面向中文使用者。项目介绍、更新日志、开发说明、需求说明、打包说明、安全说明和发布说明默认使用中文；命令、路径、环境变量、API 路径和上游包名保留原文。
