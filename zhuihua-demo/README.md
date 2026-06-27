# 追花为生 demo

这是“追花为生：中国流动养蜂人的迁徙、授粉与生计风险可视分析系统”的可独立运行 demo 文件夹。仓库中的最终展示版本统一放在 `zhuihua-demo/`。如果单独部署这个 demo，请上传整个 `zhuihua-demo` 文件夹中的内容，而不是只上传单个 `index.html`。

## 环境依赖

- 浏览器：建议使用最新版 Chrome、Edge、Safari 或 Firefox。
- 本地预览：需要 Node.js 18 或更高版本，用于启动静态文件服务器。
- 运行方式：项目不需要安装 npm 依赖，也不需要构建步骤。

页面会通过 `fetch()` 读取 CSV、JSON、SVG 和 HTML 组件，因此不建议直接双击打开 `index.html`。直接用 `file://` 打开时，浏览器可能会拦截本地数据请求。

## 启动命令

在当前 demo 文件夹中运行：

```bash
node server.mjs
```

默认端口是 `4173`，启动后访问：

```text
http://localhost:4173
```

如果需要改端口，可以设置 `PORT` 环境变量：

```bash
PORT=8080 node server.mjs
```

Windows PowerShell 可以使用：

```powershell
$env:PORT=8080; node server.mjs
```

## GitHub Pages

这个 demo 使用相对路径引用资源，适合放在 GitHub Pages 这类静态托管环境中运行。当前仓库根目录的 `index.html` 会自动跳转到 `zhuihua-demo/`。如果单独部署本文件夹，需要保留以下目录结构：

```text
index.html
server.mjs
css/
js/
components/
assets/
project_reference/data/
```

GitHub Pages 不会使用 `server.mjs`，它只在本地预览时需要。

## 数据加载方式

数据入口集中在 `js/data-loader.js` 中，页面通过浏览器 `fetch()` 加载本地静态文件：

- CSV 数据：`project_reference/data/养蜂数据/datasets/`
- 派生数据：`project_reference/data/derived/`
- 中国边界数据：`project_reference/data/china_l7_boundary_2025.json`
- 省份蜜源分布：`project_reference/data/养蜂数据/datasets/province_nectar_distribution.csv`
- 蜜源地点坐标：`project_reference/data/derived/nectar_location_centers.json`

主视图中的逐日 NWI、路线段摘要、四条路线数据、右侧生计风险面板数据，都从这些 CSV/JSON 文件读取。数据文件需要和 `index.html` 保持相对路径不变，否则页面会出现加载失败。

## 素材加载方式

- 页面样式：`css/`
- 页面脚本：`js/`
- HTML 组件片段：`components/`
- 路线 SVG、花期图层、组合路线底图：`assets/flowering-rhythm/`
- 蜜源图标：`assets/nectar/`

`components/` 中的面板片段由 `js/component-loader.js` 动态加载；路线 SVG 和蜜源图标由 `js/flowering-rhythm.js` 按当前路线和交互状态加载。

## 主要维护入口

- 页面结构：`index.html`
- 主视图样式：`css/flowering-rhythm.css`
- 主视图交互与路线切换：`js/flowering-rhythm.js`
- 左侧路线图：`components/route-map-panel.html`、`js/route-map-panel.js`
- 右侧风险面板：`components/livelihood-risk-panel.html`、`js/livelihood-risk-panel.js`
- 静态服务：`server.mjs`

## 文件版本说明

- `index.html`：当前主要维护版本，依赖同级目录下的 CSS、JS、组件、素材和数据文件。
- `index.standalone.html`：旧的单文件备份版，适合临时离线展示，不建议继续在这里改版面。
