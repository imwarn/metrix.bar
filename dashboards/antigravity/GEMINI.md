# antigravity/
> L2 | Parent: ../GEMINI.md

自动读取本机 `agy` CLI 钥匙串凭据（`service: gemini, account: antigravity`，支持 macOS `go-keyring-base64:`）或自定义认证 JSON，经 `cloudflare:sockets` TLS 通道直连 `daily-cloudcode-pa.googleapis.com`（`loadCodeAssist` / `fetchAvailableModels` / `retrieveUserQuotaSummary`），展示有额度模型与配额桶。

成员清单：
- antigravity.bar: Metrix.Bar Protocol v0 看板源码（v1.1.0），实现钥匙串自动读凭据、TLS HTTP/1.1 分块解析、Daily/Production 自动回退、CC Switch 多账号切换、OAuth 续期、配额分组与双列网格视图、SQLite 趋势、Notch 与桌面 Widget
- antigravity.test.cjs: Node.js 离线契约测试，在 `node:vm` 沙箱中验证 `go-keyring-base64:` 解码、HTTP/1.1 分块解析、配额过滤与分组、网格切换、摘要兜底、0% 耗尽提醒、端点回退、401 续期、CC Switch 多账号、Notch 与 Widget

[PROTOCOL]: Update this header on change, then check GEMINI.md
