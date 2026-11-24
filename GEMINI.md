# metrix.bar - Metrix.Bar 自定义菜单栏看板仓库
Metrix.Bar Protocol v0 + JavaScript Worker + Node.js (`node:vm` / `node:assert`)

<directory>
dashboards/ - 自定义看板插件集合，按看板 ID 分目录维护（2 个子目录：antigravity/、beszel/）
designs/ - 看板交互式 HTML/JSX 界面原型与视觉方案探索（1 个子目录：antigravity-ui/）
test-utils/ - 所有看板离线测试共享的零依赖 Metrix.Bar Protocol v0 契约断言库与统一测试运行器
types/ - 所有看板共享的 Metrix.Bar 宿主运行时类型声明
.github/ - GitHub Actions 持续集成工作流配置（1 个子目录：workflows/）
.agents/ - 已安装的 `metrix-bar` Agent Skill 规范与接口说明
</directory>

<config>
.gitignore - Git 忽略规则（系统文件、日志与本地凭据）
README.md - 仓库目录约定、看板清单与本地测试/同步说明
skills-lock.json - `metrix-bar` Skill 来源与摘要锁定清单
</config>

[PROTOCOL]: 变更目录结构或新增看板模块时更新本文件。
