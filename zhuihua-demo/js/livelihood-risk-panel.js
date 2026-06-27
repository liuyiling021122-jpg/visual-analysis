import { appState, setSelectedNode, subscribe, updateState } from './state.js';
import { loadLivelihoodData } from './data-loader.js';

const routeLabels = {
  'east-coastal': '东线（沿海线）',
  'west-northwest': '西线（西北线）',
  'central-route': '中线（京广线）',
  'south-route': '南线',
};

const routeShortLabels = {
  'east-coastal': '东线',
  'west-northwest': '西线',
  'central-route': '中线',
  'south-route': '南线',
};

const modeSeries = [
  { key: 'intensive_migratory_profit_per_colony', termKey: 'intensive_migratory', label: '大转地', color: 'var(--semantic-route)' },
  { key: 'semi_migratory_profit_per_colony', termKey: 'semi_migratory', label: '小转地', color: 'var(--semantic-weather)' },
  { key: 'stationary_italian_profit_per_colony', termKey: 'stationary_italian', label: '定地意蜂', color: 'var(--semantic-warning)' },
  { key: 'stationary_chinese_profit_per_colony', termKey: 'stationary_chinese', label: '定地中蜂', color: 'var(--semantic-positive)' },
];

const nationalMetrics = [
  { key: 'cost_income_ratio_pct', label: '成本收入比', color: 'var(--semantic-risk)', reading: '越高成本压力越大' },
  { key: 'colony_winter_loss_pct', label: '越冬损失率', color: 'var(--semantic-warning)', reading: '越高生产风险越大' },
  { key: 'profit_margin_pct', label: '利润率', color: 'var(--semantic-positive)', reading: '越高经济韧性越强' },
  { key: 'pollination_share_pct', label: '授粉收入占比', color: 'var(--semantic-weather)', reading: '越高收入越多元' },
];

const industryMetrics = [
  { key: 'bee_colonies', label: '国内蜂群', color: 'var(--semantic-route)', factor: 0.0001, unit: '万群', decimals: 1, domain: [800, 1000], reading: '产业规模' },
  { key: 'honey_production_tonnes', label: '蜂蜜产量', color: 'var(--semantic-warning)', factor: 0.0001, unit: '万吨', decimals: 1, domain: [20, 60], reading: '供给规模' },
  { key: 'export_share_pct', label: '出口占比', color: 'var(--semantic-risk)', factor: 1, unit: '%', decimals: 1, domain: [25, 55], reading: '外需依赖' },
  { key: 'consumption_per_capita_grams', label: '人均消费量', color: 'var(--semantic-positive)', factor: 1, unit: '克/年', decimals: 1, domain: [100, 300], reading: '内需水平' },
];

const nectarImageAssets = [
  { label: '荔枝', src: 'assets/nectar/lychee.png', keywords: ['荔枝', '龙眼'] },
  { label: '油菜', src: 'assets/nectar/rapeseed.png', keywords: ['油菜', '油菜花', '早油菜', '甘蓝型油菜'] },
  { label: '刺槐', src: 'assets/nectar/ci-huai.png', keywords: ['刺槐', '槐花', '洋槐'] },
  { label: '紫云英', src: 'assets/nectar/milk-vetch.png', keywords: ['紫云英'] },
  { label: '荆条', src: 'assets/nectar/vitex.png', keywords: ['荆条'] },
  { label: '枣花', src: 'assets/nectar/jujube.png', keywords: ['枣花', '枣树'] },
  { label: '芝麻', src: 'assets/nectar/sesame.png', keywords: ['芝麻'] },
  { label: '棉花', src: 'assets/nectar/cotton.png', keywords: ['棉花'] },
  { label: '椴树', src: 'assets/nectar/basswood.png', keywords: ['椴树'] },
  { label: '胡枝子', src: 'assets/nectar/lespedeza.png', keywords: ['胡枝子'] },
  { label: '向日葵', src: 'assets/nectar/sunflower.png', keywords: ['向日葵', '葵花'] },
  { label: '荞麦', src: 'assets/nectar/buckwheat.png', keywords: ['荞麦'] },
  { label: '老瓜头', src: 'assets/nectar/old-gua-tou.png', keywords: ['老瓜头', '老头瓜'] },
];

const termDefinitions = {
  category_route: '汇总迁徙沿途的气候生产风险及其对采蜜窗口、单箱产出和经营稳定性的影响；具体天气过程在中央主视图查看。',
  category_livelihood: '汇总全国蜂农经营压力、生计韧性、养殖模式利润及收支结构，属于蜂农直接经营层。',
  category_market: '描述全国蜂业供给规模、国内外市场需求和外部环境，是解释经营变化的行业背景层。',
  subtab_resilience: '查看全国蜂农成本压力、生产风险、利润率与收入多元化的年度变化。',
  subtab_profit: '查看四种养殖模式的全国参考单箱利润及最新年份横向对比，不代表当前路线或个案实测值。',
  subtab_finance: '查看蜂农成本投入项目和蜂蜜、授粉等收入来源的构成。',
  subtab_industry_market: '查看全国蜂群、蜂蜜产量、出口占比和人均消费量的年度变化。',
  subtab_external_environment: '查看农药使用强度等外部环境参考，以及相关数据边界说明。',
  national_metric_scope: '成本收入比：越高表示成本压力越大。\n越冬损失率：越高表示生产风险越大。\n利润率：越高表示经济韧性越强。\n授粉收入占比：反映收入来源多元化。\n时间范围：2005–2025；2024/2025 为行业预估。该序列包含调查基准上的推估，不能解释为全国逐户普查结果。',
  route_risk: '综合所选路线的路段数量、里程、平均采蜜率与气候生产风险指数，解释沿途生产暴露及其经营含义。',
  route_risk_matrix: '按路线和代表年代汇总气候风险指数。颜色越深表示天气窗口越不稳定，用于路线间比较。',
  cost_income_ratio_pct: '总成本 ÷ 总收入 × 100%。数值越高，说明收入中用于覆盖成本的比例越大，因此归入经营压力。',
  colony_winter_loss_pct: '越冬期间损失蜂群数占越冬前蜂群数的比例。它直接影响来年生产能力，因此归入生产风险。',
  profit_margin_pct: '（总收入 − 总成本）÷ 总收入 × 100%。用于衡量蜂农最终盈利能力和经济韧性。',
  pollination_share_pct: '授粉服务收入 ÷ 总收入 × 100%。占比提高表示收入来源更为多元，因此归入生计韧性。',
  bee_colonies: '全国在养蜂群总量，以万群表示。它反映产业生产基础，因此归入蜂业规模与供给。',
  honey_production_tonnes: '全国年度蜂蜜产量，以万吨表示。它反映蜂业供给规模，不等同于蜂农实际收入。',
  export_share_pct: '蜂蜜出口量 ÷ 全国蜂蜜产量 × 100%。它衡量产业对外部市场的依赖，因此归入市场环境。',
  consumption_per_capita_grams: '国内蜂蜜消费量 ÷ 全国人口，并换算为克/人/年。它反映国内需求水平，因此归入市场环境。',
  mode_profit: '不同养殖模式的年度单箱利润，单位为元/箱。用于比较迁徙强度和蜂种差异带来的经营回报。',
  latest_mode_comparison: '取最新可用年份的全国模式参考值比较四种养殖模式，不代表当前路线或个案实测利润。',
  intensive_migratory: '大范围跨省追逐花期的转地养蜂模式。此处利润为全国模式参考，不是当前路线实测值。',
  semi_migratory: '在较小区域内随花期移动的养蜂模式，运输强度和蜜源覆盖通常介于大转地与定地之间。',
  stationary_italian: '以意大利蜂为主、固定地点饲养的模式，减少长距离运输，但更依赖当地蜜源条件。',
  stationary_chinese: '以中华蜜蜂为主、固定地点饲养的模式，适应本地环境，经营规模和产品结构与意蜂不同。',
  business_structure: '把经营收益拆为成本投入和收入来源，用于解释利润变化由哪些投入或收入项目推动。',
  cost_structure: '展示各项投入占总成本的比例，包括饲喂、运输、蜂药、设备、蜂王和其他成本。',
  income_structure: '展示蜂蜜、蜂产品、授粉服务等收入占总收入的比例，用于判断收入来源是否多元。',
  feed_cost: '饲喂成本由糖料和花粉饲料投入构成，是维持蜂群繁殖与非蜜源期生存的直接投入。',
  transport_cost: '运输成本包括燃油、路桥、车辆维护和运输人工，是转地养蜂的重要经营投入。',
  medicine_cost: '用于蜂病虫害预防与治疗的投入，属于生产保障成本。',
  equipment_cost: '蜂箱、取蜜及养蜂工具等设备投入，属于经营所需的生产资料成本。',
  queen_cost: '蜂王购买或培育投入，用于维持蜂群繁殖力与生产性能。',
  other_cost: '未归入饲喂、运输、蜂药、设备和蜂王的其他经营支出。',
  honey_income: '蜂蜜销售收入，是当前蜂农经营收入的主要来源。',
  royal_jelly_income: '蜂王浆销售收入，属于蜂产品多元化收入。',
  pollen_income: '蜂花粉销售收入，属于蜂产品多元化收入。',
  propolis_income: '蜂胶销售收入，属于蜂产品多元化收入。',
  pollination_income: '为农业生产提供授粉服务获得的收入，可降低对蜂蜜价格和产量的单一依赖。',
  other_income: '蜂蜡、蜂群销售及其他未单列收入的合计。',
  pesticide_intensity: '单位面积农药使用量，以 kg/ha 表示。它是全国外部环境参考，不代表具体路线或蜂场暴露。',
  data_boundary: '说明数据的空间尺度、调查口径和估算年份，避免把全国或案例数据误读为单条路线的精确结果。',
};

const nationalAnalyzerState = {
  view: 'trend',
  grain: 'nodes',
  start: 2005,
  end: 2025,
  focus: 2025,
  playing: false,
};

const industryTrendState = {
  grain: 'annual',
  start: 2005,
  end: 2025,
  focus: 2025,
  playing: false,
};

let tooltipInitialized = false;
let livelihoodData = null;
let nationalPlaybackTimer = null;
let industryPlaybackTimer = null;

export function initLivelihoodRiskPanel() {
  setupRiskTabs();
  setupLivelihoodSubtabs();
  setupIndustrySubtabs();
  subscribe((state) => {
    updateStatusBar(state);
    if (livelihoodData) renderStatefulPanels(state, livelihoodData);
  });
  updateStatusBar(appState);
  renderLivelihoodPanel().catch(showPanelError);
}

function setupRiskTabs() {
  const tabButtons = document.querySelectorAll('[data-risk-tab]');
  const tabPanels = document.querySelectorAll('[data-risk-tab-panel]');
  if (!tabButtons.length || !tabPanels.length) return;

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.riskTab;
      tabButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      tabPanels.forEach((panel) => {
        const active = panel.dataset.riskTabPanel === target;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
    });
  });
}

function setupLivelihoodSubtabs() {
  const buttons = document.querySelectorAll('[data-livelihood-subtab]');
  const panels = document.querySelectorAll('[data-livelihood-subtab-panel]');
  if (!buttons.length || !panels.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.livelihoodSubtab;
      buttons.forEach((item) => item.classList.toggle('is-active', item === button));
      panels.forEach((panel) => {
        const active = panel.dataset.livelihoodSubtabPanel === target;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
      const scrollContainer = document.querySelector('.risk-tab-shell');
      if (scrollContainer) scrollContainer.scrollTop = 0;
    });
  });
}

function setupIndustrySubtabs() {
  const buttons = document.querySelectorAll('[data-industry-subtab]');
  const panels = document.querySelectorAll('[data-industry-subtab-panel]');
  if (!buttons.length || !panels.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.industrySubtab;
      buttons.forEach((item) => item.classList.toggle('is-active', item === button));
      panels.forEach((panel) => {
        const active = panel.dataset.industrySubtabPanel === target;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
      const scrollContainer = document.querySelector('.risk-tab-shell');
      if (scrollContainer) scrollContainer.scrollTop = 0;
    });
  });
}

function updateStatusBar(state) {
  const routeLabel = state.selectedRoutes.map((routeId) => routeLabels[routeId] || routeId).join(' / ');
  const routeTarget = document.querySelector('[data-status-route]');
  const eraTarget = document.querySelector('[data-status-era]');

  if (routeTarget) {
    routeTarget.textContent = routeLabel || '未选择';
  }

  if (eraTarget) {
    eraTarget.textContent = `${state.selectedEra} · ${monthWindowLabel(state.selectedMonthWindow)}`;
  }
}

async function renderLivelihoodPanel() {
  livelihoodData = await loadLivelihoodData();
  const latestFinance = getLatestByYear(livelihoodData.finance);

  renderIndustryTrends(livelihoodData.beeProductAnnual);
  renderNationalRiskTrends(livelihoodData.finance);
  renderProfitTrend(livelihoodData.profitByMode, appState);
  renderCostStructure(latestFinance);
  renderIncomeComposition(latestFinance);
  renderFinanceStructureInsight(latestFinance);
  renderPesticideReference(livelihoodData.pesticide);
  renderStatefulPanels(appState, livelihoodData);
  renderRiskCaveats();
  setupDataTooltips();
}

function renderStatefulPanels(state, data) {
  const latestProfit = getLatestByYear(data.profitByMode);
  renderModeComparison(latestProfit, state);
  renderRouteRiskTabs(state);
  renderRouteRiskFocus(state, data);
  renderRouteRiskChain(data.routeSegmentSummary, state);
}

function resolveActiveRiskRouteId(state) {
  const available = Object.keys(routeLabels).filter((routeId) => state.selectedRoutes.includes(routeId));
  return available.includes(state.activeRiskRoute) ? state.activeRiskRoute : available[0] || null;
}

function renderRouteRiskTabs(state) {
  const list = document.querySelector('[data-route-risk-route-list]');
  if (!list) return;

  const activeRouteId = resolveActiveRiskRouteId(state);
  const selectedRouteIds = Object.keys(routeLabels).filter((routeId) => state.selectedRoutes.includes(routeId));
  list.innerHTML = selectedRouteIds.map((routeId) => `
    <button type="button" class="${routeId === activeRouteId ? 'is-active' : ''}" data-route-risk-route="${routeId}"
      aria-pressed="${routeId === activeRouteId}" aria-label="切换至${escapeAttribute(routeLabels[routeId])}风险解释">${routeShortLabels[routeId]}</button>
  `).join('');

  list.querySelectorAll('[data-route-risk-route]').forEach((button) => {
    button.addEventListener('click', () => {
      const routeId = button.dataset.routeRiskRoute;
      if (!routeId || routeId === activeRouteId) return;
      updateState({ activeRiskRoute: routeId, selectedNode: null, selectedNodeSummary: null });
    });
  });
}

function renderNationalRiskTrends(rows) {
  const container = document.querySelector('[data-national-risk-trends]');
  if (!container) return;

  const displayRows = getNationalDisplayRows(rows);
  nationalAnalyzerState.view = 'trend';

  container.innerHTML = `
    <div class="national-analyzer-controls">
      ${segmentedControl('national-grain', [
        ['annual', '年度'],
        ['nodes', '五年节点'],
        ['average', '五年均值'],
      ], nationalAnalyzerState.grain)}
      <label class="national-range-control"><span>时间范围</span><span><select data-national-start>${yearOptions(rows, nationalAnalyzerState.start)}</select><select data-national-end>${yearOptions(rows, nationalAnalyzerState.end)}</select></span></label>
      <button class="national-play${nationalAnalyzerState.playing ? ' is-playing' : ''}" type="button" data-national-play>${nationalAnalyzerState.playing ? '❚❚ 暂停' : '▶ 播放'}</button>
    </div>
    <div class="industry-trend-reading national-trend-reading"><strong data-national-focus-year>${nationalAnalyzerState.focus} 年</strong><span>移动任意图表，四项指标同步读取</span></div>
    <header class="national-viz-heading"><div><strong>四指标同步趋势</strong><span>移动任意图表上的指针，四项指标同步读取同一时间。</span></div><button type="button" class="national-notes-trigger" data-term-key="national_metric_scope">指标与数据口径</button></header>
    <div data-national-viz>${renderNationalAnalyzerViz(displayRows)}</div>
    <div class="national-analyzer-conclusion" data-national-conclusion></div>
  `;

  container.querySelectorAll('[data-national-grain] button').forEach((button) => {
    button.addEventListener('click', () => {
      stopNationalPlayback();
      nationalAnalyzerState.grain = button.dataset.value;
      nationalAnalyzerState.focus = nationalAnalyzerState.end;
      renderNationalRiskTrends(rows);
    });
  });

  container.querySelector('[data-national-start]').addEventListener('change', (event) => {
    stopNationalPlayback();
    nationalAnalyzerState.start = Number(event.target.value);
    if (nationalAnalyzerState.start > nationalAnalyzerState.end) nationalAnalyzerState.end = nationalAnalyzerState.start;
    renderNationalRiskTrends(rows);
  });
  container.querySelector('[data-national-end]').addEventListener('change', (event) => {
    stopNationalPlayback();
    nationalAnalyzerState.end = Number(event.target.value);
    if (nationalAnalyzerState.end < nationalAnalyzerState.start) nationalAnalyzerState.start = nationalAnalyzerState.end;
    nationalAnalyzerState.focus = nationalAnalyzerState.end;
    renderNationalRiskTrends(rows);
  });
  container.querySelector('[data-national-play]').addEventListener('click', () => toggleNationalPlayback(rows));
  setupNationalTrendPointer(rows);
  updateNationalAnalyzerReadouts(rows);
}

function segmentedControl(attribute, options, selected) {
  return `<div class="national-control"><span>时间粒度</span><div class="national-segmented" data-${attribute}>${options
    .map(([value, label]) => `<button type="button" data-value="${value}" class="${value === selected ? 'is-active' : ''}">${label}</button>`)
    .join('')}</div></div>`;
}

function yearOptions(rows, selected) {
  return rows.map((row) => `<option value="${row.year}"${Number(row.year) === selected ? ' selected' : ''}>${row.year}</option>`).join('');
}

function getNationalDisplayRows(rows) {
  const ranged = rows.filter((row) => Number(row.year) >= nationalAnalyzerState.start && Number(row.year) <= nationalAnalyzerState.end);
  if (nationalAnalyzerState.grain === 'annual') return ranged.map((row) => ({ ...row, periodLabel: String(row.year) }));
  if (nationalAnalyzerState.grain === 'nodes') {
    return ranged
      .filter((row) => Number(row.year) % 5 === 0 || Number(row.year) === nationalAnalyzerState.end)
      .map((row) => ({ ...row, periodLabel: String(row.year) }));
  }
  const result = [];
  for (let start = nationalAnalyzerState.start; start <= nationalAnalyzerState.end; start += 5) {
    const end = Math.min(start + 4, nationalAnalyzerState.end);
    const bucket = ranged.filter((row) => Number(row.year) >= start && Number(row.year) <= end);
    if (!bucket.length) continue;
    const item = { year: end, periodLabel: `${start}–${String(end).slice(-2)}` };
    nationalMetrics.forEach((metric) => {
      item[metric.key] = bucket.reduce((sum, row) => sum + Number(row[metric.key]), 0) / bucket.length;
    });
    result.push(item);
  }
  return result;
}

function renderNationalAnalyzerViz(rows) {
  return `<div class="national-trend-stack">${nationalMetrics.map((metric) => renderNationalMetricTrend(rows, metric)).join('')}</div>`;
}

function renderNationalMetricTrend(rows, metric) {
  const width = 400;
  const height = 68;
  const margin = { top: 4, right: 13, bottom: 13, left: 34 };
  const max = Math.max(20, Math.ceil(Math.max(...rows.map((row) => Number(row[metric.key]))) / 20) * 20);
  const x = (index) => margin.left + (index / Math.max(rows.length - 1, 1)) * (width - margin.left - margin.right);
  const y = (value) => margin.top + (height - margin.top - margin.bottom) * (1 - Number(value) / max);
  const estimateIndex = rows.findIndex((row) => Number(row.year) >= 2024);
  const confirmedRows = estimateIndex === -1 ? rows : rows.slice(0, estimateIndex);
  const confirmedPath = confirmedRows.map((row, index) => `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(row[metric.key]).toFixed(1)}`).join(' ');
  const estimatePathStart = Math.max(0, estimateIndex - 1);
  const estimatePath = estimateIndex >= 0
    ? rows.slice(estimatePathStart).map((row, offset) => `${offset ? 'L' : 'M'} ${x(estimatePathStart + offset).toFixed(1)} ${y(row[metric.key]).toFixed(1)}`).join(' ')
    : '';
  return `<section class="national-trend-panel">
    <header><strong data-term-key="${metric.key}">${metric.label}</strong><span data-national-metric-value="${metric.key}" style="color:${metric.color}">${Number(rows.at(-1)[metric.key]).toFixed(1)}%</span><small>${metric.reading}</small></header>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric.label}全国趋势">
      ${[0, 0.5, 1].map((ratio) => {
        const tickValue = max * (1 - ratio);
        const tickY = margin.top + (height - margin.top - margin.bottom) * ratio;
        return `<line class="chart-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${tickY}" y2="${tickY}"></line><text class="axis-label national-y-axis" x="${margin.left - 12}" y="${tickY + 3}" text-anchor="end">${Number(tickValue).toFixed(0)}%</text>`;
      }).join('')}
      <line class="national-sync-line" x1="0" x2="0" y1="${margin.top}" y2="${height - margin.bottom}" hidden></line>
      <rect class="national-chart-hit" x="${margin.left}" y="${margin.top}" width="${width - margin.left - margin.right}" height="${height - margin.top - margin.bottom}"></rect>
      <path d="${confirmedPath}" style="stroke:${metric.color}"></path>
      ${estimatePath ? `<path class="is-estimate" d="${estimatePath}" style="stroke:${metric.color}"></path>` : ''}
      ${rows.map((row, index) => {
        const estimate = Number(row.year) >= 2024;
        return `<circle class="data-point-hit" cx="${x(index)}" cy="${y(row[metric.key])}" r="6" data-viz-tooltip="${escapeAttribute(`${row.periodLabel}\n${metric.label} ${Number(row[metric.key]).toFixed(2)}%${estimate ? '\n行业估算' : ''}`)}"></circle><circle class="data-point-dot national-point${estimate ? ' is-estimate' : ''}" cx="${x(index)}" cy="${y(row[metric.key])}" r="${estimate ? 3.4 : 2.2}" style="${estimate ? `stroke:${metric.color}` : `fill:${metric.color}`}"></circle>`;
      }).join('')}
      ${rows.map((row, index) => `<text class="axis-label national-x-axis" x="${x(index).toFixed(1)}" y="${height - 3}" text-anchor="middle">${rows.length < 8 || index === 0 || index === rows.length - 1 || index === Math.floor(rows.length / 2) ? row.periodLabel : ''}</text>`).join('')}
    </svg>
  </section>`;
}

function renderNationalMatrix(rows) {
  return `<div class="national-matrix-scroll"><div class="national-matrix" style="--national-columns:${rows.length}"><span></span>${rows.map((row) => `<strong>${row.periodLabel}</strong>`).join('')}${nationalMetrics.map((metric) => {
    const max = Math.max(...rows.map((row) => Number(row[metric.key])));
    return `<strong style="color:${metric.color}">${metric.label}</strong>${rows.map((row) => `<span class="${Number(row.year) === nationalAnalyzerState.focus ? 'is-current' : ''}" style="background:${nationalMatrixColor(metric.key, row[metric.key], max)}" data-viz-tooltip="${escapeAttribute(`${row.periodLabel}\n${metric.label} ${Number(row[metric.key]).toFixed(2)}%`)}">${Number(row[metric.key]).toFixed(1)}%</span>`).join('')}`;
  }).join('')}</div></div><p class="chart-note">四项指标分别使用自身色阶；不同指标之间比较变化方向，不直接比较颜色深浅。</p>`;
}

function nationalMatrixColor(key, value, max) {
  const rgb = key === 'profit_margin_pct' ? '143,174,142' : key === 'pollination_share_pct' ? '141,191,193' : key === 'colony_winter_loss_pct' ? '200,154,91' : '185,108,84';
  return `rgba(${rgb},${(0.1 + (Number(value) / max) * 0.7).toFixed(2)})`;
}

function renderNationalComparison(rows) {
  const first = rows[0];
  const last = rows.at(-1);
  return `<div class="national-comparison">${nationalMetrics.map((metric) => {
    const max = 80;
    const start = (Number(first[metric.key]) / max) * 100;
    const end = (Number(last[metric.key]) / max) * 100;
    const left = Math.min(start, end);
    const width = Math.abs(start - end);
    const delta = Number(last[metric.key]) - Number(first[metric.key]);
    return `<section><strong>${metric.label}</strong><div class="national-comparison-track"><i style="left:${left}%;width:${width}%"></i><b style="left:${start}%;border-color:${metric.color}"></b><b class="is-end" style="left:${end}%;background:${metric.color};border-color:${metric.color}"></b></div><span>${first.periodLabel} ${Number(first[metric.key]).toFixed(1)}% → ${last.periodLabel} ${Number(last[metric.key]).toFixed(1)}%<em style="color:${metric.color}">${delta > 0 ? '+' : ''}${Number(delta).toFixed(1)} 个百分点</em></span></section>`;
  }).join('')}</div>`;
}

function setupNationalTrendPointer(sourceRows) {
  if (nationalAnalyzerState.view !== 'trend') return;
  const rows = getNationalDisplayRows(sourceRows);
  document.querySelectorAll('.national-chart-hit').forEach((hit) => {
    hit.addEventListener('pointermove', (event) => {
      const rect = hit.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const index = Math.round(ratio * (rows.length - 1));
      nationalAnalyzerState.focus = Number(rows[index].year);
      positionNationalSyncLines(index, rows.length);
      updateNationalAnalyzerReadouts(sourceRows);
    });
  });
}

function positionNationalSyncLines(index, count) {
  document.querySelectorAll('.national-sync-line').forEach((line) => {
    const hit = line.ownerSVGElement.querySelector('.national-chart-hit');
    const x = Number(hit.getAttribute('x')) + (index / Math.max(count - 1, 1)) * Number(hit.getAttribute('width'));
    line.hidden = false;
    line.setAttribute('x1', x);
    line.setAttribute('x2', x);
  });
}

function updateNationalAnalyzerReadouts(rows) {
  const displayRows = getNationalDisplayRows(rows);
  const current = displayRows.reduce((best, row) => Math.abs(Number(row.year) - nationalAnalyzerState.focus) < Math.abs(Number(best.year) - nationalAnalyzerState.focus) ? row : best, displayRows[0]);
  nationalAnalyzerState.focus = Number(current.year);
  const yearTarget = document.querySelector('[data-national-focus-year]');
  const conclusionContainer = document.querySelector('[data-national-conclusion]');
  if (!yearTarget || !conclusionContainer) return;
  yearTarget.textContent = `${current.periodLabel} 年`;
  nationalMetrics.forEach((metric) => {
    document.querySelectorAll(`[data-national-metric-value="${metric.key}"]`).forEach((target) => {
      target.textContent = `${Number(current[metric.key]).toFixed(1)}%`;
    });
  });
  const first = rows.find((row) => Number(row.year) === nationalAnalyzerState.start) || rows[0];
  const last = rows.find((row) => Number(row.year) === nationalAnalyzerState.end) || rows.at(-1);
  const cost = Number(last.cost_income_ratio_pct) - Number(first.cost_income_ratio_pct);
  const winter = Number(last.colony_winter_loss_pct) - Number(first.colony_winter_loss_pct);
  const profit = Number(last.profit_margin_pct) - Number(first.profit_margin_pct);
  const pollination = Number(last.pollination_share_pct) - Number(first.pollination_share_pct);
  conclusionContainer.innerHTML = `<header class="national-conclusion-heading"><strong>${nationalAnalyzerState.start}–${nationalAnalyzerState.end} 全国观察</strong><span>经济韧性改善与生产风险上升并存</span></header><p>成本收入比${cost <= 0 ? '下降' : '上升'} ${Math.abs(cost).toFixed(1)} 个百分点，利润率${profit >= 0 ? '提高' : '下降'} ${Math.abs(profit).toFixed(1)} 个百分点；与此同时，越冬损失率${winter >= 0 ? '提高' : '下降'} ${Math.abs(winter).toFixed(1)} 个百分点，授粉收入占比${pollination >= 0 ? '提高' : '下降'} ${Math.abs(pollination).toFixed(1)} 个百分点。</p>`;
}

function toggleNationalPlayback(rows) {
  nationalAnalyzerState.playing = !nationalAnalyzerState.playing;
  if (!nationalAnalyzerState.playing) {
    stopNationalPlayback();
    renderNationalRiskTrends(rows);
    return;
  }
  renderNationalRiskTrends(rows);
  const displayRows = getNationalDisplayRows(rows);
  let index = Math.max(0, displayRows.findIndex((row) => Number(row.year) >= nationalAnalyzerState.focus));
  nationalPlaybackTimer = window.setInterval(() => {
    index = (index + 1) % displayRows.length;
    nationalAnalyzerState.focus = Number(displayRows[index].year);
    if (nationalAnalyzerState.view === 'trend') {
      positionNationalSyncLines(index, displayRows.length);
      updateNationalAnalyzerReadouts(rows);
    } else {
      renderNationalRiskTrends(rows);
    }
  }, 900);
}

function stopNationalPlayback() {
  window.clearInterval(nationalPlaybackTimer);
  nationalPlaybackTimer = null;
  nationalAnalyzerState.playing = false;
}

function renderRouteRiskChain(rows, state) {
  const container = document.querySelector('[data-route-risk-chain]');
  if (!container) return;

  const activeRouteId = resolveActiveRiskRouteId(state);
  const primaryRouteName = activeRouteId ? routeLabels[activeRouteId] : null;
  const routeRows = rows
    .filter((row) => row.route_name === primaryRouteName && eraMatches(row.era, state.selectedEra))
    .sort((a, b) => Number(a.segment_order || 0) - Number(b.segment_order || 0))
    .slice(0, 8);
  const displayRouteRows = enrichSouthRouteRiskRows(routeRows, livelihoodData?.weatherDaily, state.selectedEra);

  if (!displayRouteRows.length) {
    container.innerHTML = `
      <header class="data-card-header">
        <div>
          <h3 class="section-title">迁徙风险链</h3>
          <p class="caption">当前路线与年代暂无可用路段数据</p>
        </div>
      </header>
      <div class="panel-loading">请选择其他路线或年代。</div>
    `;
    return;
  }

  const risks = displayRouteRows.map((row) => Number(row.climateRiskIndex || 0));
  const peakIndex = risks.indexOf(Math.max(...risks));
  const lowIndex = risks.indexOf(Math.min(...risks));
  const highRiskCount = risks.filter((value) => value >= 0.8).length;
  const routeClassification = describeRouteClassification(routeRows);
  const focusedRow = state.selectedNodeSummary?.route_name === primaryRouteName
      ? displayRouteRows.find(
        (row) =>
          row.segment_id === state.selectedNodeSummary.id ||
          (String(row.segment_order) === String(state.selectedNodeSummary.segment_order) && row.to_location === state.selectedNodeSummary.location),
      )
    : null;

  container.innerHTML = `
    <header class="data-card-header">
      <div>
        <h3 class="section-title">迁徙风险链</h3>
        <p class="caption">${escapeHtml(primaryRouteName)} · ${state.selectedEra} · ${routeClassification} · 按迁徙顺序串联</p>
      </div>
    </header>
    <div class="route-risk-chain-legend" aria-label="迁徙风险链图例">
      <span><i class="route-risk-value-key">0–1</i>数值：生产风险指数</span>
      <span><i class="route-risk-color-key"></i>颜色：低 → 高</span>
    </div>
    <div class="route-risk-chain${focusedRow ? ' has-selected-node' : ''}" role="list" aria-label="${escapeAttribute(`${primaryRouteName}${state.selectedEra}迁徙风险链`)}">
      ${renderRouteRiskChainArrows(displayRouteRows.length)}
      ${displayRouteRows
        .map((row, index) => renderRouteRiskChainNode(row, index, row === focusedRow))
        .join('')}
      ${focusedRow ? renderRouteRiskChainFocus(focusedRow, displayRouteRows) : ''}
    </div>
    ${
      focusedRow
        ? ''
        : `<div class="route-risk-chain-insights">
            <span>${escapeHtml(displayRouteRows[peakIndex].to_location)}段气候生产风险最高 ${formatNumber(risks[peakIndex], 2)}，平均采蜜率 ${formatPercent(Number(displayRouteRows[peakIndex].goodHoneyRate || 0))}</span>
            <span>全程共有 ${highRiskCount} 个路段的气候生产风险指数达到或超过 0.80</span>
            <span>${escapeHtml(displayRouteRows[lowIndex].to_location)}段生产风险最低 ${formatNumber(risks[lowIndex], 2)}，形成阶段性缓冲</span>
          </div>
          ${renderRouteRiskMiniCharts(displayRouteRows)}`
    }
  `;

  if (focusedRow) {
    const chain = container.querySelector('.route-risk-chain.has-selected-node');
    const focusedNode = chain?.querySelector('.is-chain-selected');
    if (chain && focusedNode) {
      window.requestAnimationFrame(() => {
        const dot = focusedNode.querySelector('.route-risk-chain-dot');
        const dotOffsetX = dot ? dot.offsetLeft : 0;
        const dotOffsetY = dot ? dot.offsetTop : 0;
        focusedNode.style.setProperty('--route-risk-focus-x', `${-(focusedNode.offsetLeft + dotOffsetX)}px`);
        focusedNode.style.setProperty('--route-risk-focus-y', `${-(focusedNode.offsetTop + dotOffsetY)}px`);
        chain.classList.add('is-node-focused');
      });
    }
  }

  container.onpointerover = (event) => {
    const node = event.target.closest('[data-route-risk-chain-node]');
    if (!node) return;
    const chain = node.closest('.route-risk-chain');
    if (chain?.classList.contains('is-node-focused')) return;
    if (chain) chain.classList.add('has-route-risk-focus');
    node.classList.add('is-route-risk-focus');
    const label = node.querySelector('[data-route-risk-chain-label]');
    if (label) label.textContent = node.dataset.routeLabel;
  };

  container.onpointerout = (event) => {
    const node = event.target.closest('[data-route-risk-chain-node]');
    if (!node || node.contains(event.relatedTarget)) return;
    const chain = node.closest('.route-risk-chain');
    if (chain?.classList.contains('is-node-focused')) return;
    if (chain) chain.classList.remove('has-route-risk-focus');
    node.classList.remove('is-route-risk-focus');
    const label = node.querySelector('[data-route-risk-chain-label]');
    if (label) label.textContent = node.dataset.placeLabel;
  };

  container.onclick = (event) => {
    const galleryButton = event.target.closest('[data-nectar-gallery-button]');
    if (galleryButton) {
      event.stopPropagation();
      switchNectarGalleryImage(galleryButton.closest('[data-nectar-gallery]'), Number(galleryButton.dataset.nectarGalleryButton));
      return;
    }

    const exit = event.target.closest('[data-route-risk-exit]');
    const focusedNode = event.target.closest('.route-risk-chain.is-node-focused .is-chain-selected');
    if (exit || focusedNode) setSelectedNode(null, null);
  };
}

function renderRouteRiskChainNode(row, index, selected = false) {
  const rowNumber = index < 4 ? 1 : 2;
  const columnNumber = index < 4 ? index + 1 : 8 - index;
  const risk = Number(row.climateRiskIndex || 0);
  const routeLabel = row.from_location === row.to_location ? `${row.to_location}${row.to_location === '内蒙古' ? '区内' : '省内'}` : `${row.from_location}→${row.to_location}`;
  return `
    <div class="route-risk-chain-node${selected ? ' is-chain-selected' : ''}" role="listitem" data-route-risk-chain-node
      data-route-label="${escapeAttribute(routeLabel)}" data-place-label="${escapeAttribute(row.to_location)}"
      ${selected ? '' : `data-viz-tooltip="${escapeAttribute(buildRiskChainTooltip(row))}"`} style="grid-area:${rowNumber} / ${columnNumber}">
      <span class="route-risk-chain-dot" style="--route-risk-node-color:${riskColorForChain(risk)}">${formatNumber(risk, 2)}</span>
      <strong data-route-risk-chain-label>${escapeHtml(selected ? routeLabel : row.to_location)}</strong>
      <small>${escapeHtml(row.nectar_sources || '暂无蜜源说明')}</small>
    </div>
  `;
}

function renderRouteRiskMiniCharts(rows) {
  return `
    <div class="route-risk-mini-charts" aria-label="当前线路采蜜率与沿途风险值柱状图">
      ${renderRouteRiskMiniBarChart(rows, {
        title: '线路采蜜率',
        axisLabel: '采蜜率',
        tone: 'honey',
        value: (row) => Number(row.goodHoneyRate || 0),
        formatter: (value) => formatPercent(value),
      })}
      ${renderRouteRiskMiniBarChart(rows, {
        title: '沿途风险值',
        axisLabel: '风险值',
        tone: 'risk',
        value: (row) => Number(row.climateRiskIndex || 0),
        formatter: (value) => formatNumber(value, 2),
      })}
    </div>
  `;
}

function renderRouteRiskMiniBarChart(rows, options) {
  const maxBarHeight = 84;
  const items = rows.map((row, index) => {
    const value = Math.max(0, Math.min(1, Number(options.value(row)) || 0));
    const place = row.to_location || `第${index + 1}段`;
    const height = Math.max(value > 0 ? 2 : 0, Math.round(value * maxBarHeight));
    return { row, value, place, height };
  });

  return `
    <section class="route-risk-mini-chart is-${options.tone}" aria-label="${escapeAttribute(options.title)}柱状图">
      <header>
        <strong>${escapeHtml(options.title)}</strong>
        <span>纵轴：${escapeHtml(options.axisLabel)}</span>
      </header>
      <div class="route-risk-mini-plot" style="grid-template-columns: repeat(${items.length}, minmax(0, 1fr))">
        ${items
          .map(
            (item) => `
              <span class="route-risk-mini-bar" data-viz-tooltip="${escapeAttribute(
                `${item.place}\n${options.axisLabel}：${options.formatter(item.value)}`,
              )}">
                <i style="height:${item.height}px"></i>
                <em>${escapeHtml(item.place)}</em>
              </span>
            `,
          )
          .join('')}
      </div>
      <small>横轴：地点</small>
    </section>
  `;
}

function renderNectarGallery(row, routeRows) {
  const images = getRouteNectarImages(row, routeRows);
  const currentLabel = images[0]?.label || row.nectar_sources || '蜜源';
  const hasMultipleImages = images.length > 1;
  return `
    <div class="route-risk-nectar-placeholder has-nectar-image" role="group" aria-label="${escapeAttribute(`${row.nectar_sources || '蜜源'}图片`)}" data-nectar-gallery>
      <div class="nectar-gallery-stage">
        ${images
          .map(
            (image, index) => `
              <img class="nectar-gallery-image${index === 0 ? ' is-active' : ''}" data-nectar-gallery-item data-nectar-label="${escapeAttribute(image.label)}" src="${escapeAttribute(image.src)}" alt="${escapeAttribute(`${image.label}蜜源图`)}" aria-hidden="${index === 0 ? 'false' : 'true'}" />
            `,
          )
          .join('')}
      </div>
      ${hasMultipleImages ? '<button class="nectar-gallery-button is-prev" type="button" data-nectar-gallery-button="-1" aria-label="上一张蜜源图片">‹</button><button class="nectar-gallery-button is-next" type="button" data-nectar-gallery-button="1" aria-label="下一张蜜源图片">›</button>' : ''}
      <span class="nectar-gallery-title">蜜源图片</span>
      <small><b data-nectar-gallery-label>${escapeHtml(currentLabel)}</b>${hasMultipleImages ? `<em data-nectar-gallery-index>1/${images.length}</em>` : ''}</small>
    </div>
  `;
}

function getRouteNectarImages(row, routeRows) {
  const directMatches = findNectarImages(row.nectar_sources);
  if (directMatches.length) return directMatches;

  const currentOrder = Number(row.segment_order || 0);
  const fallbackRows = [...routeRows]
    .filter((item) => item !== row)
    .sort((a, b) => Math.abs(Number(a.segment_order || 0) - currentOrder) - Math.abs(Number(b.segment_order || 0) - currentOrder));
  for (const item of fallbackRows) {
    const matches = findNectarImages(item.nectar_sources);
    if (matches.length) return matches.map((image) => ({ ...image, label: `${image.label}参考` }));
  }

  return [{ label: '油菜参考', src: 'assets/nectar/rapeseed.png' }];
}

function findNectarImages(sourceText) {
  const source = String(sourceText || '').replace(/（.*?）/g, '').replace(/[、，]/g, '/');
  const matches = nectarImageAssets
    .map((asset) => {
      const index = Math.min(...asset.keywords.map((keyword) => source.indexOf(keyword)).filter((value) => value >= 0));
      return Number.isFinite(index) ? { ...asset, index } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
  const seen = new Set();
  return matches.filter((asset) => {
    if (seen.has(asset.src)) return false;
    seen.add(asset.src);
    return true;
  });
}

function switchNectarGalleryImage(gallery, step) {
  if (!gallery) return;
  const images = [...gallery.querySelectorAll('[data-nectar-gallery-item]')];
  if (images.length <= 1) return;
  const currentIndex = Math.max(0, images.findIndex((image) => image.classList.contains('is-active')));
  const nextIndex = (currentIndex + step + images.length) % images.length;
  images.forEach((image, index) => {
    const active = index === nextIndex;
    image.classList.toggle('is-active', active);
    image.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
  const label = gallery.querySelector('[data-nectar-gallery-label]');
  const indicator = gallery.querySelector('[data-nectar-gallery-index]');
  if (label) label.textContent = images[nextIndex].dataset.nectarLabel || '蜜源';
  if (indicator) indicator.textContent = `${nextIndex + 1}/${images.length}`;
}

function renderRouteRiskChainFocus(row, routeRows) {
  const risk = Number(row.climateRiskIndex || 0);
  const routeLabel = row.from_location === row.to_location ? `${row.to_location}${row.to_location === '内蒙古' ? '区内' : '省内'}` : `${row.from_location} → ${row.to_location}`;
  const impactTone = risk >= 0.8 ? '生产窗口承压明显' : risk >= 0.5 ? '生产窗口存在波动' : '生产窗口相对稳定';
  const routeSummary = summarizeSelectedRoutes(routeRows);
  const currentHoneyRate = Number(row.goodHoneyRate || 0);
  const riskRank = [...routeRows].sort((a, b) => Number(b.climateRiskIndex || 0) - Number(a.climateRiskIndex || 0)).indexOf(row) + 1;
  const honeyRank = [...routeRows].sort((a, b) => Number(b.goodHoneyRate || 0) - Number(a.goodHoneyRate || 0)).indexOf(row) + 1;
  return `
    <section class="route-risk-chain-focus-card" aria-label="${escapeAttribute(`${routeLabel}风险解释`)}">
      <header>
        <strong>${escapeHtml(routeLabel)}</strong>
        <span>${escapeHtml(row.nectar_sources || '暂无蜜源说明')} · 第 ${escapeHtml(row.segment_order)} 段</span>
      </header>
      <div class="route-risk-focus-content">
        <div class="route-risk-focus-metrics">
          <span>生产风险指数<strong>${formatNumber(risk, 2)}</strong></span>
          <span>风险等级<strong>${productionRiskLevel(risk)}</strong></span>
          <span>平均采蜜率<strong>${formatPercent(Number(row.goodHoneyRate || 0))}</strong></span>
          <span>平均 NWI<strong>${formatNumber(row.avgNWI, 1)}</strong></span>
          <span class="route-risk-driver-card">主要风险来源<strong>${getProductionRiskDriver(row)}</strong></span>
        </div>
        ${renderNectarGallery(row, routeRows)}
      </div>
      <div class="route-risk-impact-flow" aria-label="风险影响路径">
        <span>${impactTone}</span><i>→</i><span>单箱产出波动</span><i>→</i><span>收入稳定性变化</span>
      </div>
      <div class="route-risk-relative-analysis">
        <section class="route-risk-bullet-group" aria-label="当前路段与路线平均对比">
          ${renderRouteRiskBullet('生产风险', risk, routeSummary.riskIndex, 'risk')}
          ${renderRouteRiskBullet('平均采蜜率', currentHoneyRate, routeSummary.goodHoneyRate, 'honey')}
        </section>
        <section class="route-risk-rank-group" aria-label="当前路段沿途排名">
          <span><small>风险由高到低</small><strong>${riskRank}/${routeRows.length}</strong></span>
          <span><small>采蜜率由高到低</small><strong>${honeyRank}/${routeRows.length}</strong></span>
        </section>
      </div>
      <button class="route-risk-focus-exit" type="button" data-route-risk-exit>退出</button>
    </section>
  `;
}

function renderRouteRiskBullet(label, current, average, tone) {
  const currentPercent = Math.max(0, Math.min(100, Number(current || 0) * 100));
  const averagePercent = Math.max(0, Math.min(100, Number(average || 0) * 100));
  return `
    <div class="route-risk-bullet is-${tone}">
      <span>${label}<small>当前 ${tone === 'honey' ? formatPercent(current) : formatNumber(current, 2)} · 沿途平均 ${tone === 'honey' ? formatPercent(average) : formatNumber(average, 2)}</small></span>
      <i><b style="width:${currentPercent}%"></b><em style="left:${averagePercent}%" title="沿途平均"></em></i>
    </div>
  `;
}

function renderRouteRiskChainArrows(count) {
  const points = [
    [50, 18], [150, 18], [250, 18], [350, 18],
    [350, 104], [250, 104], [150, 104], [50, 104],
  ];
  const paths = points.slice(0, Math.max(0, count - 1)).map((point, index) => {
    const next = points[index + 1];
    if (point[0] === next[0]) return `M${point[0]} ${point[1] + 16} V${next[1] - 16}`;
    const direction = next[0] > point[0] ? 1 : -1;
    return `M${point[0] + 16 * direction} ${point[1]} H${next[0] - 16 * direction}`;
  });
  return `
    <svg class="route-risk-chain-arrows" viewBox="0 0 400 159" preserveAspectRatio="none" aria-hidden="true">
      <defs><marker id="route-risk-chain-arrowhead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#d6d0c7"></path></marker></defs>
      ${paths.map((path) => `<path d="${path}" marker-end="url(#route-risk-chain-arrowhead)"></path>`).join('')}
    </svg>
  `;
}

function riskColorForChain(value) {
  if (value >= 0.9) return '#a85442';
  if (value >= 0.65) return '#c47d57';
  if (value >= 0.35) return '#d9a06c';
  return '#8fae8e';
}

function buildRiskChainTooltip(row) {
  const risk = Number(row.climateRiskIndex || 0);
  return `${row.from_location} → ${row.to_location}\n${row.nectar_sources || '暂无蜜源说明'}\n气候生产风险指数 ${formatNumber(risk, 4)}（${productionRiskLevel(risk)}）\n平均采蜜率 ${formatPercent(Number(row.goodHoneyRate || 0))}\n平均 NWI ${formatNumber(row.avgNWI, 1)}\n主要风险来源：${getProductionRiskDriver(row)}`;
}

function productionRiskLevel(value) {
  if (value >= 0.8) return '高';
  if (value >= 0.5) return '中';
  return '低';
}

function getProductionRiskDriver(row) {
  const weatherDays = Math.max(Number(row.weather_day_count || 0), 1);
  const components = [
    ['有效采蜜窗口不足', 1 - Number(row.goodHoneyRate || 0)],
    ['持续中断压力', Number(row.maxBadStreak || 0) / 12],
    ['降水暴露', Number(row.rainDays || 0) / weatherDays / 5],
    ['高温暴露', Number(row.heatDays || 0) / weatherDays / 4],
  ];
  return components.sort((a, b) => b[1] - a[1])[0][0];
}

function enrichSouthRouteRiskRows(rows, weatherRows = [], selectedEra) {
  if (selectedEra !== '2020s' || !rows.some((row) => row.route_name === '南线') || !weatherRows?.length) return rows;
  return rows.map((row) => {
    if (row.route_name !== '南线') return row;
    const matchedRows = southWeatherRowsForRiskSegment(row, weatherRows);
    if (!matchedRows.length) return row;
    const count = matchedRows.length;
    const goodDays = matchedRows.filter((item) => Number(item.good_honey_day) === 1).length;
    const rainRows = matchedRows.filter((item) => numberOrZero(item.precipitation_mm) > 0);
    const heatDays = matchedRows.filter((item) => numberOrZero(item.temp_max_c) > 35).length;
    const maxBadStreak = Math.max(0, ...matchedRows.map((item) => numberOrZero(item.bad_weather_streak)));
    const goodHoneyRate = goodDays / count;
    const climateRiskIndex = clamp(1 - goodHoneyRate + maxBadStreak / 12 + rainRows.length / count / 5 + heatDays / count / 4, 0, 1);
    return {
      ...row,
      weather_day_count: String(count),
      good_days: String(goodDays),
      goodHoneyRate: String(goodHoneyRate),
      avgNWI: String(matchedRows.reduce((sum, item) => sum + numberOrZero(item.nectar_weather_index), 0) / count),
      rainDays: String(rainRows.length),
      heatDays: String(heatDays),
      maxBadStreak: String(maxBadStreak),
      climateRiskIndex: String(climateRiskIndex),
    };
  });
}

function southWeatherRowsForRiskSegment(segment, weatherRows) {
  const destination = String(segment.to_location || '').trim();
  const segmentStart = monthDayOrdinal(Number(segment.start_month), Number(segment.start_day));
  const segmentEnd = monthDayOrdinal(Number(segment.end_month), Number(segment.end_day));
  const routeWindow = southRiskWindowForSegment(segment);
  if (!destination || !routeWindow) return [];
  const availableRows = weatherRows.filter((row) => {
    if (row.route_name !== '南线' || String(row.location || '').trim() !== destination) return false;
    const ordinal = dateOrdinalFromText(row.date);
    return ordinal >= routeWindow.start
      && ordinal <= routeWindow.end
      && ordinal >= segmentStart
      && ordinal <= segmentEnd;
  });
  const latestYear = Math.max(...availableRows.map((row) => Number(String(row.date).slice(0, 4))).filter(Number.isFinite));
  return availableRows
    .filter((row) => Number(String(row.date).slice(0, 4)) === latestYear)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function southRiskWindowForSegment(segment) {
  const order = Number(segment.segment_order);
  return order <= 4
    ? { start: monthDayOrdinal(2, 17), end: monthDayOrdinal(5, 17) }
    : { start: monthDayOrdinal(5, 17), end: monthDayOrdinal(8, 12) };
}

function dateOrdinalFromText(dateText) {
  const [, month, day] = String(dateText).split('-').map(Number);
  return monthDayOrdinal(month, day);
}

function monthDayOrdinal(month, day) {
  const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return monthLengths.slice(0, month - 1).reduce((sum, length) => sum + length, 0) + day;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function renderRouteRiskFocus(state, data) {
  const container = document.querySelector('[data-route-risk-focus]');
  if (!container) return;

  const activeRouteId = resolveActiveRiskRouteId(state);
  const activeRouteName = activeRouteId ? routeLabels[activeRouteId] : null;
  const routeRows = enrichSouthRouteRiskRows(
    data.routeSegmentSummary.filter((row) => row.route_name === activeRouteName && eraMatches(row.era, state.selectedEra)),
    data.weatherDaily,
    state.selectedEra,
  );
  const routeSummary = summarizeSelectedRoutes(routeRows);
  if (!routeRows.length) {
    container.innerHTML = `
      <header class="data-card-header">
        <div>
          <h3 class="section-title" data-term-key="route_risk">当前路线风险解释</h3>
          <p class="caption">当前年代暂无匹配路线摘要</p>
        </div>
      </header>
      <div class="panel-loading">请选择左侧路线，或切换年代查看可用数据。</div>
    `;
    return;
  }

  const routeClassification = describeRouteClassification(routeRows);
  container.innerHTML = `
    <header class="data-card-header">
      <div>
        <h3 class="section-title" data-term-key="route_risk">当前路线风险解释</h3>
        <p class="caption">${escapeHtml(activeRouteName)} · ${state.selectedEra} · ${routeClassification}</p>
      </div>
    </header>
    <div class="route-risk-kpis">
      <span data-viz-tooltip="${escapeAttribute('由 route_segment_summary.csv 聚合：所选路线当前年代的路段数')}">路段 <strong>${routeSummary.segmentCount}</strong></span>
      <span data-viz-tooltip="${escapeAttribute('由 segment_km 汇总；仅统计当前风险标签对应路线')}">里程 <strong>${formatNumber(routeSummary.distance, 0)} km</strong></span>
      <span data-viz-tooltip="${escapeAttribute('由逐日 good_honey_day / weather_day_count 聚合，为当前路线当前年代的平均采蜜率')}">平均采蜜率 <strong>${formatPercent(routeSummary.goodHoneyRate)}</strong></span>
      <span data-viz-tooltip="${escapeAttribute('由当前路线各路段 climateRiskIndex 取平均，0 低、1 高；用于概括天气条件对生产窗口的综合压力')}">沿途平均风险 <strong>${formatNumber(routeSummary.riskIndex, 2)}</strong></span>
    </div>
    <div class="route-risk-reading">
      <p>${buildRouteReading(routeSummary)}</p>
    </div>
  `;
}

function buildRouteReading(summary) {
  const riskTone =
    summary.riskIndex >= 0.62
      ? '沿途有效采蜜窗口受限，气候生产风险偏高，可能增加单箱产出与收入的不确定性'
      : summary.riskIndex >= 0.38
        ? '沿途生产窗口存在波动，可能对单箱产出稳定性形成压力'
        : '沿途气候生产风险整体较低，经营压力更可能来自运输成本与市场价格';
  return `${riskTone}。`;
}

function renderIndustryTrends(annualRows) {
  const container = document.querySelector('[data-livelihood-kpis]');
  if (!container) return;

  const sourceRows = annualRows
    .filter((row) => Number(row.year) >= 2005 && Number(row.year) <= 2025)
    .sort((a, b) => Number(a.year) - Number(b.year));
  const displayRows = getIndustryDisplayRows(sourceRows);

  container.innerHTML = `
    <header class="data-card-header industry-trend-header">
      <div>
        <h3 class="section-title" data-term-key="category_market">全国蜂业规模与市场变化</h3>
      </div>
    </header>
    <div class="national-analyzer-controls industry-analyzer-controls">
      ${segmentedControl('industry-grain', [
        ['annual', '年度'],
        ['nodes', '五年节点'],
        ['average', '五年均值'],
      ], industryTrendState.grain)}
      <label class="national-range-control"><span>时间范围</span><span><select data-industry-start>${yearOptions(sourceRows, industryTrendState.start)}</select><select data-industry-end>${yearOptions(sourceRows, industryTrendState.end)}</select></span></label>
      <button class="national-play${industryTrendState.playing ? ' is-playing' : ''}" type="button" data-industry-play>${industryTrendState.playing ? '❚❚ 暂停' : '▶ 播放'}</button>
    </div>
    <div class="industry-trend-reading"><strong data-industry-focus-year>${industryTrendState.focus} 年</strong><span>移动任意图表，四项指标同步读取</span></div>
    <div class="industry-trend-stack">
      ${industryMetrics.map((metric) => renderIndustryMetricTrend(displayRows, metric)).join('')}
    </div>
    <p class="chart-note"><i class="industry-estimate-key"></i>2025 年为空心点及虚线连接，表示部分行业数据为预估。</p>
    <div class="industry-observation" data-industry-observation>${renderIndustryObservation(displayRows)}</div>
  `;

  container.querySelectorAll('[data-industry-grain] button').forEach((button) => {
    button.addEventListener('click', () => {
      stopIndustryPlayback();
      industryTrendState.grain = button.dataset.value;
      industryTrendState.focus = industryTrendState.end;
      renderIndustryTrends(annualRows);
    });
  });

  container.querySelector('[data-industry-start]').addEventListener('change', (event) => {
    stopIndustryPlayback();
    industryTrendState.start = Number(event.target.value);
    if (industryTrendState.start > industryTrendState.end) industryTrendState.end = industryTrendState.start;
    industryTrendState.focus = industryTrendState.end;
    renderIndustryTrends(annualRows);
  });
  container.querySelector('[data-industry-end]').addEventListener('change', (event) => {
    stopIndustryPlayback();
    industryTrendState.end = Number(event.target.value);
    if (industryTrendState.end < industryTrendState.start) industryTrendState.start = industryTrendState.end;
    industryTrendState.focus = industryTrendState.end;
    renderIndustryTrends(annualRows);
  });
  container.querySelector('[data-industry-play]').addEventListener('click', () => toggleIndustryPlayback(annualRows));

  setupIndustryTrendPointer(displayRows);
  updateIndustryTrendReadouts(displayRows);
}

function getIndustryDisplayRows(rows) {
  const ranged = rows.filter((row) => Number(row.year) >= industryTrendState.start && Number(row.year) <= industryTrendState.end);
  if (industryTrendState.grain === 'annual') return ranged.map((row) => ({ ...row, periodLabel: String(row.year) }));
  if (industryTrendState.grain === 'nodes') {
    return ranged
      .filter((row) => Number(row.year) % 5 === 0 || Number(row.year) === industryTrendState.end)
      .map((row) => ({ ...row, periodLabel: String(row.year) }));
  }

  const result = [];
  for (let start = industryTrendState.start; start <= industryTrendState.end; start += 5) {
    const end = Math.min(start + 4, industryTrendState.end);
    const bucket = ranged.filter((row) => Number(row.year) >= start && Number(row.year) <= end);
    if (!bucket.length) continue;
    const item = { year: end, periodLabel: start === end ? String(start) : `${start}–${String(end).slice(-2)}` };
    industryMetrics.forEach((metric) => {
      item[metric.key] = bucket.reduce((sum, row) => sum + Number(row[metric.key]), 0) / bucket.length;
    });
    result.push(item);
  }
  return result;
}

function renderIndustryMetricTrend(rows, metric) {
  const width = 400;
  const height = 68;
  const margin = { top: 4, right: 13, bottom: 13, left: 34 };
  const [min, max] = metric.domain;
  const x = (index) => margin.left + (index / Math.max(rows.length - 1, 1)) * (width - margin.left - margin.right);
  const value = (row) => Number(row[metric.key]) * metric.factor;
  const y = (row) => margin.top + (height - margin.top - margin.bottom) * (1 - (value(row) - min) / (max - min));
  const confirmedRows = rows.filter((row) => Number(row.year) < 2025);
  const confirmedPath = confirmedRows.map((row, index) => `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(row).toFixed(1)}`).join(' ');
  const estimateIndex = rows.findIndex((row) => Number(row.year) === 2025);
  const estimatePath = estimateIndex > 0 ? `M ${x(estimateIndex - 1).toFixed(1)} ${y(rows[estimateIndex - 1]).toFixed(1)} L ${x(estimateIndex).toFixed(1)} ${y(rows[estimateIndex]).toFixed(1)}` : '';

  return `<section class="industry-trend-panel">
    <header><strong data-term-key="${metric.key}">${metric.label}</strong><span data-industry-metric-value="${metric.key}" style="color:${metric.color}">${formatIndustryMetric(rows.at(-1), metric)}</span><small>${metric.reading}</small></header>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric.label}全国年度趋势">
      ${[0, 0.5, 1].map((ratio) => {
        const tickValue = max - (max - min) * ratio;
        const tickY = margin.top + (height - margin.top - margin.bottom) * ratio;
        return `<line class="chart-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${tickY}" y2="${tickY}"></line><text class="axis-label industry-y-axis" x="${margin.left - 12}" y="${tickY + 3}" text-anchor="end">${formatNumber(tickValue, 0)}</text>`;
      }).join('')}
      <rect class="industry-chart-hit" x="${margin.left}" y="${margin.top}" width="${width - margin.left - margin.right}" height="${height - margin.top - margin.bottom}" data-viz-tooltip="${escapeAttribute(industryTooltip(rows.at(-1)))}"></rect>
      <line class="industry-sync-line" x1="0" x2="0" y1="${margin.top}" y2="${height - margin.bottom}" hidden></line>
      <path d="${confirmedPath}" style="stroke:${metric.color}"></path>
      ${estimatePath ? `<path class="is-estimate" d="${estimatePath}" style="stroke:${metric.color}"></path>` : ''}
      ${rows.map((row, index) => {
        const estimate = Number(row.year) === 2025;
        return `<circle class="industry-point${estimate ? ' is-estimate' : ''}" cx="${x(index)}" cy="${y(row)}" r="${estimate ? 3.4 : 2.2}" style="${estimate ? `stroke:${metric.color}` : `fill:${metric.color}`}" data-viz-tooltip="${escapeAttribute(`${row.periodLabel} 年\n${metric.label} ${formatIndustryMetric(row, metric)}${estimate ? '\n部分行业数据为预估' : ''}`)}"></circle>`;
      }).join('')}
      ${rows.map((row, index) => `<text class="axis-label industry-x-axis" x="${x(index).toFixed(1)}" y="${height - 3}" text-anchor="middle">${rows.length <= 6 || index === 0 || index === rows.length - 1 || index === Math.floor(rows.length / 2) ? row.periodLabel : ''}</text>`).join('')}
    </svg>
  </section>`;
}

function setupIndustryTrendPointer(rows) {
  const container = document.querySelector('[data-livelihood-kpis]');
  if (!container) return;
  container.querySelectorAll('.industry-chart-hit').forEach((hit) => {
    hit.addEventListener('pointermove', (event) => {
      const rect = hit.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const index = Math.round(ratio * (rows.length - 1));
      industryTrendState.focus = Number(rows[index].year);
      nationalAnalyzerState.focus = industryTrendState.focus;
      positionIndustrySyncLines(container, index, rows.length);
      updateIndustryTrendReadouts(rows, index);
      hit.dataset.vizTooltip = industryTooltip(rows[index]);
      const tooltip = document.querySelector('.data-hover-tooltip');
      if (tooltip && !tooltip.hidden) tooltip.innerHTML = escapeHtml(hit.dataset.vizTooltip).replace(/\n/g, '<br>');
    });
  });
}

function positionIndustrySyncLines(container, index, count) {
  container.querySelectorAll('.industry-sync-line').forEach((line) => {
    const hit = line.ownerSVGElement.querySelector('.industry-chart-hit');
    const x = Number(hit.getAttribute('x')) + (index / Math.max(count - 1, 1)) * Number(hit.getAttribute('width'));
    line.hidden = false;
    line.setAttribute('x1', x);
    line.setAttribute('x2', x);
  });
}

function updateIndustryTrendReadouts(rows, requestedIndex) {
  const index = requestedIndex ?? Math.max(0, rows.findIndex((row) => Number(row.year) >= industryTrendState.focus));
  const current = rows[index] || rows.at(-1);
  industryTrendState.focus = Number(current.year);
  const yearTarget = document.querySelector('[data-industry-focus-year]');
  if (yearTarget) yearTarget.textContent = `${current.periodLabel} 年${Number(current.year) === 2025 ? ' · 部分预估' : ''}`;
  industryMetrics.forEach((metric) => {
    document.querySelectorAll(`[data-industry-metric-value="${metric.key}"]`).forEach((target) => {
      target.textContent = formatIndustryMetric(current, metric);
    });
  });
}

function renderIndustryObservation(rows) {
  const first = rows.at(0);
  const last = rows.at(-1);
  if (!first || !last) return '';

  const colonyChange = (Number(last.bee_colonies) - Number(first.bee_colonies)) * 0.0001;
  const productionChange = (Number(last.honey_production_tonnes) - Number(first.honey_production_tonnes)) * 0.0001;
  const exportChange = Number(last.export_share_pct) - Number(first.export_share_pct);
  const consumptionChange = Number(last.consumption_per_capita_grams) - Number(first.consumption_per_capita_grams);
  const direction = (value, positive, negative) => (value >= 0 ? positive : negative);

  return `
    <header class="industry-observation-heading">
      <strong>${first.periodLabel}–${last.periodLabel} 全国观察</strong>
      <span>供给规模与市场结构同步变化</span>
    </header>
    <p>蜂群规模${direction(colonyChange, '增加', '减少')} ${Math.abs(colonyChange).toFixed(1)} 万群，蜂蜜产量${direction(productionChange, '增加', '减少')} ${Math.abs(productionChange).toFixed(1)} 万吨；出口占比${direction(exportChange, '提高', '下降')} ${Math.abs(exportChange).toFixed(1)} 个百分点，人均消费量${direction(consumptionChange, '增加', '减少')} ${Math.abs(consumptionChange).toFixed(1)} 克/年。</p>
  `;
}

function toggleIndustryPlayback(annualRows) {
  industryTrendState.playing = !industryTrendState.playing;
  if (!industryTrendState.playing) {
    stopIndustryPlayback();
    renderIndustryTrends(annualRows);
    return;
  }

  renderIndustryTrends(annualRows);
  const sourceRows = annualRows
    .filter((row) => Number(row.year) >= 2005 && Number(row.year) <= 2025)
    .sort((a, b) => Number(a.year) - Number(b.year));
  const displayRows = getIndustryDisplayRows(sourceRows);
  let index = Math.max(0, displayRows.findIndex((row) => Number(row.year) >= industryTrendState.focus));
  industryPlaybackTimer = window.setInterval(() => {
    index = (index + 1) % displayRows.length;
    industryTrendState.focus = Number(displayRows[index].year);
    nationalAnalyzerState.focus = industryTrendState.focus;
    const container = document.querySelector('[data-livelihood-kpis]');
    if (container) positionIndustrySyncLines(container, index, displayRows.length);
    updateIndustryTrendReadouts(displayRows, index);
  }, 900);
}

function stopIndustryPlayback() {
  window.clearInterval(industryPlaybackTimer);
  industryPlaybackTimer = null;
  industryTrendState.playing = false;
}

function formatIndustryMetric(row, metric) {
  return `${formatNumber(Number(row[metric.key]) * metric.factor, metric.decimals)}${metric.unit}`;
}

function industryTooltip(row) {
  return `${row.periodLabel} 年${Number(row.year) === 2025 ? ' · 部分预估' : ''}\n${industryMetrics.map((metric) => `${metric.label} ${formatIndustryMetric(row, metric)}`).join('\n')}`;
}

function renderProfitTrend(rows, state) {
  const container = document.querySelector('[data-profit-trend]');
  const legend = document.querySelector('[data-profit-legend]');
  if (!container || !legend) return;

  container.innerHTML = lineChart(rows, modeSeries, {
    width: 360,
    height: 128,
    margin: { top: 18, right: 18, bottom: 24, left: 40 },
    showYAxisTicks: true,
    showYAxisLabel: false,
    xTickInterval: 5,
    xKey: 'year',
    yLabel: '元/箱',
  });
  legend.innerHTML = modeSeries
    .map((item) => `<span data-term-key="${item.termKey}"><i style="background:${item.color}"></i>${item.label}</span>`)
    .join('');
}

function renderModeComparison(row, state) {
  const container = document.querySelector('[data-mode-comparison]');
  const legend = document.querySelector('[data-profit-legend]');
  if (!container) return;

  const bars = [
    { label: '大转地', termKey: 'intensive_migratory', value: row.intensive_migratory_profit_per_colony, color: 'var(--semantic-route)' },
    { label: '小转地', termKey: 'semi_migratory', value: row.semi_migratory_profit_per_colony, color: 'var(--semantic-weather)' },
    { label: '定地意蜂', termKey: 'stationary_italian', value: row.stationary_italian_profit_per_colony, color: 'var(--semantic-warning)' },
    { label: '定地中蜂', termKey: 'stationary_chinese', value: row.stationary_chinese_profit_per_colony, color: 'var(--semantic-positive)' },
  ];

  container.innerHTML = `
    ${horizontalBars(bars, { unit: '元/箱', selectedLabel: null })}
    <p class="chart-note">全国模式参考，非当前路线或个案实测值。最新年份：${row.year}；2024/2025 数据按资料说明为行业预估。</p>
  `;

  if (legend) {
    legend.querySelectorAll('span').forEach((item) => {
      item.classList.remove('is-active');
    });
  }
}

function renderCostStructure(row) {
  const container = document.querySelector('[data-cost-structure]');
  if (!container) return;

  const items = [
    { label: '饲喂', termKey: 'feed_cost', value: row.feed_sugar + row.pollen_feed, color: 'var(--semantic-bloom)' },
    {
      label: '运输',
      termKey: 'transport_cost',
      value: row.transport_fuel + row.transport_toll + row.transport_maintain + row.transport_labor,
      color: 'var(--semantic-route)',
    },
    { label: '蜂药', termKey: 'medicine_cost', value: row.medicine, color: 'var(--semantic-risk)' },
    { label: '设备', termKey: 'equipment_cost', value: row.equipment, color: 'var(--semantic-weather)' },
    { label: '蜂王', termKey: 'queen_cost', value: row.bee_queen, color: 'var(--semantic-warning)' },
    { label: '其他', termKey: 'other_cost', value: row.other_cost, color: 'var(--semantic-muted-data)' },
  ];

  container.innerHTML = `
    ${pieChart(items, { label: '成本投入占比' })}
    <p class="chart-note">总成本：${formatCurrency(row.total_cost)} 元/户，${row.year} 年估算。</p>
  `;
}

function renderIncomeComposition(row) {
  const container = document.querySelector('[data-income-composition]');
  if (!container) return;

  const items = [
    { label: '蜂蜜', termKey: 'honey_income', value: row.honey_sales, color: 'var(--semantic-route)' },
    { label: '王浆', termKey: 'royal_jelly_income', value: row.royal_jelly, color: 'var(--semantic-bloom)' },
    { label: '花粉', termKey: 'pollen_income', value: row.pollen, color: 'var(--semantic-warning)' },
    { label: '蜂胶', termKey: 'propolis_income', value: row.propolis, color: 'var(--semantic-positive)' },
    { label: '授粉', termKey: 'pollination_income', value: row.pollination_service, color: 'var(--semantic-weather)' },
    { label: '其他', termKey: 'other_income', value: row.beeswax + row.colony_sales + row.other_income, color: 'var(--semantic-muted-data)' },
  ];

  container.innerHTML = `
    ${pieChart(items, { label: '收入来源占比' })}
    <p class="chart-note">蜂蜜收入占 ${formatNumber(row.honey_share_pct, 1)}%，授粉服务占 ${formatNumber(row.pollination_share_pct, 1)}%。</p>
  `;
}

function renderFinanceStructureInsight(row) {
  const container = document.querySelector('[data-finance-structure-insight]');
  if (!container) return;

  const feedAndTransport =
    row.feed_sugar + row.pollen_feed + row.transport_fuel + row.transport_toll + row.transport_maintain + row.transport_labor;
  const feedTransportShare = (feedAndTransport / row.total_cost) * 100;
  const honeyPollinationShare = row.honey_share_pct + row.pollination_share_pct;

  container.innerHTML = `<strong>${row.year} 年结构观察：</strong>成本端饲喂与运输合计约 ${formatNumber(feedTransportShare, 1)}%，收入端蜂蜜与授粉合计约 ${formatNumber(honeyPollinationShare, 1)}%；迁徙经营同时受路途投入和主业价格波动影响。`;
}

function pieChart(items, options) {
  const total = items.reduce((sum, item) => sum + Number(item.value), 0);
  const size = 106;
  const center = size / 2;
  const radius = 47;
  let startAngle = -Math.PI / 2;

  const slices = items.map((item) => {
    const ratio = Number(item.value) / total;
    const endAngle = startAngle + ratio * Math.PI * 2;
    const startX = center + radius * Math.cos(startAngle);
    const startY = center + radius * Math.sin(startAngle);
    const endX = center + radius * Math.cos(endAngle);
    const endY = center + radius * Math.sin(endAngle);
    const largeArc = ratio > 0.5 ? 1 : 0;
    const path = `M ${center} ${center} L ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)} Z`;
    startAngle = endAngle;
    return `<path d="${path}" style="fill:${item.color}" data-viz-tooltip="${escapeAttribute(`${item.label}：${formatCurrency(item.value)} 元\n占比 ${formatNumber(ratio * 100, 1)}%`)}"></path>`;
  }).join('');

  return `<div class="compact-pie-layout">
    <svg class="compact-pie-chart" viewBox="0 0 ${size} ${size}" role="img" aria-label="${options.label}">
      ${slices}
    </svg>
    <div class="compact-pie-legend">
      ${items.map((item) => {
        const ratio = Number(item.value) / total;
        return `<span data-viz-tooltip="${escapeAttribute(`${item.label}：${formatCurrency(item.value)} 元\n占比 ${formatNumber(ratio * 100, 1)}%`)}"><i style="--legend-color:${item.color}; --legend-share:${(ratio * 100).toFixed(1)}%"></i><em data-term-key="${item.termKey || ''}">${item.label}</em><strong>${formatNumber(ratio * 100, 1)}%</strong></span>`;
      }).join('')}
    </div>
  </div>`;
}

function renderPesticideReference(rows) {
  const container = document.querySelector('[data-pesticide-reference]');
  if (!container) return;

  const series = [
    {
      key: '单位面积农药使用量_千克每公顷',
      label: '单位面积农药使用强度',
      color: 'var(--semantic-risk)',
    },
  ];
  const latest = getLatestByYear(rows);

  container.innerHTML = `
    ${lineChart(rows, series, { width: 360, height: 120, xKey: 'year', yLabel: 'kg/ha' })}
    <p class="chart-note">2023 年为 ${formatNumber(latest['单位面积农药使用量_千克每公顷'], 2)} kg/ha。该数据为国家级年均参考，不定位到具体路线。</p>
  `;
}

function renderRiskCaveats() {
  const container = document.querySelector('[data-risk-caveats]');
  if (!container) return;
  const caveats = [
    '授粉数据为案例级/地区级，只用于节点旁预览和右侧解释，不作为精确路段收入。',
    '农药使用强度为国家级年度数据，只作为背景趋势，不推断到某条路线或某个省。',
    '省域气候表从 2000 年开始，1980s 路线不做省域年度气候趋势判断。',
    '2024/2025 财务数据按资料说明为估算或预估，界面保留“估算”标注。',
  ];
  container.innerHTML = caveats.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
}

function lineChart(rows, series, options) {
  const margin = { top: 18, right: 18, bottom: 24, left: 36, ...options.margin };
  const width = options.width;
  const height = options.height;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const years = rows.map((row) => row[options.xKey]);
  const values = series.flatMap((item) => rows.map((row) => row[item.key])).filter(Number.isFinite);
  const minY = Math.min(...values) * 0.92;
  const maxY = Math.max(...values) * 1.04;

  const x = (year) => {
    const index = years.indexOf(year);
    return margin.left + (index / Math.max(years.length - 1, 1)) * chartWidth;
  };
  const y = (value) => margin.top + chartHeight - ((value - minY) / (maxY - minY || 1)) * chartHeight;

  const paths = series
    .map((item) => {
      const d = rows
        .map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(row[options.xKey]).toFixed(1)} ${y(row[item.key]).toFixed(1)}`)
        .join(' ');
      return `<path d="${d}" style="stroke:${item.color}" />`;
    })
    .join('');
  const points = series
    .map((item) =>
      rows
        .map((row) => {
          const value = row[item.key];
          const label = `${item.label}\n${row[options.xKey]} 年：${formatNumber(value, 2)} ${options.yLabel}`;
          return `
            <circle
              class="data-point-hit"
              cx="${x(row[options.xKey]).toFixed(1)}"
              cy="${y(value).toFixed(1)}"
              r="8"
              data-viz-tooltip="${escapeAttribute(label)}"
            ></circle>
            <circle
              class="data-point-dot"
              cx="${x(row[options.xKey]).toFixed(1)}"
              cy="${y(value).toFixed(1)}"
              r="3"
              style="fill:${item.color}"
            ></circle>
          `;
        })
        .join(''),
    )
    .join('');

  const grid = [0, 0.5, 1]
    .map((ratio) => {
      const gridY = margin.top + ratio * chartHeight;
      return `<line x1="${margin.left}" x2="${width - margin.right}" y1="${gridY}" y2="${gridY}" class="chart-grid" />`;
    })
    .join('');
  const yAxisLabels = options.showYAxisTicks
    ? [0, 0.5, 1]
        .map((ratio) => {
          const tickValue = maxY - ratio * (maxY - minY);
          const tickY = margin.top + ratio * chartHeight;
          return `<text x="${margin.left - 8}" y="${tickY + 3}" text-anchor="end" class="axis-label line-y-axis">${formatNumber(tickValue, 0)}</text>`;
        })
        .join('')
    : '';
  const xTicks = options.xTickInterval
    ? rows.filter((row) => Number(row[options.xKey]) % options.xTickInterval === 0)
    : [rows[0], rows[rows.length - 1]];
  const axisLabels = xTicks
    .map((row) => `<text x="${x(row[options.xKey]).toFixed(1)}" y="${height - 5}" text-anchor="middle" class="axis-label line-x-axis">${row[options.xKey]}</text>`)
    .join('');
  const yAxisTitle = options.showYAxisLabel === false ? '' : `<text x="${margin.left}" y="12" class="axis-label">${options.yLabel}</text>`;

  return `
    <svg class="data-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.yLabel}趋势图">
      ${grid}
      ${yAxisLabels}
      ${paths}
      ${points}
      ${axisLabels}
      ${yAxisTitle}
    </svg>
  `;
}

function horizontalBars(items, options) {
  const max = Math.max(...items.map((item) => item.value));
  return `
    <div class="horizontal-bars">
      ${items
        .map(
          (item) => `
            <div class="bar-row${item.label === options.selectedLabel ? ' is-selected' : ''}" data-viz-tooltip="${escapeAttribute(
              `${item.label}：${formatNumber(item.value, 0)} ${options.unit}`,
            )}">
              <span data-term-key="${item.termKey || ''}">${item.label}</span>
              <div class="bar-track">
                <i style="width:${(item.value / max) * 100}%; background:${item.color}"></i>
              </div>
              <strong class="numeric">${formatNumber(item.value, 0)} ${options.unit}</strong>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function stackedBar(items) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return `
    <div class="stacked-bar" aria-hidden="true">
      ${items
        .map(
          (item) =>
            `<i style="width:${(item.value / total) * 100}%; background:${item.color}" data-viz-tooltip="${escapeAttribute(
              `${item.label}：${formatCurrency(item.value)} 元\n占比 ${formatNumber((item.value / total) * 100, 1)}%`,
            )}"></i>`,
        )
        .join('')}
    </div>
  `;
}

function itemBreakdown(items, total) {
  return `
    <div class="breakdown-list">
      ${items
        .map(
          (item) => `
            <span data-viz-tooltip="${escapeAttribute(
              `${item.label}：${formatCurrency(item.value)} 元\n占比 ${formatNumber((item.value / total) * 100, 1)}%`,
            )}">
              <i style="background:${item.color}"></i>
              <b class="breakdown-term" data-term-key="${item.termKey || ''}">${item.label}</b>
              <strong>${formatNumber((item.value / total) * 100, 1)}%</strong>
            </span>
          `,
        )
        .join('')}
    </div>
  `;
}

function summarizeSelectedRoutes(rows) {
  const weatherDays = rows.reduce((sum, row) => sum + Number(row.weather_day_count || 0), 0);
  const goodDays = rows.reduce((sum, row) => sum + Number(row.good_days || 0), 0);
  const riskValues = rows.map((row) => Number(row.climateRiskIndex)).filter(Number.isFinite);
  const nwiValues = rows.map((row) => Number(row.avgNWI)).filter(Number.isFinite);

  return {
    segmentCount: rows.length,
    distance: rows.reduce((sum, row) => sum + Number(row.segment_km || 0), 0),
    goodHoneyRate: weatherDays ? goodDays / weatherDays : 0,
    avgNWI: nwiValues.reduce((sum, value) => sum + value, 0) / (nwiValues.length || 1),
    riskIndex: riskValues.reduce((sum, value) => sum + value, 0) / (riskValues.length || 1),
  };
}

function describeRouteClassification(rows) {
  const routeTypes = new Set(rows.map((row) => row.route_type).filter(Boolean));
  if (routeTypes.size !== 1) return '多路线对照';
  const [routeType] = routeTypes;
  if (routeType === 'classic') return '经典跨区域迁徙路线';
  if (routeType === 'variant') return '区域转地路线';
  if (routeType === 'beekeeper_case') return '蜂农个案路线';
  return '迁徙路线';
}

function eraMatches(rowEra, selectedEra) {
  return rowEra === selectedEra || String(rowEra).includes(selectedEra);
}

function getLatestByYear(rows) {
  return rows.reduce((latest, row) => (Number(row.year) > Number(latest.year) ? row : latest), rows[0]);
}

function setupDataTooltips() {
  if (tooltipInitialized) return;
  tooltipInitialized = true;

  const tooltip = document.createElement('div');
  tooltip.className = 'data-hover-tooltip';
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  document.addEventListener('pointerover', (event) => {
    const target = event.target.closest('[data-term-key], [data-viz-tooltip]');
    if (!target) return;
    const content = target.dataset.termKey ? termDefinitions[target.dataset.termKey] : target.dataset.vizTooltip;
    if (!content) return;

    target.classList.add('is-tooltip-active');
    tooltip.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
    tooltip.hidden = false;
    positionTooltip(event, tooltip);
  });

  document.addEventListener('pointermove', (event) => {
    if (tooltip.hidden) return;
    positionTooltip(event, tooltip);
  });

  document.addEventListener('pointerout', (event) => {
    const target = event.target.closest('[data-term-key], [data-viz-tooltip]');
    if (!target) return;
    if (target.contains(event.relatedTarget)) return;

    target.classList.remove('is-tooltip-active');
    tooltip.hidden = true;
  });
}

function positionTooltip(event, tooltip) {
  const offset = 14;
  const rect = tooltip.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width - offset;
  const maxTop = window.innerHeight - rect.height - offset;
  const left = Math.max(offset, Math.min(event.clientX + offset, maxLeft));
  const top = Math.max(offset, Math.min(event.clientY + offset, maxTop));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function monthWindowLabel(value) {
  if (value === 'spring') return '春花期';
  if (value === 'summer') return '夏蜜源';
  return '全年路线';
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return '--';
  return `${formatNumber(Number(value) * 100, 0)}%`;
}

function formatNumber(value, digits = 2) {
  if (typeof value === 'string' && value.trim() === '') return '--';
  if (!Number.isFinite(Number(value))) return '--';
  return Number(value).toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : undefined,
  });
}

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return '--';
  return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showPanelError(error) {
  const container = document.querySelector('[data-livelihood-kpis]');
  if (container) {
    container.innerHTML = `<div class="panel-loading">数据载入失败：${error.message}</div>`;
  }
  console.error(error);
}
