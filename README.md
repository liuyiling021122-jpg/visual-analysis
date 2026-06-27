# 追花为生可视分析系统

**追花为生：中国流动养蜂人的迁徙、授粉与生计风险可视分析系统**

本系统通过交互式可视化探索中国流动养蜂人的迁徙路线、花期节律与生计风险之间的关联模式。

---

## 环境依赖

- **浏览器**：建议使用最新版 Chrome、Edge、Safari 或 Firefox。
- **本地预览**：需要 Node.js 18 或更高版本，用于启动静态文件服务器。
- **运行方式**：本项目不需要安装 npm 依赖，也不需要构建步骤。

> 页面通过 `fetch()` 读取 CSV、JSON、SVG 和 HTML 组件，因此不建议直接双击打开 `index.html`。直接用 `file://` 打开时，浏览器可能会拦截本地数据请求。

## 启动命令

在仓库根目录运行：

```bash
node server.mjs
```

默认端口是 `4173`，启动后访问：

```
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

## 数据加载方式

数据入口集中在 `js/data-loader.js` 中，页面通过浏览器 `fetch()` 加载本地静态文件：

- **CSV 数据**：`project_reference/data/养蜂数据/datasets/`
- **派生数据**：`project_reference/data/derived/`
- **中国边界数据**：`project_reference/data/china_l7_boundary_2025.json`
- **蜜源地点坐标**：`project_reference/data/derived/nectar_location_centers.json`

主视图中的逐日 NWI、路线段摘要、四条路线数据、右侧生计风险面板数据，都从这些 CSV/JSON 文件读取。数据文件需要和 `index.html` 保持相对路径不变，否则页面会出现加载失败。

## 素材加载方式

- 页面样式：`css/`
- 页面脚本：`js/`
- HTML 组件片段：`components/`
- 路线 SVG、花期图层、组合路线底图：`assets/flowering-rhythm/`
- 蜜源图标：`assets/nectar/`

`components/` 中的面板片段由 `js/component-loader.js` 动态加载；路线 SVG 和蜜源图标由 `js/flowering-rhythm.js` 按当前路线和交互状态加载。

## GitHub Pages

本系统使用相对路径引用资源，适合放在 GitHub Pages 这类静态托管环境中运行。仓库根目录的 `index.html` 会自动跳转到 `zhuihua-demo/`。

如果单独部署 `zhuihua-demo/` 文件夹，需要保留以下目录结构：

```
index.html
server.mjs
css/
js/
components/
assets/
project_reference/data/
```

GitHub Pages 不会使用 `server.mjs`，它只在本地预览时需要。

## GitHub 仓库与提交记录

项目代码仓库：
https://github.com/liuyiling021122-jpg/visual-analysis

Git 提交记录可在仓库的 Commits 页面查看：
https://github.com/liuyiling021122-jpg/visual-analysis/commits/main

## Case Study

`case-study/case1.md` 中记录了通过本系统发现的数据模式与分析案例。

## 主要维护文件

| 文件 | 说明 |
|------|------|
| `index.html` | 页面结构 |
| `css/flowering-rhythm.css` | 主视图样式 |
| `js/flowering-rhythm.js` | 主视图交互与路线切换 |
| `js/data-loader.js` | 数据入口 |
| `components/route-map-panel.html` + `js/route-map-panel.js` | 左侧路线图面板 |
| `components/livelihood-risk-panel.html` + `js/livelihood-risk-panel.js` | 右侧生计风险面板 |
| `server.mjs` | 本地静态服务 |

## 文件版本说明

- `index.html`：当前主要维护版本，依赖同级目录下的 CSS、JS、组件、素材和数据文件。
- `zhuihua-demo/`：可独立部署的 demo 副本，用于 GitHub Pages 发布。
- `index.standalone.html`：旧的单文件备份版，适合临时离线展示。
