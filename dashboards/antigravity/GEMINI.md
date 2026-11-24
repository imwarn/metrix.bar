# antigravity/
> L2 | Parent: ../GEMINI.md

优先静默读取本机 `~/.gemini/` 登录态文件（无钥匙串弹窗），内存缓存有效凭据，缺失时按需回退系统钥匙串（`service: gemini, account: antigravity`）；经 `cloudflare:sockets` TLS 通道低频单请求查询 `daily-cloudcode-pa.googleapis.com` 配额。

成员清单：
- antigravity.bar: Metrix.Bar Protocol v0 看板源码（v1.4.0），实现 `~/.gemini` 静默凭据读取、`cachedAuth` 内存缓存与防弹窗守卫、15m 单请求 `retrieveUserQuotaSummary` 轮询、24h 元数据与黏性端点缓存，以及 420px 双焦点圆环仪表（HeroDualRings）、5H/WEEKLY 匀速刻度 PaceBar、消耗预测与 SQLite 往期趋势、A2 精简可读模型胶囊（点击复制完整 ID）、按需 `richTray` 原生双行富托盘、自定义低额度阈值与预测提前耗尽刘海预警及严格子集 Widget
- antigravity.test.cjs: Node.js 离线契约测试（21 项离线契约检查），在 `node:vm` 沙箱中验证 `~/.gemini` 优先读取、`cachedAuth` 零重复读取、异步 `secret()`、精确诊断与防弹窗守卫、单请求轮询与黏性端点、v1.4.0 420px 双环切换、Even-Pace 刻度、A2 精简胶囊复制、Mock SQLite 趋势与历史柱图、`WidgetComponentProps` 严格子集校验、`richTray` 原生双行富托盘（`TrayContentRoot` 校验）及自定义低额度阈值/预测提前耗尽刘海预警

[PROTOCOL]: Update this header on change, then check GEMINI.md
