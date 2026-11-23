# antigravity/
> L2 | Parent: ../GEMINI.md

读取本地导出的 Antigravity / Google OAuth 认证 JSON（或钥匙串覆盖 JSON），直连 Cloud Code Assist API（`loadCodeAssist` / `fetchAvailableModels`），过滤并展示当前账号下包含配额信息的模型。

成员清单：
- antigravity.bar: Metrix.Bar Protocol v0 看板源码，支持单/多账号切换、OAuth `refresh_token` 续期、Production/Daily 端点自动回退、配额分组与双列网格视图切换、SQLite 趋势记录、Notch 刘海与系统 Widget
- antigravity.test.cjs: Node.js 离线契约测试，在 `node:vm` 沙箱中验证配额过滤、分组聚合、网格切换、复制、搜索、0% 耗尽处理、离线容错、端点回退、401 续期、多账号、Notch 与 Widget

[PROTOCOL]: Update this header on change, then check GEMINI.md
