# 追花为生｜浅色编辑型信息图视觉 Spec

> 本视觉规范基于浅色弧线信息图参考图制定。整体方向为：**浅色纸面、编辑型信息图、低饱和暖橙与浅青蓝、细线条、多层弧线、衬线大标题、高留白**。  
> 注意：本项目不使用深色背景，不做科技风 dashboard，不与其他深色项目混用。

---

## 1. 整体视觉方向

项目视觉风格应参考浅色信息图案例，整体定位为：

**纸面感数据年鉴 + 蜂农追花路线图 + 编辑型信息可视化**

界面不要做成普通数据后台，也不要做成深色科技风。  
应呈现出类似报纸专题、数据杂志、信息图海报的感觉。

### 核心关键词

```txt
浅色背景
高留白
纸面感
细线条
低饱和暖橙
浅青蓝辅助
衬线大标题
小字号注释
多层弧线
路线叙事
数据密集但轻盈
```

---

## 2. 视觉禁忌

Codex 实现时需要避免：

```txt
不要使用深色背景
不要使用纯黑大面积文字
不要使用荧光色
不要使用高饱和蓝紫色
不要做成传统 dashboard
不要使用厚重阴影
不要大面积实色块
不要让卡片边框太重
不要让界面像 SaaS 管理后台
不要使用玻璃拟态或霓虹发光效果
```

整体应当是**温和、克制、精细、带有印刷感**的可视化风格。

---

# 3. 色彩系统

## 3.1 基础背景色

```css
:root {
  --bg-page: #F7F6F2;
  --bg-canvas: #F9F8F4;
  --bg-panel: #F3F1EB;
  --bg-soft: #FBFAF6;
}
```

### 使用规则

- `--bg-page` 用于整个页面背景。
- `--bg-canvas` 用于主可视化画布。
- `--bg-panel` 用于侧边信息区、说明区、局部图例。
- `--bg-soft` 用于 tooltip、局部说明块、小型浮层。

背景不应是纯白，而是带一点暖灰的纸张色。

---

## 3.2 文字颜色

```css
:root {
  --text-primary: #2F2A26;
  --text-secondary: #5E5751;
  --text-muted: #8E877F;
  --text-faint: #B5ADA3;
}
```

### 使用规则

| 用途 | 颜色 |
|---|---|
| 主标题 / 核心标题 | `--text-primary` |
| 正文说明 / 图例文字 | `--text-secondary` |
| 坐标轴 / 注释 / 小标签 | `--text-muted` |
| 极弱辅助信息 | `--text-faint` |

不要使用纯黑 `#000000`。  
主文字应像印刷灰黑，而不是屏幕纯黑。

---

## 3.3 线条颜色

```css
:root {
  --line-subtle: #E6E1D8;
  --line-normal: #D6D0C7;
  --line-strong: #BEB7AE;
  --line-faint-blue: #CFE3E1;
  --line-faint-orange: #F3DEC2;
}
```

### 使用规则

- 背景网格、辅助弧线：`--line-subtle`
- 坐标轴、普通连接线：`--line-normal`
- 当前高亮结构线：`--line-strong`
- 天气相关辅助线：`--line-faint-blue`
- 蜜源 / 花期相关辅助线：`--line-faint-orange`

线条整体要细，默认 `1px`。  
重要路径可用 `1.5px ~ 2px`，不要超过 `3px`。

---

## 3.4 主色系统

```css
:root {
  --color-main-1: #D88C52;
  --color-main-2: #E5A56F;
  --color-main-3: #EFC18F;
  --color-main-4: #F3DEC2;

  --color-accent-1: #8DBFC1;
  --color-accent-2: #A9D0D0;
  --color-accent-3: #CFE3E1;

  --color-neutral-1: #C8B8A6;
  --color-neutral-2: #D9CEC1;
  --color-neutral-3: #EAE3D9;

  --color-risk: #B96C54;
  --color-warning: #C89A5B;
  --color-good: #8FAE8E;
}
```

### 使用规则

| 色彩类型 | 颜色 | 用途 |
|---|---:|---|
| 主暖橙 | `#D88C52` | 主路线、核心数据、推荐路径 |
| 次暖橙 | `#E5A56F` | 花期、蜜源、局部强调 |
| 浅暖橙 | `#EFC18F` | 次级蜜源、浅层数据带 |
| 极浅暖橙 | `#F3DEC2` | 背景花期带、弱辅助层 |
| 主浅青蓝 | `#8DBFC1` | 天气、对照数据、辅助图层 |
| 次浅青蓝 | `#A9D0D0` | 降水、湿度、辅助天气层 |
| 极浅青蓝 | `#CFE3E1` | 天气背景、弱对照信息 |
| 陶土红 | `#B96C54` | 风险、异常、错峰提醒 |
| 柔和橄榄绿 | `#8FAE8E` | 正向推荐、适宜状态 |

---

## 3.5 数据语义映射

```css
:root {
  --semantic-route: #D88C52;
  --semantic-route-soft: #F3DEC2;

  --semantic-time: #C8B8A6;
  --semantic-location: #2F2A26;

  --semantic-nectar: #D88C52;
  --semantic-bloom: #E5A56F;
  --semantic-bloom-soft: #F3DEC2;

  --semantic-weather: #8DBFC1;
  --semantic-rainfall: #A9D0D0;
  --semantic-weather-soft: #CFE3E1;

  --semantic-risk: #B96C54;
  --semantic-warning: #C89A5B;
  --semantic-positive: #8FAE8E;

  --semantic-muted-data: #D9CEC1;
}
```

### 含义

| 数据类型 | 视觉颜色 |
|---|---|
| 主路线 / 推荐路径 | 暖橙 `#D88C52` |
| 花期 / 蜜源 | 橙色系 |
| 天气 / 降水 / 风速 | 浅青蓝系 |
| 时间 / 背景刻度 | 暖灰色 |
| 风险 / 错峰 / 异常 | 陶土红 `#B96C54` |
| 正向推荐 | 柔和橄榄绿 `#8FAE8E` |

---

# 4. 字体系统

## 4.1 字体搭配

标题使用衬线，正文使用无衬线。

```css
:root {
  --font-family-display:
    "Cormorant Garamond",
    "Times New Roman",
    "Source Han Serif SC",
    "Noto Serif SC",
    "Songti SC",
    serif;

  --font-family-base:
    "Inter",
    "Noto Sans SC",
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;
}
```

### 使用规则

| 内容 | 字体 |
|---|---|
| 主标题 | `--font-family-display` |
| 章节标题 | `--font-family-display` 或 `--font-family-base` |
| 正文说明 | `--font-family-base` |
| 图例 / 注释 | `--font-family-base` |
| 坐标轴 / 数值 | `--font-family-base` |

---

## 4.2 字号系统

```css
:root {
  --font-display-xl: 56px;
  --font-display-lg: 38px;
  --font-display-md: 28px;

  --font-title-lg: 20px;
  --font-title-md: 16px;
  --font-body-md: 13px;
  --font-body-sm: 11px;
  --font-caption: 10px;
  --font-micro: 9px;
}
```

### 使用规则

| Token | 用途 |
|---|---|
| `--font-display-xl` | 主视觉标题 |
| `--font-display-lg` | 大章节标题 |
| `--font-display-md` | 局部大标题 |
| `--font-title-lg` | 面板标题 |
| `--font-title-md` | 模块标题 |
| `--font-body-md` | 正文说明 |
| `--font-body-sm` | 图例、标签 |
| `--font-caption` | 坐标轴、注释 |
| `--font-micro` | 极小刻度、数据点编号 |

---

## 4.3 字重与行高

```css
:root {
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-display: 0.95;
  --line-height-tight: 1.2;
  --line-height-normal: 1.45;
  --line-height-loose: 1.65;
}
```

### 使用规则

- 大标题使用 `600` 或 `700`，行高 `0.95 ~ 1.0`。
- 正文使用 `400`，行高 `1.45`。
- 注释文字使用 `400`，行高 `1.4`。
- 小标题使用 `500 ~ 600`。

---

## 4.4 数字排版

所有数字、日期、刻度建议启用等宽数字：

```css
.numeric,
.axis-label,
.metric-value {
  font-variant-numeric: tabular-nums;
}
```

这样日期、温度、降水量、距离、分数等数据会更像编辑型信息图。

---

# 5. 画布与整体质感

## 5.1 主画布

```css
.canvas {
  background: var(--bg-canvas);
  color: var(--text-primary);
}
```

主画布应有大量留白。  
不要把所有区域填满。  
参考图的重点是“数据结构在纸面上展开”，而不是“卡片堆满屏幕”。

---

## 5.2 细线网格

可以使用非常弱的网格、辅助圆弧、刻度线。

```css
.guide-line {
  stroke: var(--line-subtle);
  stroke-width: 1;
  fill: none;
}

.axis-line {
  stroke: var(--line-normal);
  stroke-width: 1;
  fill: none;
}
```

网格线透明度要低，不要抢数据主体。

---

# 6. 主路线可视化风格

主路线建议采用参考图类似的**流动弧线 / S 型路径 / 多层带状结构**。

## 6.1 路径线条

```css
.route-path {
  stroke: var(--semantic-route);
  stroke-width: 1.8;
  fill: none;
}

.route-path-muted {
  stroke: var(--semantic-route-soft);
  stroke-width: 1;
  fill: none;
}

.route-path-active {
  stroke: var(--semantic-route);
  stroke-width: 2.4;
  fill: none;
}
```

### 规则

- 默认路线细而清晰。
- 推荐路线可以稍粗，但不要发光。
- 辅助路线用浅橙或暖灰。
- 不要使用霓虹效果。

---

## 6.2 多层数据带

参考图中有多条并行弧线。  
在项目中可以映射为：

```txt
最内层：时间
中间层：地点停留区间
主色层：蜜源强度
浅蓝层：天气适配度
外层：风险 / 注释 / 节点
```

### 样式

```css
.data-band {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  opacity: 0.72;
}

.data-band.orange {
  stroke: rgba(216, 140, 82, 0.56);
}

.data-band.blue {
  stroke: rgba(141, 191, 193, 0.52);
}

.data-band.neutral {
  stroke: rgba(200, 184, 166, 0.38);
}
```

---

# 7. 节点风格

节点不要做成厚重按钮，应像参考图中的小圆点、圆环、气泡。

## 7.1 地点节点

```css
.location-node {
  fill: #F9F8F4;
  stroke: var(--semantic-route);
  stroke-width: 1.2;
}

.location-node-core {
  fill: var(--semantic-route);
}

.location-node-muted {
  fill: #F9F8F4;
  stroke: var(--line-normal);
  stroke-width: 1;
}
```

## 7.2 节点大小编码

| 数据 | 编码方式 |
|---|---|
| 蜜源强度 | 圆面积大小 |
| 推荐程度 | 外环完整度 / 外环颜色深浅 |
| 风险 | 红陶色小标记 |
| 天气适宜度 | 节点旁青蓝小点或小条 |

节点可使用圆环，不要使用复杂图标。

---

# 8. 花期与蜜源视觉规则

花期和蜜源使用暖橙系。

```css
.bloom-window {
  fill: rgba(229, 165, 111, 0.28);
  stroke: rgba(216, 140, 82, 0.62);
  stroke-width: 1;
}

.nectar-mark {
  fill: rgba(216, 140, 82, 0.48);
  stroke: rgba(216, 140, 82, 0.86);
  stroke-width: 1;
}
```

### 花期阶段

| 阶段 | 样式 |
|---|---|
| 未开花 | 浅灰虚线 |
| 初花 | 极浅橙 |
| 盛花 | 主橙，透明度更高 |
| 末花 | 浅橙，边缘变淡 |
| 错过花期 | 陶土红虚线边框 |

---

# 9. 天气视觉规则

天气统一使用浅青蓝系。  
不要把天气做成强烈蓝色，应该像参考图里的轻量辅助图层。

```css
.weather-line {
  stroke: var(--semantic-weather);
  stroke-width: 1.3;
  fill: none;
}

.weather-bar {
  fill: rgba(141, 191, 193, 0.46);
}

.weather-grid {
  stroke: rgba(141, 191, 193, 0.28);
  stroke-width: 1;
}
```

### 天气信息编码

| 数据 | 可视化 |
|---|---|
| 温度 | 细折线 |
| 降水 | 小柱状 / 小矩阵 |
| 风速 | 短线 / 箭头 / 轻量流线 |
| 天气适宜度 | 浅青蓝环形刻度 |

---

# 10. 风险视觉规则

风险不要使用刺眼红色。  
统一用柔和陶土红。

```css
.risk-line {
  stroke: var(--semantic-risk);
  stroke-width: 1.4;
  stroke-dasharray: 4 4;
  fill: none;
}

.risk-mark {
  fill: var(--semantic-risk);
  opacity: 0.75;
}
```

风险只在必要时出现，不要让风险色成为主视觉。

---

# 11. 注释与引导线

参考图中有大量说明线和注释。  
项目中可以保留这种编辑感。

```css
.annotation-line {
  stroke: var(--line-normal);
  stroke-width: 1;
  fill: none;
}

.annotation-text {
  font-family: var(--font-family-base);
  font-size: var(--font-body-sm);
  line-height: var(--line-height-normal);
  color: var(--text-secondary);
}
```

### 注释规则

- 注释文字要小。
- 引导线要细。
- 注释应围绕主图分布，不要堆在一起。
- 注释不要用卡片包裹太重。

---

# 12. 小型图表风格

页面中可嵌入小型图表，但它们应该像参考图一样轻。

## 12.1 折线图

```css
.mini-line-chart path {
  stroke: var(--semantic-route);
  stroke-width: 1.2;
  fill: none;
}

.mini-line-chart .grid {
  stroke: var(--line-subtle);
  stroke-width: 1;
}
```

## 12.2 小矩阵图

适合表达每日天气、花期状态、采蜜窗口。

```css
.matrix-cell {
  width: 6px;
  height: 6px;
  rx: 1px;
}

.matrix-cell.orange {
  fill: var(--color-main-2);
}

.matrix-cell.blue {
  fill: var(--color-accent-1);
}

.matrix-cell.empty {
  fill: var(--color-neutral-3);
}
```

## 12.3 气泡图

适合表达地点蜜源强度。

```css
.bubble {
  fill: rgba(229, 165, 111, 0.38);
  stroke: rgba(216, 140, 82, 0.66);
  stroke-width: 1;
}
```

---

# 13. 卡片与浮层

这个风格不适合厚重卡片。  
卡片应该近似纸面上的浅色信息块。

```css
.info-card {
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid var(--line-subtle);
  border-radius: 4px;
  box-shadow: none;
}

.tooltip {
  background: #FBFAF6;
  border: 1px solid var(--line-normal);
  color: var(--text-primary);
  box-shadow: 0 8px 24px rgba(47, 42, 38, 0.08);
}
```

圆角不要太大。  
建议 `4px ~ 8px`，不要使用大圆角玻璃卡片。

---

# 14. 交互状态

交互要轻，不要强动画。

```css
.interactive {
  transition:
    opacity 160ms ease,
    stroke-width 160ms ease,
    transform 160ms ease;
}

.interactive:hover {
  opacity: 1;
}
```

### Hover 规则

| 元素 | Hover 效果 |
|---|---|
| 路径 | 线宽略增加 |
| 节点 | 圆环略放大 |
| 数据带 | 透明度提高 |
| 注释 | 对应数据高亮 |
| 图层 | 非相关数据淡出 |

不要使用发光、弹跳、强缩放。

---

# 15. CSS Design Tokens 汇总

Codex 可以直接建立 `design-tokens.css`：

```css
:root {
  /* Background */
  --bg-page: #F7F6F2;
  --bg-canvas: #F9F8F4;
  --bg-panel: #F3F1EB;
  --bg-soft: #FBFAF6;

  /* Text */
  --text-primary: #2F2A26;
  --text-secondary: #5E5751;
  --text-muted: #8E877F;
  --text-faint: #B5ADA3;

  /* Lines */
  --line-subtle: #E6E1D8;
  --line-normal: #D6D0C7;
  --line-strong: #BEB7AE;
  --line-faint-blue: #CFE3E1;
  --line-faint-orange: #F3DEC2;

  /* Warm palette */
  --color-main-1: #D88C52;
  --color-main-2: #E5A56F;
  --color-main-3: #EFC18F;
  --color-main-4: #F3DEC2;

  /* Cool palette */
  --color-accent-1: #8DBFC1;
  --color-accent-2: #A9D0D0;
  --color-accent-3: #CFE3E1;

  /* Neutral palette */
  --color-neutral-1: #C8B8A6;
  --color-neutral-2: #D9CEC1;
  --color-neutral-3: #EAE3D9;

  /* Status */
  --color-risk: #B96C54;
  --color-warning: #C89A5B;
  --color-good: #8FAE8E;

  /* Semantic */
  --semantic-route: #D88C52;
  --semantic-route-soft: #F3DEC2;
  --semantic-time: #C8B8A6;
  --semantic-location: #2F2A26;
  --semantic-nectar: #D88C52;
  --semantic-bloom: #E5A56F;
  --semantic-bloom-soft: #F3DEC2;
  --semantic-weather: #8DBFC1;
  --semantic-rainfall: #A9D0D0;
  --semantic-weather-soft: #CFE3E1;
  --semantic-risk: #B96C54;
  --semantic-warning: #C89A5B;
  --semantic-positive: #8FAE8E;
  --semantic-muted-data: #D9CEC1;

  /* Typography */
  --font-family-display:
    "Cormorant Garamond",
    "Times New Roman",
    "Source Han Serif SC",
    "Noto Serif SC",
    "Songti SC",
    serif;

  --font-family-base:
    "Inter",
    "Noto Sans SC",
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;

  --font-display-xl: 56px;
  --font-display-lg: 38px;
  --font-display-md: 28px;
  --font-title-lg: 20px;
  --font-title-md: 16px;
  --font-body-md: 13px;
  --font-body-sm: 11px;
  --font-caption: 10px;
  --font-micro: 9px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-display: 0.95;
  --line-height-tight: 1.2;
  --line-height-normal: 1.45;
  --line-height-loose: 1.65;

  --letter-spacing-display: -0.02em;
  --letter-spacing-title: 0;
  --letter-spacing-body: 0;
  --letter-spacing-caption: 0.02em;

  /* Stroke */
  --stroke-hairline: 0.75px;
  --stroke-thin: 1px;
  --stroke-normal: 1.4px;
  --stroke-strong: 2px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-round: 999px;
}
```

---

# 16. 给 Codex 的实现要求

可以直接复制这段：

```txt
请将当前项目的视觉风格调整为浅色编辑型信息图风格，参考我提供的浅色弧线信息图案例。

要求：
1. 不使用深色背景。
2. 页面背景使用暖白纸面色 #F7F6F2 / #F9F8F4。
3. 整体保持高留白、细线条、低饱和、纸面印刷感。
4. 主视觉颜色使用暖橙系 #D88C52 / #E5A56F / #F3DEC2。
5. 辅助信息使用浅青蓝 #8DBFC1 / #A9D0D0 / #CFE3E1。
6. 风险色使用柔和陶土红 #B96C54，不要使用鲜红。
7. 文字不要用纯黑，主文字使用 #2F2A26。
8. 大标题使用衬线字体，正文、图例、注释使用无衬线字体。
9. 路径、时间轴、花期、天气等信息尽量使用弧线、多层带状线、小圆点、圆环、注释引导线来表达。
10. 图表风格要像报刊信息图，而不是后台 dashboard。
11. 卡片边框和阴影要非常轻，避免玻璃拟态、霓虹、厚重阴影。
12. 所有数字启用 tabular-nums。
13. hover 交互只做轻微线宽变化、透明度变化和节点放大，不要强动画。
```

---

# 17. 最终效果判断标准

完成后用这几个标准检查：

```txt
1. 第一眼是否像一张精细的浅色信息图，而不是深色 dashboard？
2. 主路线是否有弧线 / 流动感 / 时间叙事感？
3. 色彩是否以暖橙为主，浅青蓝为辅？
4. 文字是否有“衬线标题 + 无衬线说明”的编辑感？
5. 线条是否足够细，留白是否足够多？
6. 小图表是否轻盈，而不是厚重组件？
7. 风险和天气是否只是辅助层，不抢主视觉？
8. 整体是否有纸面年鉴、报刊专题、数据海报的气质？
```

---

## 核心总结

这套风格的核心方向是：

**用浅色纸面承载复杂数据，用暖橙讲追花主线，用浅青蓝讲天气辅助，用衬线标题建立编辑型信息图气质。**
