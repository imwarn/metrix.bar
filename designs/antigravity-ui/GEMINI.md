# designs/antigravity-ui/
> L2 | Parent: ../GEMINI.md

Antigravity 看板界面改版交互式画布原型，覆盖 3 套主面板变体及 Menu Bar / Notch / 桌面小组件全表面预览。

成员清单：
- Antigravity UI Options.html: 原型主入口，定义明暗主题语义 CSS 变量并按依赖顺序加载固定版本 React/Babel 与 JSX 模块
- design-canvas.jsx: 来自 baoyu-design 的画布引擎，提供缩放平移、分组区、可拖拽画板与聚焦浮层
- shared-data.jsx: 导出 `window.AGY_SHARED`，封装 5 种合成场景数据与 `AgyIcon`/`DonutGauge`/`PaceBar`/`TrendChartSVG`/`PastCyclesSVG`/`SurfaceShowcase`
- variant-a.jsx: 方案 A · 官方双环仪表风（`window.VariantAGauges`），以双 Donut 仪表与去嵌套分组列表为核心
- variant-b.jsx: 方案 B · 极简线性节奏风（`window.VariantBLinear`），以瓶颈横幅与无边框双列 PaceBar 轨道为核心
- variant-c.jsx: 方案 C · 2×2 矩阵聚焦驾驶舱（`window.VariantCCockpit`），以 4 桶 Bento 矩阵联动下方 Tab 检查器为核心
- app.jsx: 顶层状态编排与 `#root` 挂载入口，管理 `Tweaks` 调试浮层、主题/场景/宽度切换与复制 Toast
- _d_meta.json: 设计资产索引清单，由 `record-asset.mjs` 生成并维护

[PROTOCOL]: Update this header on change, then check GEMINI.md
