# metrix.bar

个人维护的 [Metrix.Bar](https://metrix.bar) 自定义菜单栏看板插件仓库。

## 目录结构

```text
.
├── dashboards/                # 自定义看板集合，每个看板独占一个子目录
│   ├── antigravity/           # Antigravity 模型配额与重置倒计时看板
│   │   ├── antigravity.bar    # Metrix.Bar Protocol v0 看板源码（含富托盘 / Notch / Widget / SQLite）
│   │   └── antigravity.test.cjs # Node.js 离线契约测试（21 项离线契约检查）
│   └── beszel/                # Beszel 主机与容器监控看板
│       ├── beszel.bar         # Metrix.Bar Protocol v0 看板源码
│       ├── beszel.test.cjs    # Node.js 离线契约测试
│       └── references/        # 上游 Beszel 0.21.1 接口与类型参考
├── designs/                   # 看板交互式 HTML/JSX 界面原型与视觉方案探索
│   └── antigravity-ui/        # Antigravity 主面板 3 套变体与全表面交互评审原型
├── types/                     # 仓库内所有看板共享的 Metrix.Bar 运行时类型定义
│   └── metrixbar-runtime.d.ts
├── .agents/                   # 已安装的 metrix-bar Agent Skill
└── skills-lock.json           # Skill 来源与校验锁定清单
```

## 看板列表

| 看板 ID | 路径 | 版本 | 协议 | 说明 |
| --- | --- | --- | --- | --- |
| `antigravity` | [`dashboards/antigravity/antigravity.bar`](dashboards/antigravity/antigravity.bar) | `1.4.0` | `AGPL-3.0-only` | 优先静默读取本机 `~/.gemini` 登录态（钥匙串兜底 + 内存缓存），15m 单请求同步 420px 双焦点圆环仪表、5H/WEEKLY 匀速刻度 PaceBar、消耗预测与往期趋势、精简可读模型胶囊（点击复制完整 ID）、按需 `richTray` 原生双行富托盘、自定义低额度阈值与预测提前耗尽刘海预警及桌面 Widget |
| `beszel` | [`dashboards/beszel/beszel.bar`](dashboards/beszel/beszel.bar) | `1.0.0` | `AGPL-3.0-only` | 通过 Tailscale 查看 Beszel 主机状态、1h/24h 资源趋势与容器用量 |

## 本地测试

所有契约测试仅依赖 Node.js 内置模块（`node:vm`、`node:assert`），可在仓库根目录直接运行：

```bash
node dashboards/antigravity/antigravity.test.cjs
node dashboards/beszel/beszel.test.cjs
```

## 与 Metrix.Bar 本地 API 同步

1. 在 Metrix.Bar 应用中开启 **Agent → Enable local API**，获取本地地址与 Bearer Token。
2. 校验看板语法与运行态：
   - `POST /v0/validate`
   - `POST /v0/check`
3. 安装或更新看板：
   - 新增：`POST /v0/dashboards`
   - 更新：先 `GET /v0/dashboards/{id}/source` 读取 `ETag`，再携带 `If-Match` 执行 `PUT /v0/dashboards/{id}/source`。

> 请勿在仓库源码、测试夹具或提交记录中写入本地 API Bearer Token、账号密码或会话令牌。

## 新增看板约定

- 在 `dashboards/<id>/` 下创建 `<id>.bar` 与配套 `<id>.test.cjs`。
- 将接口/类型参考按需归档至 `dashboards/<id>/references/`，避免提交大型仓库树或临时抓包文件。
- 复用根目录 [`types/metrixbar-runtime.d.ts`](types/metrixbar-runtime.d.ts) 对照宿主运行时接口。
