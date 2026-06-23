# ps5upload-webui

`ps5upload-webui` 的飞牛 fnOS 原生 `.fpk` 打包项目。

本仓库把上游 `ps5upload-engine` 和 React WebUI 打包为可在 fnOS 上直接运行的原生应用（不依赖 Docker）。外部访问 `ps5upload-webui` 的 Web 界面，内部由 companion 反代 loopback engine API。

## 版本号方案

版本格式：`上游版本-打包版次`，如 `3.3.22-1`。

- `3.3.22` = 内置的 ps5upload-engine 上游版本，与 `UPSTREAM.lock` 中的 `UPSTREAM_TAG` 一致。
- `-1` = 打包迭代，仅修打包脚本/文档不涉及上游二进制时递增。
- git tag：`v3.3.22-1`，FPK 文件名：`ps5upload-webui_3.3.22-1_x86.fpk`。

## 当前范围

| 项目 | 值 |
|------|----|
| 包类型 | fnOS 原生 x86 应用 |
| 应用 ID | `ps5upload-webui` |
| 服务端口 | `19113` |
| 内置二进制版本 | `3.3.22`（来源：`ghcr.io/phantomptr/ps5upload-engine:3.3.22`）|
| 运行方式 | companion 对外提供 WebUI，内部启动并反代 loopback engine；不依赖 Docker |

## 安装使用

### 安装向导填写说明

| 字段 | 填什么 | 示例 |
|------|--------|------|
| PS5 的局域网 IP | PS5 运行 ps5upload payload 后的 IP | `192.168.1.50` |
| 你的电脑/手机 IP | 用于打开此 WebUI 的设备局域网 IP | `192.168.1.100` |

- PS5 连接端口固定 **9113**，无需填写。
- "电脑/手机 IP" **必须填**，否则打开网页时会显示 `loopback only` 错误。多台设备用英文逗号分隔，如 `192.168.1.100,192.168.1.101`。

### 游戏文件放哪里

安装完成后，引擎才能访问到 NAS 上的文件。游戏/PKG 文件放在飞牛文件管理里的共享文件夹：

> **文件管理 → 应用数据 → ps5upload**

该文件夹在 NAS 文件系统的实际路径通常为 `/vol1/@appshare/ps5upload/`（实际路径取决于 NAS 卷编号）。

### 使用 WebUI 安装 PKG 游戏

安装 `.pkg` 游戏推荐用 **Package Library**（包库）功能，不是 Quick Transfer：

1. 把 `.pkg` 文件上传到 NAS 的 `ps5upload` 共享文件夹。
2. 在 WebUI 左侧找到 **Package Library** / **Install Package** 入口。
3. 点击 **Add** 添加 PKG 路径（填 NAS 上的完整路径，如 `/vol1/@appshare/ps5upload/game.pkg`）。
4. 点击 **Install** 开始安装，进度会实时显示。

### Quick Transfer 字段说明

Quick Transfer 用于传输任意文件（存档、自制程序等）。字段含义：

| 字段 | 含义 | 示例 |
|------|------|------|
| PS5 address | PS5 地址（留空使用安装时配置的默认值）| 留空即可 |
| Destination root on PS5 | PS5 上的目标目录 | `/data/homebrew/` |
| Local file paths | **NAS 上的文件路径**（不是你电脑上的路径）| `/vol1/@appshare/ps5upload/file.bin` |

注意：Local file paths 指的是 **NAS 文件系统上的路径**，即你放到 `ps5upload` 共享文件夹中的文件。

## 项目结构

```text
ps5upload-webui/
├── package/              # fnpack 构建使用的包目录
│   ├── app/
│   │   ├── bin/          # engine 二进制（gitignore，构建时拉取）
│   │   └── ui/           # 飞牛应用中心入口配置
│   ├── cmd/              # fnOS 生命周期脚本
│   ├── config/           # 权限与资源声明
│   ├── wizard/           # 安装、配置、卸载向导
│   ├── ps5upload-webui.sc  # 防火墙端口声明
│   ├── manifest
│   ├── ICON.PNG
│   └── ICON_256.PNG
├── scripts/
│   ├── build.sh              # 构建 FPK（自动拉取二进制）
│   ├── install-fnpack.sh     # 安装 fnpack 打包工具
│   ├── validate.sh           # 校验包结构
│   ├── check-upstream.sh     # 检查上游新版本
│   └── fetch-engine-binary.mjs  # 从 GHCR 提取上游二进制
├── docs/
│   ├── DEVELOPMENT.md        # 开发与发布流程
│   ├── UPSTREAM_STRATEGY.md  # 上游跟进策略
│   └── ...
├── CHANGELOG.md
├── UPSTREAM.lock             # 锁定的上游版本基线
└── VERSION                   # 当前版本号（格式：上游版本-打包版次）
```

## 构建

首次构建前安装 `fnpack`：

```bash
./scripts/install-fnpack.sh
```

构建 FPK（首次构建会自动拉取上游二进制）：

```bash
./scripts/build.sh
```

输出：`dist/ps5upload-webui_3.3.22-1_x86.fpk`

## 发布流程

1. 更新 `VERSION`、`package/manifest` 中的 `version` 和 `changelog` 字段
2. 在 `CHANGELOG.md` 补充本次变更说明
3. 运行 `./scripts/build.sh` 生成带版本号的 FPK
4. 打 git tag：`git tag v$(cat VERSION)`
5. 分发 `dist/` 中的 FPK 文件

跟进上游新版本：

```bash
./scripts/check-upstream.sh
```

## 安全说明

engine API 无内置鉴权，不要把 `19113` 端口暴露到公网。局域网内只允许可信设备访问（通过向导的 IP 白名单控制）。

## 参考链接

- 上游项目：https://github.com/phantomptr/ps5upload
- fnOS 开发文档：https://developer.fnnas.com/docs/guide/
