# 产品需求

## 核心目标

fnOS 包安装到 NAS 后，应提供一个 WebUI，让用户可以：

1. 连接运行 ps5upload payload 的 PS5；
2. 浏览或选择 NAS 上保存的游戏；
3. 在条件允许时读取安装包元数据；
4. 将选中的 NAS 本地游戏安装到 PS5；
5. 展示安装进度、错误和完成状态。

## 当前 WebUI 实现

当前 fpk 对外提供 `ps5upload-webui`，不是只暴露 engine 内置页面。运行时由三部分组成：

- `ps5upload-engine`：上游核心二进制，只监听 loopback 内部端口；
- `ps5upload-companion`：监听 fnOS 对外端口 `19113`，负责静态 WebUI、NAS 文件接口和 engine API 反代；
- `package/app/web/`：上游 React/Tauri WebUI 的预构建产物，通过 `scripts/patch-webui.mjs` 注入浏览器可用的 tauri-shim。

已实现能力包括：

- PS5 状态连接和轮询；
- 任务列表和任务状态更新；
- NAS 授权目录浏览与本地路径选择；
- 安装包安装流程；
- 安装进度、错误和完成状态展示；
- 客户端诊断日志落盘；
- 文本导出写入 fnOS 授权目录。

仍需真实 fnOS + PS5 环境验收的能力包括：

- 大体积 `.pkg` 安装的长时间稳定性；
- PS5 payload 发送流程；
- 安装包元数据检查在真实游戏包上的兼容性；
- 从旧版包升级到 `ps5upload-webui` 后的数据目录迁移体验。

## 后端能力

engine 已经暴露安装 API，包括 `/api/pkg/install/start`。对于 NAS 上的安装包，只要 engine 进程能读到对应路径，WebUI 就可以把类似 `/vol1/games/example.pkg` 的原生文件路径传给 engine。

## 下一阶段里程碑

继续围绕已实现的 `ps5upload-webui` 做 fnOS 实机验收和补丁化加固。

最低可用流程验收：

1. 配置 PS5 地址和允许访问模式。
2. 浏览挂载的 NAS 游戏目录。
3. 过滤 `.pkg`、拆分包、`.ffpkg` 和镜像等支持文件。
4. 执行安装包元数据检查。
5. 通过 engine API 启动安装。
6. 轮询安装状态并展示日志/错误。

## v3.3.22-x 明确边界

当前原生 fpk 是 `ps5upload-webui` 的可运行打包基线。它已经包含 WebUI、companion 和 NAS 文件选择接口，但仍需要在真实 fnOS + PS5 环境完成安装链路验收。
