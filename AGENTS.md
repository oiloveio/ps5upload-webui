# 项目协作记忆

## 用户偏好

- 本项目后续沟通、说明文档和发布记录默认使用简体中文。
- `README.md`、`CHANGELOG.md`、`docs/` 下的需求/开发/打包/安全/上游策略文档、安装向导、fpk 用户可见描述都应优先写中文。
- 命令、路径、环境变量、API 路径、包名、上游项目名等技术标识保留原文，避免翻译造成歧义。
- 如需引用英文上游内容，应先用中文说明结论，再保留必要的英文专有名词或链接。

## 开发约定

- 代码项目统一放在 `/AiStudios/code`，当前项目目录是 `/AiStudios/code/ps5upload-webui`。
- 修改 fpk 内容或用户可见行为时，需要同步更新 `CHANGELOG.md`。
- 构建前至少运行 `./scripts/validate.sh`；发布前运行 `./scripts/build.sh` 并记录结果。
- 上游基线以 `UPSTREAM.lock` 为准，升级上游 engine 时同步更新 `docs/UPSTREAM_STRATEGY.md` 和 `CHANGELOG.md`。

## 多 agent 异步迭代规则

- 本项目必须保持 git 可追踪；多个 agent 同时迭代时，优先使用独立 branch 或 worktree，不要在未说明来源的情况下混写同一工作树。
- 接手任务第一步先读 `git status --short`、当前分支、`git rev-parse HEAD` 和相关文档，确认哪些改动不是自己产生的。
- 每个可运行迭代都要提交。提交信息必须动态记录 agent 和模型，不得写死某个模型名。
- 模型名读取优先级：agent runtime / 平台元数据、环境变量（如 `MODEL_NAME` / `OPENAI_MODEL`）、当前会话可确认模型；无法确认时填 `unknown`，但不能省略字段。
- 提交必须带 trailer：
  - `Agent: <agent-name>`
  - `Model: <dynamic-model-name-or-unknown>`
  - `Agent-Run: <run-id-or-timestamp>`
  - `Base-Commit: <git-sha>`
  - `Task: <short-reason>`
- 未提交交接记录写入 `.agents/runs/<run-id>.json`，至少包含：`agent`、`model`、`base_commit`、`reason`、`started_at`、`finished_at`、`files_changed`、`validation`、`open_issues`。
- 不要回滚其他 agent 或用户的未提交改动；如果这些改动阻塞当前任务，先说明冲突点再决定处理方式。

## 本规则文件变更记录

- 时间：2026-06-23T04:01:24Z
- 修改者：Codex
- 模型：GPT-5（由当前会话系统/开发者指令声明）
- 基于：`1121b7db2d7ad76397c5416ad8f0a1dd013d6cdf`
- 原因：用户要求本项目支持多 agent 异步迭代归因，明确谁、模型、基线、原因和时间。
