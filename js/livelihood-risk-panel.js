import { appState, subscribe } from './state.js';
import { loadLivelihoodData } from './data-loader.js';

const routeLabels = {
  'east-coastal': '东线（沿海线）',
  'west-northwest': '西线（西北线）',
  'central-route': '中线（京广线）',
  'south-route': '南线',
};

const routeModeMap = {
  'east-coastal': '大转地',
  'west-northwest': '大转地',
  'central-route': '大转地',
  'south-route': '大转地',
};

const modeSeries = [
  { key: 'intensive_migratory_profit_per_colony', label: '大转地', color: 'var(--semantic-route)' },
  { key: 'semi_migratory_profit_per_colony', label: '小转地', color: 'var(--semantic-weather)' },
  { key: 'stationary_italian_profit_per_colony', label: '定地意蜂', color: 'var(--semantic-warning)' },
  { key: 'stationary_chinese_profit_per_colony', label: '定地中蜂', color: 'var(--semantic-positive)' },
];

let tooltipInitialized = false;
let livelihoodData = null;

export function initLivelihoodRiskPanel() {
  subscribe((state) => {
    updateStatusBar(state);
    if (livelihoodData) renderStatefulPanels(state, livelihoodData);
  });
  updateStatusBar(appState);
  renderLivelihoodPanel().catch(showPanelError);
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

  renderKpis(livelihoodData.industryLatest, latestFinance);
  renderProfitTrend(livelihoodData.profitByMode, appState);
  renderCostStructure(latestFinance);
  renderIncomeComposition(latestFinance);
  renderPesticideReference(livelihoodData.pesticide);
  renderStatefulPanels(appState, livelihoodData);
  renderRiskCaveats();
  setupDataTooltips();
}

function renderStatefulPanels(state, data) {
  const latestProfit = getLatestByYear(data.profitByMode);
  renderModeComparison(latestProfit, state);
  renderRouteRiskFocus(state, data);
}

function renderRouteRiskFocus(state, data) {
  const container = document.querySelector('[data-route-risk-focus]');
  if (!container) return;

  const selectedRouteNames = state.selectedRoutes.map((routeId) => routeLabels[routeId] || routeId);
  const routeRows = data.routeSegmentSummary.filter((row) => selectedRouteNames.includes(row.route_name) && eraMatches(row.era, state.selectedEra));
  const routeSummary = summarizeSelectedRoutes(routeRows);
  const selectedNode = state.selectedNodeSummary;

  if (!routeRows.length) {
    container.innerHTML = `
      <header class="data-card-header">
        <div>
          <h3 class="section-title">当前路线风险解释</h3>
          <p class="caption">当前年代暂无匹配路线摘要</p>
        </div>
      </header>
      <div class="panel-loading">请选择左侧路线，或切换年代查看可用数据。</div>
    `;
    return;
  }

  const routeMode = inferSelectedMode(state);
  const modeProfit = getModeProfit(getProfitForEra(data.profitByMode, state.selectedEra), routeMode);
  const pollinationCount = routeRows.reduce((sum, row) => sum + Number(row.pollination_case_count || 0), 0);
  const weatherCaveatCount = routeRows.filter((row) => row.weather_match_scope !== 'exact_stay_window').length;
  const worstSegments = routeRows
    .slice()
    .sort((a, b) => Number(b.climateRiskIndex || 0) - Number(a.climateRiskIndex || 0))
    .slice(0, 3);

  container.innerHTML = `
    <header class="data-card-header">
      <div>
        <h3 class="section-title">当前路线风险解释</h3>
        <p class="caption">${escapeHtml(selectedRouteNames.join(' / '))} · ${state.selectedEra}</p>
      </div>
    </header>
    <div class="route-risk-kpis">
      <span data-viz-tooltip="${escapeAttribute('由 route_segment_summary.csv 聚合：所选路线当前年代的路段数')}">路段 <strong>${routeSummary.segmentCount}</strong></span>
      <span data-viz-tooltip="${escapeAttribute('由 segment_km 汇总；多个路线选择时为合计值')}">里程 <strong>${formatNumber(routeSummary.distance, 0)} km</strong></span>
      <span data-viz-tooltip="${escapeAttribute('由逐日 good_honey_day / weather_day_count 聚合')}">采蜜率 <strong>${formatPercent(routeSummary.goodHoneyRate)}</strong></span>
      <span data-viz-tooltip="${escapeAttribute('由 climateRiskIndex 聚合，0 低、1 高')}">风险 <strong>${formatNumber(routeSummary.riskIndex, 2)}</strong></span>
    </div>
    <div class="route-risk-reading">
      <p>${buildRouteReading(routeSummary, routeMode, modeProfit, pollinationCount, weatherCaveatCount)}</p>
      ${selectedNode ? renderSelectedNodeReading(selectedNode) : '<p class="chart-note">点击中央路径节律图中的节点后，这里会切换到该节点的天气与生计解释。</p>'}
    </div>
    <div class="risk-segment-list">
      ${worstSegments
        .map(
          (row) => `
            <span data-viz-tooltip="${escapeAttribute(buildSegmentTooltip(row))}">
              <i style="width:${Math.max(Number(row.climateRiskIndex || 0) * 100, 4)}%"></i>
              ${escapeHtml(row.route_name)} · ${escapeHtml(row.to_location)} · ${escapeHtml(row.nectar_sources)}
              <strong>${formatNumber(row.climateRiskIndex, 2)}</strong>
            </span>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderSelectedNodeReading(node) {
  const caveat = node.data_quality_note ? `<p class="data-caveat-note">${escapeHtml(node.data_quality_note)}</p>` : '';
  const pollination =
    Number(node.pollination_case_count) > 0
      ? `该省域匹配到 ${node.pollination_case_count} 个授粉案例（${escapeHtml(node.pollination_crops || '')}），适合作为补充收入/服务场景参考。`
      : '该节点没有匹配到授粉案例，不在中央图中强行标注授粉收益。';
  return `
    <div class="selected-node-reading">
      <strong>${escapeHtml(node.route_name)} · ${escapeHtml(node.location)} · ${escapeHtml(node.nectar_sources)}</strong>
      <p>该节点平均 NWI 为 ${formatNumber(node.avgNWI, 0)}，有效采蜜率 ${formatPercent(node.goodHoneyRate)}，最长连续恶劣天气 ${formatNumber(
        node.maxBadStreak,
        0,
      )} 天。${node.maxBadStreak >= 3 ? '这会直接压缩 L5 有效窗口。' : '当前节点未出现 3 天及以上连续恶劣中断。'}</p>
      <p>${pollination}</p>
      ${caveat}
    </div>
  `;
}

function buildRouteReading(summary, routeMode, modeProfit, pollinationCount, weatherCaveatCount) {
  const riskTone =
    summary.riskIndex >= 0.62
      ? '天气窗口偏紧，风险主要来自连续低 NWI 或降水中断'
      : summary.riskIndex >= 0.38
        ? '天气窗口存在波动，需要结合节点逐日详情判断'
        : '天气窗口整体较稳，主要矛盾更可能来自运输成本与市场价格';
  const modeText = modeProfit ? `${routeMode}最新可比单箱利润约 ${formatCurrency(modeProfit)} 元/箱` : `${routeMode}模式利润暂无匹配`;
  const caveatText = weatherCaveatCount ? `其中 ${weatherCaveatCount} 个路段存在天气年份替代或缺失，需要以备注为准。` : '逐日天气与路段停留窗口匹配较完整。';
  const pollinationText = pollinationCount ? `所选路线共匹配 ${pollinationCount} 个省域授粉案例，可作为补充收入场景。` : '授粉案例未覆盖当前路线节点。';
  return `${riskTone}。${modeText}；${pollinationText}${caveatText}`;
}

function renderKpis(industryLatest, latestFinance) {
  const container = document.querySelector('[data-livelihood-kpis]');
  if (!container) return;

  const colony = findLatestIndicator(industryLatest, '国内统计蜂群');
  const globalShare = findLatestIndicator(industryLatest, '全球占比');
  const outputValue = findLatestIndicator(industryLatest, '产值');
  const consumption = findLatestIndicator(industryLatest, '人均消费量');

  const kpis = [
    {
      label: '国内蜂群',
      value: colony ? `${colony.value}${colony.unit}` : '--',
      note: colony?.year ? `${colony.year} 年` : '行业数据',
    },
    {
      label: '全球产蜜占比',
      value: globalShare ? `${formatNumber(globalShare.value)}${globalShare.unit}` : '--',
      note: globalShare?.year ? `${globalShare.year} 年` : '行业数据',
    },
    {
      label: '蜂产业产值',
      value: outputValue ? `${outputValue.value}${outputValue.unit}` : '--',
      note: outputValue?.year ? `${outputValue.year} 年` : '行业趋势',
    },
    {
      label: '授粉收入占比',
      value: `${formatNumber(latestFinance.pollination_share_pct, 1)}%`,
      note: `${latestFinance.year} 年估算`,
    },
    {
      label: '蜂农利润率',
      value: `${formatNumber(latestFinance.profit_margin_pct, 1)}%`,
      note: `${latestFinance.year} 年估算`,
    },
    {
      label: '人均消费量',
      value: consumption ? `${consumption.value}${consumption.unit}` : '--',
      note: consumption?.notes || '消费潜力参考',
    },
  ];

  container.innerHTML = kpis
    .map(
      (kpi) => `
        <article class="kpi-card" data-viz-tooltip="${escapeAttribute(`${kpi.label}：${kpi.value}\n${kpi.note}`)}">
          <span class="caption">${kpi.label}</span>
          <strong class="metric-value">${kpi.value}</strong>
          <span class="kpi-note">${kpi.note}</span>
        </article>
      `,
    )
    .join('');
}

function renderProfitTrend(rows, state) {
  const container = document.querySelector('[data-profit-trend]');
  const legend = document.querySelector('[data-profit-legend]');
  if (!container || !legend) return;

  container.innerHTML = lineChart(rows, modeSeries, {
    width: 360,
    height: 190,
    xKey: 'year',
    yLabel: '元/箱',
  });
  legend.innerHTML = modeSeries
    .map((item) => `<span class="${item.label === inferSelectedMode(state) ? 'is-active' : ''}"><i style="background:${item.color}"></i>${item.label}</span>`)
    .join('');
}

function renderModeComparison(row, state) {
  const container = document.querySelector('[data-mode-comparison]');
  const legend = document.querySelector('[data-profit-legend]');
  if (!container) return;

  const selectedMode = inferSelectedMode(state);
  const bars = [
    { label: '大转地', value: row.intensive_migratory_profit_per_colony, color: 'var(--semantic-route)' },
    { label: '小转地', value: row.semi_migratory_profit_per_colony, color: 'var(--semantic-weather)' },
    { label: '定地意蜂', value: row.stationary_italian_profit_per_colony, color: 'var(--semantic-warning)' },
    { label: '定地中蜂', value: row.stationary_chinese_profit_per_colony, color: 'var(--semantic-positive)' },
  ];

  container.innerHTML = `
    ${horizontalBars(bars, { unit: '元/箱', selectedLabel: selectedMode })}
    <p class="chart-note">最新年份：${row.year}。2024/2025 数据按资料说明为行业预估。</p>
  `;

  if (legend) {
    legend.querySelectorAll('span').forEach((item) => {
      item.classList.toggle('is-active', item.textContent.trim() === selectedMode);
    });
  }
}

function renderCostStructure(row) {
  const container = document.querySelector('[data-cost-structure]');
  if (!container) return;

  const items = [
    { label: '饲喂', value: row.feed_sugar + row.pollen_feed, color: 'var(--semantic-bloom)' },
    {
      label: '运输',
      value: row.transport_fuel + row.transport_toll + row.transport_maintain + row.transport_labor,
      color: 'var(--semantic-route)',
    },
    { label: '蜂药', value: row.medicine, color: 'var(--semantic-risk)' },
    { label: '设备', value: row.equipment, color: 'var(--semantic-weather)' },
    { label: '蜂王', value: row.bee_queen, color: 'var(--semantic-warning)' },
    { label: '其他', value: row.other_cost, color: 'var(--semantic-muted-data)' },
  ];

  container.innerHTML = `
    ${stackedBar(items)}
    ${itemBreakdown(items, row.total_cost)}
    <p class="chart-note">总成本：${formatCurrency(row.total_cost)} 元/户，${row.year} 年估算。</p>
  `;
}

function renderIncomeComposition(row) {
  const container = document.querySelector('[data-income-composition]');
  if (!container) return;

  const items = [
    { label: '蜂蜜', value: row.honey_sales, color: 'var(--semantic-route)' },
    { label: '王浆', value: row.royal_jelly, color: 'var(--semantic-bloom)' },
    { label: '花粉', value: row.pollen, color: 'var(--semantic-warning)' },
    { label: '蜂胶', value: row.propolis, color: 'var(--semantic-positive)' },
    { label: '授粉', value: row.pollination_service, color: 'var(--semantic-weather)' },
    { label: '其他', value: row.beeswax + row.colony_sales + row.other_income, color: 'var(--semantic-muted-data)' },
  ];

  container.innerHTML = `
    ${stackedBar(items)}
    ${itemBreakdown(items, row.total_income)}
    <p class="chart-note">蜂蜜收入占 ${formatNumber(row.honey_share_pct, 1)}%，授粉服务占 ${formatNumber(row.pollination_share_pct, 1)}%。</p>
  `;
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
  const margin = { top: 18, right: 18, bottom: 24, left: 36 };
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

  return `
    <svg class="data-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.yLabel}趋势图">
      ${grid}
      ${paths}
      ${points}
      <text x="${margin.left}" y="${height - 5}" class="axis-label">${years[0]}</text>
      <text x="${width - margin.right}" y="${height - 5}" text-anchor="end" class="axis-label">${years[years.length - 1]}</text>
      <text x="${margin.left}" y="12" class="axis-label">${options.yLabel}</text>
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
              <span>${item.label}</span>
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
              ${item.label}
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

  return {
    segmentCount: rows.length,
    distance: rows.reduce((sum, row) => sum + Number(row.segment_km || 0), 0),
    goodHoneyRate: weatherDays ? goodDays / weatherDays : 0,
    riskIndex: riskValues.reduce((sum, value) => sum + value, 0) / (riskValues.length || 1),
  };
}

function buildSegmentTooltip(row) {
  return `${row.route_name} · ${row.to_location}\n${row.nectar_sources}\n采蜜率 ${formatPercent(
    Number(row.goodHoneyRate),
  )} · NWI ${formatNumber(row.avgNWI, 0)}\n最长连续恶劣 ${formatNumber(row.maxBadStreak, 0)} 天`;
}

function inferSelectedMode(state) {
  const routeModes = state.selectedRoutes.map((routeId) => routeModeMap[routeId]).filter(Boolean);
  return routeModes[0] || '大转地';
}

function getProfitForEra(rows, era) {
  const targetYear = era === '1980s' ? 2005 : era === '2000s' ? 2005 : 2023;
  return rows.find((row) => Number(row.year) === targetYear) || getLatestByYear(rows);
}

function getModeProfit(row, mode) {
  if (!row) return null;
  if (mode === '小转地') return row.semi_migratory_profit_per_colony;
  if (mode === '定地意蜂') return row.stationary_italian_profit_per_colony;
  if (mode === '定地中蜂') return row.stationary_chinese_profit_per_colony;
  return row.intensive_migratory_profit_per_colony;
}

function eraMatches(rowEra, selectedEra) {
  return rowEra === selectedEra || String(rowEra).includes(selectedEra);
}

function getLatestByYear(rows) {
  return rows.reduce((latest, row) => (Number(row.year) > Number(latest.year) ? row : latest), rows[0]);
}

function findLatestIndicator(rows, indicator) {
  return rows
    .filter((row) => row.indicator === indicator)
    .sort((a, b) => Number(b.year) - Number(a.year))[0];
}

function setupDataTooltips() {
  if (tooltipInitialized) return;
  tooltipInitialized = true;

  const tooltip = document.createElement('div');
  tooltip.className = 'data-hover-tooltip';
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  document.addEventListener('pointerover', (event) => {
    const target = event.target.closest('[data-viz-tooltip]');
    if (!target) return;

    target.classList.add('is-active');
    tooltip.innerHTML = escapeHtml(target.dataset.vizTooltip).replace(/\n/g, '<br>');
    tooltip.hidden = false;
    positionTooltip(event, tooltip);
  });

  document.addEventListener('pointermove', (event) => {
    if (tooltip.hidden) return;
    positionTooltip(event, tooltip);
  });

  document.addEventListener('pointerout', (event) => {
    const target = event.target.closest('[data-viz-tooltip]');
    if (!target) return;
    if (target.contains(event.relatedTarget)) return;

    target.classList.remove('is-active');
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
