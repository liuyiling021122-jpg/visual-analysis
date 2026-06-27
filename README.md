# 追花为生可视分析系统

这个仓库包含“追花为生：中国流动养蜂人的迁徙、授粉与生计风险可视分析系统”的最终 demo，以及项目过程中的参考资料和旧版预览文件。

## 最终 demo 入口

最终可展示版本统一放在：

```text
zhuihua-demo/
```

仓库根目录的 `index.html` 只作为 GitHub Pages 跳转入口，会自动打开：

```text
./zhuihua-demo/
```

这样仓库根链接仍然可以访问 demo，同时最终 demo 的 CSS、JS、组件、素材和数据都集中在一个英文目录中，便于 GitHub Pages 部署和后续维护。

## 本地预览

可以在仓库根目录运行：

```bash
node server.mjs
```

然后访问：

```text
http://localhost:4173
```

也可以进入 demo 文件夹单独运行：

```bash
cd zhuihua-demo
node server.mjs
```

## GitHub Pages

如果 GitHub Pages 使用 `main` 分支根目录作为发布源，根目录 `index.html` 会自动跳转到 `zhuihua-demo/`，因此原始 Pages 链接仍然可用。

不要只上传 `zhuihua-demo/index.html`，demo 还依赖同目录下的：

```text
css/
js/
components/
assets/
project_reference/data/
```

## 主要维护文件

- demo 页面结构：`zhuihua-demo/index.html`
- demo 主视图样式：`zhuihua-demo/css/flowering-rhythm.css`
- demo 主视图交互：`zhuihua-demo/js/flowering-rhythm.js`
- demo 数据入口：`zhuihua-demo/js/data-loader.js`
- demo 本地服务：`zhuihua-demo/server.mjs`

根目录中其他旧版 HTML、参考资料和项目过程文件暂时保留，避免误删历史资料。
