# 安全说明

`ps5upload-webui` 对外提供浏览器界面，并反代能力较强的未认证 `ps5upload-engine` HTTP API。它可以读取原生进程可访问的 NAS 本地路径，并可请求 PS5 payload 执行读取、写入、删除、挂载、安装和启动内容等操作。

## 使用规则

- 不要把 `19113` 暴露到公网。
- `PS5UPLOAD_ALLOW_IP` 只填写可信局域网客户端的精确 IP。
- 测试阶段优先只允许一台管理员工作站访问。
- 原生进程会直接在 NAS 上监听配置的服务端口。
- 默认不要开放过大的主机路径范围。
- WebUI 的 NAS 文件选择和 `/api/nas/*` 文件接口必须限制在 fnOS 传入的 `TRIM_DATA_SHARE_PATHS` 授权目录内；不要退回到任意主机路径读取。

## 已知上游限制

engine 当前在 `PS5UPLOAD_ALLOW_IP` 中支持精确 IP，不支持 CIDR 网段。这个限制对第一版 fpk 更安全，但对动态局域网客户端不够方便。

后续应优先增加 fnOS 网关集成或带认证的代理层，而不是直接放宽 engine 本身的访问边界。
