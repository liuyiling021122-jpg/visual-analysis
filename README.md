# 追花为生：流动养蜂可视分析系统

这是一个静态单页信息可视化系统，用于分析中国流动养蜂人的迁徙路线、花期窗口、逐日天气、授粉服务与生计风险。

## 运行方式

`index.html` 会通过 `fetch` 载入 `components/*.html` 片段，需要使用本地静态服务器。

```bash
node server.mjs
```

默认地址：

```txt
http://localhost:4173
```

## 当前实现

- 左侧 `route-map-panel`：真实中国边界底图 + 四条经典迁徙路线 + 节点，作为路线选择入口。
- 中央 `RouteRhythmView`：时间轴 × 纬度轴路径节律矩阵，支持路线、花期、天气、风险、缓冲、授粉、气候层开关。
- 右侧 `livelihood-risk-panel`：利润趋势、模式对比、成本结构、收入结构、农药趋势参考，以及随路线/节点变化的风险解释。
- 顶部工具栏：年代切换与月份窗口过滤。
- 底部状态栏：同步当前路线、年代和时间窗口。

## 数据说明

原始数据位于：

```txt
project_reference/data/养蜂数据/datasets/
```

本项目不直接修改原始 CSV。路线段分析使用派生摘要表：

```txt
project_reference/data/derived/route_segment_summary.csv
```

该表由以下脚本从原始数据重新计算：

```bash
node scripts/generate-route-segment-summary.mjs
```

派生表包含每个路线段的路线字段、花期匹配、逐日天气聚合、缓冲期天数、授粉案例省域匹配、省域气候参考和数据质量备注。

## 数据边界

- 授粉服务数据是案例级/地区级，只用于预览和解释，不作为精确路段收入。
- 农药使用数据是国家级年度数据，只作为背景趋势，不定位到具体路线或节点。
- 省域气候数据从 2000 年开始，1980s 路线不做省域年度气候趋势判断。
- 财务数据中的 2024/2025 年值按资料说明为估算或预估，界面保留“估算”标注。

## 目录结构

```txt
.
├── index.html
├── server.mjs
├── components/
├── css/
├── js/
├── scripts/
│   └── generate-route-segment-summary.mjs
└── project_reference/
    └── data/
        ├── 养蜂数据/datasets/
        └── derived/
```
