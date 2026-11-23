# beszel/
> L2 | Parent: ../GEMINI.md

通过 Tailscale 连接 Beszel Hub（PocketBase API，适配 Beszel 0.21.1），在菜单栏与面板展示主机状态、资源趋势与容器用量。

成员清单：
- beszel.bar: Metrix.Bar Protocol v0 看板源码，内含元数据、网络权限、输入项与持久化 Worker 脚本（登录续期、主机总览、1h/24h 图表、容器列表）
- beszel.test.cjs: Node.js 离线契约测试，以 `node:vm` 沙箱执行 `beszel.bar` 并校验总览、图表、单位换算、密码隔离、Hub 绑定与 401 续期
- references/: 精简留存的 Beszel 0.21.1 上游 TypeScript 接口与类型参考，供版本升级核对，不参与运行时加载

[PROTOCOL]: Update this header on change, then check GEMINI.md
