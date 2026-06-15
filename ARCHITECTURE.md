# Code Architecture

本项目采用静态单页信息可视化系统架构。`index.html` 是唯一入口，各分析窗口由 `components/*.html` 片段组成，并由 `js/component-loader.js` 装载到同一页面中。窗口之间通过 `js/state.js` 共享状态联动。

## Page Shell

| 文件 | 职责 |
|---|---|
| `index.html` | 大系统页面入口，只定义整体窗口槽位。 |
| `server.mjs` | 本地静态服务器，用于载入 HTML 片段和 CSV/JSON 数据。 |
| `README.md` | 项目启动方式、数据说明和目录说明。 |

## Component Windows

| 文件 | 窗口 | 当前状态 |
|---|---|---|
| `components/top-toolbar.html` | 顶部标题、年代切换、月份窗口控制 | 已联动 `selectedEra` 与 `selectedMonthWindow`。 |
| `components/route-map-panel.html` | 左侧路线地图选择器 | 真实中国边界 + 四条经典路线 + 节点，支持选择与当前节点反馈。 |
| `components/route-rhythm-view.html` | 中央路径节律主视图 | 主分析视图，支持路线、花期、天气、风险、缓冲、授粉、气候层。 |
| `components/livelihood-risk-panel.html` | 右侧生计风险解读面板 | 真实财务/行业图表 + 路线/节点联动解释。 |
| `components/status-bar.html` | 底部系统状态栏 | 同步路线、年代、月份窗口。 |
| `components/weather-detail-panel.html` | 节点天气详情浮层 | 保留为扩展槽位；当前详情嵌入中央视图内部。 |
| `components/tooltip-layer.html` | 节点 hover 摘要浮层 | 已用于中央节点 tooltip。 |

## Data Pipeline

| 文件 | 职责 |
|---|---|
| `project_reference/data/养蜂数据/datasets/*.csv` | 原始数据，不在前端迭代中篡改。 |
| `scripts/generate-route-segment-summary.mjs` | 从原始 CSV 生成路线段摘要表。 |
| `project_reference/data/derived/route_segment_summary.csv` | 派生摘要表：花期匹配、天气聚合、缓冲期、授粉、省域气候、数据备注。 |
| `js/data-loader.js` | 加载原始数据与派生数据，提供视图所需数据包。 |

## JavaScript Modules

| 文件 | 职责 |
|---|---|
| `js/app.js` | 启动入口：载入组件，初始化各窗口和顶部工具栏。 |
| `js/component-loader.js` | 将 `components/*.html` 装载到 `index.html` 的槽位。 |
| `js/state.js` | 轻量全局状态：路线、年代、月份窗口、图层、当前节点。 |
| `js/route-map-panel.js` | 左侧真实中国路线地图，承担路线发现与选择入口。 |
| `js/route-rhythm-view.js` | 中央路径节律矩阵，承担花期-天气-停留主分析。 |
| `js/livelihood-risk-panel.js` | 右侧财务、生计和风险解释面板。 |

## Current Data Caveats

- 授粉案例按省域/地区名称匹配，不能视为精确路段合同。
- 农药强度是国家级年度趋势，不能推断到某条路线。
- 省域气候表从 2000 年开始，1980s 路线不做省域年度气候趋势判断。
- 派生摘要表可重复生成；如原始数据更新，应重新运行 `node scripts/generate-route-segment-summary.mjs`。
