# antigravity/
> L2 | Parent: ../GEMINI.md

优先静默读取本机 `~/.gemini/` 登录态文件（无钥匙串弹窗），内存缓存有效凭据，缺失时按需回退系统钥匙串（`service: gemini, account: antigravity`）；经 `cloudflare:sockets` TLS 通道低频单请求查询 `daily-cloudcode-pa.googleapis.com` 配额。

成员清单：
- antigravity.bar: Metrix.Bar Protocol v0 看板源码（v1.3.0），实现 `~/.gemini` 静默凭据读取、`cachedAuth` 内存缓存与防弹窗守卫、精确异常分级提示、15m 单请求 `retrieveUserQuotaSummary` 轮询、24h 元数据与黏性端点持久化、5H + WEEKLY 双额度分组、新模型优先网格、SQLite 趋势、Notch 与 Widget
- antigravity.test.cjs: Node.js 离线契约测试，在 `node:vm` 沙箱中验证 `~/.gemini` 优先读取、`cachedAuth` 零重复读取、异步 `secret()`、钥匙串/文件/过期诊断、单请求轮询、5m 展开节流、黏性端点、5H + WEEKLY 双额度分组与新模型排序

[PROTOCOL]: Update this header on change, then check GEMINI.md
