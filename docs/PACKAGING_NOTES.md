# 打包说明

## 使用的 fnOS 官方结构

本包遵循官方 `fnpack` 结构：

- `manifest`
- `app/`
- `cmd/`
- `config/privilege`
- `config/resource`
- `wizard/`
- `ICON.PNG`
- `ICON_256.PNG`

原生二进制路径：

```text
package/app/bin/ps5upload-engine
```

如果该文件不存在，`scripts/build.sh` 会自动按 `UPSTREAM.lock` 拉取锁定版本的二进制。

桌面入口配置路径：

```text
package/app/ui/config
```

## 运行时环境

fnOS 会提供以下运行时变量：

- `TRIM_APPNAME`
- `TRIM_APPDEST`
- `TRIM_PKGVAR`
- `TRIM_DATA_SHARE_PATHS`
- `TRIM_SERVICE_PORT`

`package/cmd/main` 使用这些变量启动和停止 `ps5upload-webui` 服务进程组。进程组内包含内部 `ps5upload-engine` 和对外 `ps5upload-companion`。安装/配置向导填写的值会持久化到：

```text
${TRIM_PKGVAR}/config/runtime.env
```

WebUI NAS 选择器的根目录来源：

1. fnOS 运行时传入的 `TRIM_DATA_SHARE_PATHS`；
2. 安装/配置向导保存的 `PS5UPLOAD_NAS_ROOTS`；
3. 本地开发时若前两者为空，才回退扫描 `/vol*` 或 `/volumes/*`。

`PS5UPLOAD_NAS_ROOTS` 只声明“可显示为选择器根目录”的路径，不提升系统权限。最终能否读取/写入仍由 fnOS/文件系统权限决定。

## 当前待确认事项

- WebUI 来自上游 Tauri 前端预构建产物，浏览器环境依赖本项目维护的 tauri-shim 补丁；上游升级时必须重跑 `scripts/patch-webui.mjs`。
- 浏览器侧 NAS 文件选择、路径可读性和大目录性能需要在 fnOS 环境中确认。
- 向 PS5 loader 发送 `ps5upload.elf` 的流程是否需要在 fpk 中额外暴露，需要结合实测结果决定。
- 修改配置后需要重启应用，原生进程才能读取新的环境变量。

## 产物说明

构建产物位于 `dist/`，文件名形如 `ps5upload-webui_3.3.22-5_x86.fpk`。当前包是原生 fpk，WebUI、companion 和 engine 二进制都会被打入 `app.tgz`，不是运行时再关联 Docker 容器。
