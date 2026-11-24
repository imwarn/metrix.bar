# test-utils/
> L2 | Parent: ../GEMINI.md

存放仓库内所有看板离线测试共享的零依赖 Metrix.Bar Protocol v0 契约断言库与统一测试运行器。

成员清单：
- metrixbar-assert.cjs: 共享 CommonJS 契约断言库，提供 `.bar` 脚本提取、树遍历与 Panel/Notch/Widget/TrayContent/View 契约校验
- run-all.cjs: 零依赖统一测试运行器，自动发现并按字典序顺序执行 `dashboards/*/*.test.cjs`，输出耗时与总览退出码

[PROTOCOL]: Update this header on change, then check GEMINI.md
