# 追花为生 demo 文件结构

这个文件夹现在保留两种版本：

- `index.html`：主要维护版本，依赖旁边的 `css/`、`js/`、`components/`、`assets/`、`project_reference/data/`。
- `index.standalone.html`：旧的单文件备份版，CSS、JS、数据和部分资源都内联在一个 HTML 里，适合临时离线展示，不建议继续在这里改版面。

## 日常修改入口

- 页面结构：`index.html`
- 主视图样式：`css/flowering-rhythm.css`
- 主视图交互与路线切换：`js/flowering-rhythm.js`
- 左侧路线图：`components/route-map-panel.html`、`js/route-map-panel.js`
- 右侧风险面板：`components/livelihood-risk-panel.html`、`js/livelihood-risk-panel.js`
- SVG 与图片素材：`assets/`
- 数据文件：`project_reference/data/`

## 本地预览

因为页面会读取 CSV、JSON、SVG 和 HTML 组件，建议用本地服务打开：

```bash
node server.mjs
```

然后访问：

```
http://localhost:4173
```

