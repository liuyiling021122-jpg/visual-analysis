import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, '追花为生demo');
const outputFile = path.join(outputDir, 'index.html');

const cssFiles = [
  'css/design-tokens.css',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/visualization-placeholders.css',
  'css/flowering-rhythm.css',
];

const componentFiles = {
  'route-map-panel': 'components/route-map-panel.html',
  'livelihood-risk-panel': 'components/livelihood-risk-panel.html',
  'tooltip-layer': 'components/tooltip-layer.html',
};

const resourceFiles = [
  'project_reference/data/china_l7_boundary_2025.json',
  'project_reference/data/derived/route_segment_summary.csv',
  'project_reference/data/养蜂数据/datasets/data_migration_routes_detailed.csv',
  'project_reference/data/养蜂数据/datasets/weather_daily_migration_routes.csv',
  'project_reference/data/养蜂数据/datasets/beekeeper_profit_by_mode.csv',
  'project_reference/data/养蜂数据/datasets/beekeeper_finance_detail.csv',
  'project_reference/data/养蜂数据/datasets/bee_product_national_annual.csv',
  'project_reference/data/养蜂数据/datasets/pesticide_use_2000_2023.csv',
  'project_reference/data/养蜂数据/datasets/climate_factors_province_2000_2023.csv',
  'project_reference/data/养蜂数据/datasets/beekeeper_province_annual_series.csv',
  'assets/flowering-rhythm/L0-base.svg',
  'assets/flowering-rhythm/L4-flowering.svg',
  ...Array.from({ length: 9 }, (_, index) => `assets/flowering-rhythm/east-line-${index}.svg`),
  'assets/flowering-rhythm/routes/west/L0.svg',
  'assets/flowering-rhythm/routes/west/L4.svg',
  ...Array.from({ length: 7 }, (_, index) => `assets/flowering-rhythm/routes/west/line-${index}.svg`),
  'assets/flowering-rhythm/routes/south/L0.svg',
  'assets/flowering-rhythm/routes/south/L4.svg',
  ...Array.from({ length: 6 }, (_, index) => `assets/flowering-rhythm/routes/south/line-${index}.svg`),
];

const moduleFiles = {
  state: 'js/state.js',
  dataLoader: 'js/data-loader.js',
  routeMap: 'js/route-map-panel.js',
  livelihoodRisk: 'js/livelihood-risk-panel.js',
  floweringRhythm: 'js/flowering-rhythm.js',
};

function normalizePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

async function readText(relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[^;]+;\s*$/gm, '')
    .replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/g, '');
}

function wrapModule(name, imports, source, exportedNames) {
  return `
/* --------------------------------------------------------------------------
 * ${name}
 * -------------------------------------------------------------------------- */
const ${name} = (() => {
${imports}
${stripModuleSyntax(source)}
return { ${exportedNames.join(', ')} };
})();`;
}

function replaceComponentSlot(html, slotName, componentHtml) {
  const pattern = new RegExp(`<([a-z]+)([^>]*data-component-slot=["']${slotName}["'][^>]*)>\\s*</\\1>`, 'i');
  return html.replace(
    pattern,
    `<!-- COMPONENT: ${slotName} -->\n<$1$2>\n${componentHtml.trim()}\n</$1>`,
  );
}

function scriptSafe(source) {
  return source.replaceAll('</script', '<\\/script');
}

async function build() {
  let html = await readText('flowering-rhythm.html');
  html = html.replace('<title>花期节律主视图 | 追花为生</title>', '<title>追花为生 Demo</title>');

  const cssGroups = await Promise.all(cssFiles.map(async (file) => {
    const css = await readText(file);
    return `/* ===== ${file} ===== */\n${css.trim()}`;
  }));
  html = html.replace(/\s*<link rel="stylesheet" href="css\/[^"]+" \/>/g, '');
  html = html.replace('</head>', `
    <!-- ====================================================================== -->
    <!-- 01. STYLES                                                            -->
    <!-- ====================================================================== -->
    <style id="demo-styles">
${cssGroups.join('\n\n')}
    </style>
  </head>`);

  for (const [slotName, file] of Object.entries(componentFiles)) {
    let componentHtml = await readText(file);
    if (slotName === 'route-map-panel') {
      componentHtml = componentHtml.replace(
        /\s*<div class="extended-route-list" data-extended-route-list>\s*<div class="panel-loading">[\s\S]*?<\/div>\s*<\/div>/,
        '',
      );
    }
    html = replaceComponentSlot(html, slotName, componentHtml);
  }

  const l0Svg = await fs.readFile(path.join(root, 'assets/flowering-rhythm/L0-base.svg'));
  const l0DataUrl = `data:image/svg+xml;base64,${l0Svg.toString('base64')}`;
  html = html.replace('src="assets/flowering-rhythm/L0-base.svg"', `src="${l0DataUrl}"`);
  html = html.replace(/\s*<script type="module" src="js\/flowering-rhythm\.js"><\/script>/, '');

  const embeddedResources = {};
  for (const relativePath of resourceFiles) {
    const buffer = await fs.readFile(path.join(root, relativePath));
    embeddedResources[normalizePath(relativePath)] = buffer.toString('base64');
  }

  const resourceBootstrap = `
/* --------------------------------------------------------------------------
 * Embedded data and vector assets
 * -------------------------------------------------------------------------- */
const __DEMO_RESOURCE_BASE64 = ${JSON.stringify(embeddedResources)};
const __DEMO_MIME_TYPES = {
  '.csv': 'text/csv;charset=utf-8',
  '.json': 'application/json;charset=utf-8',
  '.svg': 'image/svg+xml;charset=utf-8',
};
const __decodeBase64 = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};
const __resourceMimeType = (resourcePath) => {
  const extension = Object.keys(__DEMO_MIME_TYPES).find((item) => resourcePath.endsWith(item));
  return __DEMO_MIME_TYPES[extension] || 'application/octet-stream';
};
window.__DEMO_ASSET_URLS = Object.fromEntries(
  Object.entries(__DEMO_RESOURCE_BASE64)
    .filter(([resourcePath]) => resourcePath.endsWith('.svg'))
    .map(([resourcePath, value]) => [
      resourcePath,
      URL.createObjectURL(new Blob([__decodeBase64(value)], { type: __resourceMimeType(resourcePath) })),
    ]),
);
const __nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const rawUrl = typeof input === 'string' ? input : input.url;
  let resourcePath = rawUrl;
  try {
    const parsed = new URL(rawUrl, window.location.href);
    resourcePath = decodeURIComponent(parsed.pathname).replace(/^\\/+/, '');
  } catch {
    resourcePath = String(rawUrl);
    if (resourcePath.startsWith('./')) resourcePath = resourcePath.slice(2);
  }
  const knownSuffix = Object.keys(__DEMO_RESOURCE_BASE64).find((candidate) => resourcePath.endsWith(candidate));
  if (knownSuffix) {
    return new Response(__decodeBase64(__DEMO_RESOURCE_BASE64[knownSuffix]), {
      status: 200,
      headers: { 'Content-Type': __resourceMimeType(knownSuffix) },
    });
  }
  return __nativeFetch(input, init);
};`;

  const stateSource = await readText(moduleFiles.state);
  const dataLoaderSource = await readText(moduleFiles.dataLoader);
  const routeMapSource = await readText(moduleFiles.routeMap);
  const livelihoodSource = await readText(moduleFiles.livelihoodRisk);
  let floweringSource = await readText(moduleFiles.floweringRhythm);
  floweringSource = floweringSource.replace(
    'href="assets/flowering-rhythm/east-line-${index}.svg"',
    'href="${window.__DEMO_ASSET_URLS[`assets/flowering-rhythm/east-line-${index}.svg`]}"',
  );

  const applicationSource = [
    resourceBootstrap,
    wrapModule('__state', '', stateSource, [
      'appState', 'subscribe', 'updateState', 'toggleLayer', 'setSelectedMonthWindow', 'setSelectedNode', 'setSelectedRoute',
    ]),
    wrapModule('__dataLoader', '', dataLoaderSource, [
      'dataFiles', 'loadCsv', 'loadJson', 'loadLivelihoodData', 'loadMigrationRoutes', 'loadRouteRhythmData',
    ]),
    `
/* --------------------------------------------------------------------------
 * Component loader (components are already embedded above)
 * -------------------------------------------------------------------------- */
const __componentLoader = { loadComponents: async () => {} };`,
    wrapModule(
      '__routeMap',
      `const { dataFiles, loadCsv, loadJson } = __dataLoader;\nconst { appState, setSelectedRoute, subscribe } = __state;`,
      routeMapSource,
      ['initRouteMapPanel'],
    ),
    wrapModule(
      '__livelihoodRisk',
      `const { appState, setSelectedNode, subscribe, updateState } = __state;\nconst { loadLivelihoodData } = __dataLoader;`,
      livelihoodSource,
      ['initLivelihoodRiskPanel'],
    ),
    wrapModule(
      '__floweringRhythm',
      `const { loadComponents } = __componentLoader;\nconst { initRouteMapPanel } = __routeMap;\nconst { initLivelihoodRiskPanel } = __livelihoodRisk;\nconst { appState, setSelectedNode, subscribe } = __state;\nconst { dataFiles, loadCsv } = __dataLoader;`,
      floweringSource,
      [],
    ),
  ].join('\n\n');

  // Fail the build immediately if the generated inline application is not valid JavaScript.
  new Function(applicationSource);

  html = html.replace('</body>', `
    <!-- ====================================================================== -->
    <!-- 03. EMBEDDED DATA + 04. APPLICATION SCRIPTS                           -->
    <!-- ====================================================================== -->
    <script id="demo-application">
${scriptSafe(applicationSource)}
    </script>
  </body>`);

  html = html.replace('<main class="app-grid', '<!-- 02. EMBEDDED COMPONENT MARKUP -->\n      <main class="app-grid');
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, html, 'utf8');
  const stats = await fs.stat(outputFile);
  console.log(`Built ${outputFile}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

await build();
