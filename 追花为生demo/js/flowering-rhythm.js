import { loadComponents } from './component-loader.js';
import { initRouteMapPanel } from './route-map-panel.js';
import { initLivelihoodRiskPanel } from './livelihood-risk-panel.js';
import { appState, setSelectedNode, subscribe, updateState } from './state.js';
import { dataFiles, loadCsv } from './data-loader.js';

const eastSegments = [
  { id: 1, route: '福建 → 广东', dates: '12/02–12/12', start: [12, 2], end: [12, 12], flowerWindows: [[12, 2, 12, 12]], source: '鸭脚木、野桂花补给', note: '荔枝未开，仅表示低权重越冬补给。' },
  { id: 2, route: '浙江 → 安徽', dates: '02/17–03/07', start: [2, 17], end: [3, 7], flowerWindows: [[2, 17, 3, 7]], source: '油菜、紫云英', note: '油菜盛花转尾花，紫云英进入花期。' },
  { id: 3, route: '江苏 → 江苏', dates: '04/02–04/22', start: [4, 2], end: [4, 22], flowerWindows: [[4, 2, 4, 22]], source: '甘蓝型油菜、紫云英', note: '油菜尾花；紫云英为区域参考。', reference: true },
  { id: 4, route: '山东 → 山东', dates: '05/02–05/22', start: [5, 2], end: [5, 22], flowerWindows: [[5, 2, 5, 10]], source: '刺槐', note: '5 月上旬快速进入尾花，花期较短。' },
  { id: 5, route: '辽宁 → 辽宁', dates: '05/25–06/07', start: [5, 25], end: [6, 7], flowerWindows: [[5, 25, 6, 7]], source: '刺槐（二趟）', note: '北方物候与省级记录存在来源冲突。', reference: true },
  { id: 6, route: '吉林 → 黑龙江', dates: '06/12–07/12', start: [6, 12], end: [7, 12], flowerWindows: [[6, 12, 7, 12]], source: '椴树', note: '从初花、花势上升进入 7 月盛花。', upperLaneShift: 1 },
  { id: 7, route: '内蒙古 → 内蒙古', dates: '07/17–08/17', start: [7, 17], end: [8, 17], flowerWindows: [[8, 1, 8, 17]], source: '向日葵、胡枝子', note: '向日葵走向盛花；胡枝子资料不足。', upperLaneShift: 1, reference: true },
  { id: 8, route: '广东 → 福建', dates: '11/12–11/28', start: [11, 12], end: [11, 28], flowerWindows: [[11, 12, 11, 28]], source: '枇杷、鸭脚木补给', note: '南返越冬补给，使用窄带和较低权重。' },
];

let segments = eastSegments;
let segmentNwi = [85.36, 52.7, 71.9, 71.19, 83.21, 74.55, 80.69, 73];
const dailyNwiDataUrl = 'project_reference/data/\u517b\u8702\u6570\u636e/datasets/weather_daily_migration_routes.csv';
const eastCoastalRouteName = '\u4e1c\u7ebf\uff08\u6cbf\u6d77\u7ebf\uff09';
const canvasViewBox = { x: -140, y: -160, width: 1422, height: 1452 };
// Authored East-route geometry, retained independently from the imported
// highlight SVGs. West and South use their SVG path geometry instead.
const eastArcModel = {
  lower: {
    cx: 338.116, cy: 464.81, startAngle: 164.13, endAngle: -15.78, startOrdinal: 1, endOrdinal: 182,
    radii: [161.987, 179.566, 197.782, 216.537, 236.244, 254.624, 272.46, 290.814, 309.25],
  },
  upper: {
    cx: 808.4, cy: 336.095, startAngle: 165.05, endAngle: 344.61, startOrdinal: 182, endOrdinal: 366,
    radii: [155.922, 173.148, 192.412, 209.691, 227.879, 246.904, 265.372, 283.823, 302.257],
  },
};

const routeVisualConfigs = {
  'east-coastal': {
    winterFirst: true,
    routeName: eastCoastalRouteName,
    baseAsset: 'assets/flowering-rhythm/L0-base.svg',
    floweringAsset: 'assets/flowering-rhythm/L4-flowering.svg',
    baseFrame: { x: 0, y: 0, width: 1142, height: 1232 },
    floweringFrame: { x: 0, y: 0, width: 1142, height: 1232 },
    lineAssets: Array.from({ length: 8 }, (_, index) => `assets/flowering-rhythm/east-line-${index}.svg`),
    lineFrames: [
      { x: 169.94, y: 27.768 }, { x: 152.12, y: 46.218 }, { x: 134.47, y: 64.61 },
      { x: 116.62, y: 83.03 }, { x: 98.94, y: 101.37 }, { x: 81.25, y: 119.81 },
      { x: 63.55, y: 138.24 }, { x: 45.72, y: 156.56 },
    ].map((frame) => ({ ...frame, width: 942, height: 604 })),
  },
  'west-northwest': {
    winterFirst: true,
    routeName: '\u897f\u7ebf\uff08\u897f\u5317\u7ebf\uff09',
    baseAsset: 'assets/flowering-rhythm/routes/west/L0.svg',
    floweringAsset: 'assets/flowering-rhythm/routes/west/L4.svg',
    baseFrame: { x: 0, y: 0, width: 1140, height: 959 },
    floweringFrame: { x: 84.622, y: 242, width: 1048, height: 715 },
    // The supplied West crops are numbered from the innermost/bottom line
    // upward. Route data is ordered Yunnan through Xinjiang, top to bottom.
    lineAssets: Array.from({ length: 7 }, (_, index) => `assets/flowering-rhythm/routes/west/line-${6 - index}.svg`),
    lineFrames: [
      { x: 191.022, y: 352.41 }, { x: 173.372, y: 334 }, { x: 155.522, y: 315.5998 },
      { x: 137.842, y: 297.2302 }, { x: 120.152, y: 278.7701 }, { x: 102.452, y: 260.3498 },
      { x: 84.622, y: 242 },
    ].reverse().map((frame) => ({ ...frame, width: 942, height: 604 })),
  },
  'central-route': {
    winterFirst: true,
    routeName: '\u4e2d\u7ebf\uff08\u4eac\u5e7f\u7ebf\uff09',
    baseAsset: 'assets/flowering-rhythm/routes/central/L0.svg',
    floweringAsset: 'assets/flowering-rhythm/routes/central/L4.svg',
    baseFrame: { x: 0, y: 0, width: 1086, height: 1150 },
    floweringFrame: { x: 15, y: -101.694, width: 1326, height: 1307 },
    lineAssets: Array.from({ length: 6 }, (_, index) => `assets/flowering-rhythm/routes/central/line-${index}.svg`),
    // Seven data segments share six authored L0 lanes:
    // line1 广东-广西, line2 江西-湖南, line3 湖北, line4 河南+河南,
    // line5 河北-北京, line6 内蒙古.
    segmentLaneMap: [0, 1, 2, 3, 3, 4, 5],
    lineFrames: [
      { x: 136.1621, y: -0.001 }, { x: 111.959, y: 8.14 }, { x: 87.679, y: 16.303 },
      { x: 63.499, y: 24.371 }, { x: 39.234, y: 32.608 }, { x: 15, y: 40.735 },
    ].map((frame) => ({ ...frame, width: 950, height: 1110 })),
  },
  'south-route': {
    winterFirst: false,
    routeName: '\u5357\u7ebf',
    baseAsset: 'assets/flowering-rhythm/routes/south/L0.svg',
    floweringAsset: 'assets/flowering-rhythm/routes/south/L4.svg',
    baseFrame: { x: 0, y: 0, width: 1173, height: 1242 },
    floweringFrame: { x: 0, y: 0, width: 1173, height: 1242 },
    // South-route crops are exported from the outer/latest lane inward, while
    // the route data is ordered from the early Fujian-Anhui segment to the late
    // Hubei-Hunan segment. Reverse both assets and frames so every temporal
    // mark is calculated against the matching L0 lane.
    lineAssets: Array.from({ length: 6 }, (_, index) => `assets/flowering-rhythm/routes/south/line-${5 - index}.svg`),
    lineFrames: [
      { x: 126.7011, y: 212.539, width: 994, height: 975 },
      { x: 101.37, y: 212.539, width: 1019, height: 972 },
      { x: 76.068, y: 212.539, width: 1044, height: 968 },
      { x: 50.654, y: 212.54, width: 1046, height: 965 },
      { x: 25.367, y: 212.539, width: 1046, height: 962 },
      { x: 0, y: 212.54, width: 1046, height: 958 },
    ].reverse(),
  },
};

const primaryRouteIds = ['east-coastal', 'west-northwest', 'central-route', 'south-route'];
// The supplied combined SVG is authored as four horizontal time arcs, ordered
// top-to-bottom as Central, West, East, South.
const combinedRouteArcOrder = ['central-route', 'west-northwest', 'east-coastal', 'south-route'];
const combinedRouteAsset = 'assets/flowering-rhythm/combined/four-routes-combined-base.svg';
const combinedViewBox = { x: 0, y: 0, width: 1006, height: 751 };
const combinedCanvasBaseWidth = 1000;
const combinedRouteHighlightAssets = {
  'central-route': { asset: 'assets/flowering-rhythm/combined/route-highlights/central-route.svg', x: 105.17, y: 0, width: 901, height: 640 },
  'west-northwest': { asset: 'assets/flowering-rhythm/combined/route-highlights/west-northwest.svg', x: 68.04, y: 34.936, width: 906, height: 644 },
  'east-coastal': { asset: 'assets/flowering-rhythm/combined/route-highlights/east-coastal.svg', x: 30.98, y: 69.717, width: 910, height: 648 },
  'south-route': { asset: 'assets/flowering-rhythm/combined/route-highlights/south-route.svg', x: 0.01, y: 110.59, width: 903, height: 640 },
};
const combinedRouteColors = {
  'central-route': '#c89a5b',
  'west-northwest': '#6faeb2',
  'east-coastal': '#d88c52',
  'south-route': '#8fae8e',
};
const combinedCellTrackLinkDistance = 16;
const combinedSegmentLineMaxStep = 24;
const combinedMonthLabelPathIndexes = new Set([0, 1, 2, 3, 4, 11, 12, 13, 14, 15, 16, 24]);
const combinedRouteEndLabelPathIndexes = new Set([25, 26, 27, 28, 29, 30, 31, 32]);
const combinedRouteShortLabels = {
  'central-route': '中线',
  'west-northwest': '西线',
  'east-coastal': '东线',
  'south-route': '南线',
};

let currentRouteId = 'east-coastal';
let currentRouteConfig = routeVisualConfigs[currentRouteId];
let laneHighlightFrames = currentRouteConfig.lineFrames;
let laneDayPoints = [];
let routeGeometryCenter = { x: 571, y: 616 };
const nwiFocusViews = {
  1: { zoom: 3.2, scrollX: 0.98, scrollY: 0.13 },
  2: { zoom: 3.2, scrollX: 0.05, scrollY: 0.7 },
  3: { zoom: 3.2, scrollX: 0.52, scrollY: 0.68 },
  4: { zoom: 3.2, scrollX: 0.63, scrollY: 0.57 },
  5: { zoom: 3.2, scrollX: 0.7, scrollY: 0.49 },
  6: { zoom: 3.2, scrollX: 0.5, scrollY: 0.4 },
  7: { zoom: 2.75, scrollX: 0.3, scrollY: 0.22 },
  8: { zoom: 3.2, scrollX: 0.87, scrollY: 0.1 },
};
const nwiCalendarPlacements = {
  1: { x: 0.063, y: 0.07 },
  2: { x: 0.12, y: 0.23 },
  3: { x: 0.61, y: 0.285 },
  4: 'top-right',
  5: { x: 0.617, y: 0.232 },
  6: { x: 0.137, y: 0.487 },
  7: { x: 0.085, y: 0.129 },
  8: { x: 0.102, y: 0.14 },
};

const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const activeLayers = new Set(['l1', 'l2', 'l3', 'l4', 'l5', 'nwi']);
const dailyNwiBySegment = new Map();
const dailyWeatherBySegment = new Map();
const segmentMetricsByIndex = new Map();
const southWeatherWindows = {
  front: { start: dateToOrdinal(2, 17), end: dateToOrdinal(5, 17) },
  back: { start: dateToOrdinal(5, 17), end: dateToOrdinal(8, 12) },
};
let selectedNwiSegment = null;
let activeNwiDailyBubble = null;
let zoomBeforeNwiFocus = null;
let zoom = 1;
let hoveredLaneIndex = null;
let selectedLaneIndex = null;
let laneHighlightPathMarkup = Array.from({ length: 9 }, () => '');
let activeFloweringSourceUrl = '';
let laneStateSubscribed = false;
let routeSwitchSequence = Promise.resolve();
let isCombinedRouteMode = false;
let combinedDataPromise = null;
let combinedGeometryPromise = null;
let combinedRouteData = new Map();
let combinedDayPointsByRoute = new Map();
let combinedCellDetails = new Map();
let combinedCellsByRouteDay = new Map();
let hoveredCombinedSegmentKey = '';
let hoveredCombinedRouteId = '';
let combinedSegmentFocusState = null;
let originalFloweringLegendMarkup = null;
let originalFloweringLegendLabel = null;

async function bootstrap() {
  await loadComponents();
  const requestedRoute = new URLSearchParams(window.location.search).get('route');
  if (routeVisualConfigs[requestedRoute]) {
    currentRouteId = requestedRoute;
    currentRouteConfig = routeVisualConfigs[currentRouteId];
    laneHighlightFrames = currentRouteConfig.lineFrames;
    appState.activeRiskRoute = currentRouteId;
    appState.selectedRoutes = Array.from(new Set([...appState.selectedRoutes, currentRouteId]));
  }
  initRouteMapPanel();
  initLivelihoodRiskPanel();
  await loadRouteDefinition(currentRouteId);
  await loadFloweringOverlay();
  await loadDailyNwi();
  await loadSegmentMetrics();
  await renderLaneHighlights();
  renderAnnotationLayers();
  initNwiBubbleInteractions();
  initLaneInteractions();
  initLaneFocusBack();
  initLayerControls();
  initZoomControls();
  initNwiFocusControl();
  initCombinedSegmentFocusControl();
  initNwiOverviewCalendars();
  initRouteStatus();
  document.documentElement.dataset.ready = 'true';
  fitCurrentRouteView();
}

async function loadDailyNwi() {
  dailyNwiBySegment.clear();
  dailyWeatherBySegment.clear();
  try {
    const rows = await loadCsv(dailyNwiDataUrl);
    const routeRows = rows.filter((row) => row.route_name === currentRouteConfig.routeName);
    const isSouthRoute = currentRouteConfig.routeName === '\u5357\u7ebf';
    const isCentralRoute = currentRouteConfig.routeName === '\u4e2d\u7ebf\uff08\u4eac\u5e7f\u7ebf\uff09';
    const usesSegmentDateMatch = isSouthRoute || isCentralRoute;
    const currentRows = usesSegmentDateMatch
      ? routeRows
      : routeRows.filter((row) => String(row.stay_start || '').startsWith('2024-'));
    segments.forEach((segment, index) => {
      const start = monthDayKey(segment.start[0], segment.start[1]);
      const end = monthDayKey(segment.end[0], segment.end[1]);
      const segmentRows = currentRows
        .filter((row) => usesSegmentDateMatch
          ? dailyRowMatchesSegment(row, segment, index)
          : String(row.stay_start).slice(5) === start && String(row.stay_end).slice(5) === end);
      const latestRouteYear = Math.max(
        ...segmentRows
          .map((row) => Number(String(isCentralRoute ? row.stay_start || row.date : row.date).slice(0, 4)))
          .filter((year) => Number.isFinite(year)),
      );
      const weatherRows = segmentRows
        .filter((row) => !usesSegmentDateMatch
          || !Number.isFinite(latestRouteYear)
          || Number(String(isCentralRoute ? row.stay_start || row.date : row.date).slice(0, 4)) === latestRouteYear)
        .map((row) => {
          const ordinal = dateStringToOrdinal(row.date);
          const centralFlags = isCentralRoute ? centralDailyStayFlags(ordinal, segment) : null;
          return {
            ordinal,
            date: String(row.date),
            nwi: Number(row.nectar_weather_index),
            weather: String(row.weather_description || '—'),
            tempMin: Number(row.temp_min_c),
            tempMax: Number(row.temp_max_c),
            precipitation: Number(row.precipitation_mm),
            wind: Number(row.wind_max_kmh),
            badStreak: Number(row.bad_weather_streak),
            goodHoneyDay: Number(row.good_honey_day) === 1,
            inStayPeriod: centralFlags?.inStayPeriod ?? Number(row.in_stay_period) === 1,
            bufferBefore: centralFlags?.bufferBefore ?? Number(row.buffer_before) === 1,
            bufferAfter: centralFlags?.bufferAfter ?? Number(row.buffer_after) === 1,
          };
        })
        .filter((row) => Number.isFinite(row.nwi))
        .sort((a, b) => currentRouteId === 'central-route'
          ? chronologicalOrdinalForSegment(a.ordinal, segment) - chronologicalOrdinalForSegment(b.ordinal, segment)
          : a.ordinal - b.ordinal);
      const dailyRows = weatherRows.filter((row) => row.inStayPeriod);
      if (currentRouteConfig.routeName === '\u5357\u7ebf' && dailyRows.length) {
        segmentNwi[index] = dailyRows.reduce((sum, row) => sum + row.nwi, 0) / dailyRows.length;
      }
      dailyWeatherBySegment.set(index, weatherRows);
      dailyNwiBySegment.set(index, dailyRows);
    });
  } catch (error) {
    console.warn('NWI daily data unavailable:', error);
  }
}

async function loadSegmentMetrics() {
  segmentMetricsByIndex.clear();
  try {
    const rows = await loadCsv(dataFiles.routeSegmentSummary);
    rows
      .filter((row) => row.route_name === currentRouteConfig.routeName && row.era === '2020s')
      .forEach((row) => {
        const index = Number(row.segment_order) - 1;
        if (!segments[index]) return;
        segmentMetricsByIndex.set(index, {
          climateRiskIndex: Number(row.climateRiskIndex),
          bufferBeforeDays: Number(row.buffer_before_days),
          bufferAfterDays: Number(row.buffer_after_days),
          pollinationCaseCount: Number(row.pollination_case_count),
          pollinationCrops: String(row.pollination_crops || ''),
          pollinationPrices: String(row.pollination_price_range || ''),
          pollinationNote: String(row.pollination_source_note || ''),
          climateYear: Number(row.climate_year),
          climateSpringTemp: Number(row.climate_spring_temp_c),
          climateHeatDays: Number(row.climate_heat_days),
          climateRainstormDays: Number(row.climate_rainstorm_days),
          climateAdvanceDays: Number(row.climate_flowering_advance_days),
          climateSource: String(row.climate_source || ''),
        });
      });
  } catch (error) {
    console.warn('Route segment metrics unavailable:', error);
  }
}

async function loadRouteDefinition(routeId) {
  currentRouteId = routeVisualConfigs[routeId] ? routeId : 'east-coastal';
  currentRouteConfig = routeVisualConfigs[currentRouteId];
  laneHighlightFrames = currentRouteConfig.lineFrames;
  // East is the authored reference view. Keep its hand-positioned flowering
  // windows and labels intact; only the new West/South views use CSV-derived
  // route definitions.
  if (currentRouteId === 'east-coastal') {
    segments = eastSegments.map((segment) => ({
      ...segment,
      flowerWindows: segment.flowerWindows.map((window) => [...window]),
    }));
    segmentNwi = [85.36, 52.7, 71.9, 71.19, 83.21, 74.55, 80.69, 73];
    const base = document.querySelector('[data-l1-layer]');
    if (base) {
      base.src = resolveAssetUrl(currentRouteConfig.baseAsset);
      base.alt = currentRouteConfig.routeName + '全年时间分段与地点轨道基底';
      applyLayerFrame(base, currentRouteConfig.baseFrame);
    }
    return;
  }
  const rows = await loadCsv(dataFiles.routeSegmentSummary);
  const routeRows = rows
    .filter((row) => row.route_name === currentRouteConfig.routeName && row.era === '2020s')
    .sort((a, b) => Number(a.segment_order) - Number(b.segment_order))
    .slice(0, currentRouteConfig.segmentLaneMap?.length || currentRouteConfig.lineFrames.length);
  segments = routeRows.map((row, index) => {
    const flowerStart = Number(row.flower_start_month);
    const flowerEnd = Number(row.flower_end_month);
    const hasValidFlowerMonths = Number.isInteger(flowerStart) && flowerStart >= 1 && flowerStart <= 12
      && Number.isInteger(flowerEnd) && flowerEnd >= 1 && flowerEnd <= 12;
    const inferredFlowerWindows = currentRouteId === 'central-route' && Number(row.segment_order) === 6
      ? [[Number(row.start_month), Number(row.start_day), Number(row.end_month), Number(row.end_day)]]
      : [];
    return {
      id: Number(row.segment_order) || index + 1,
      route: `${row.from_location} \u2192 ${row.to_location}`,
      dates: `${monthDayKey(Number(row.start_month), Number(row.start_day)).replace('-', '/')}\u2013${monthDayKey(Number(row.end_month), Number(row.end_day)).replace('-', '/')}`,
      start: [Number(row.start_month), Number(row.start_day)],
      end: [Number(row.end_month), Number(row.end_day)],
      flowerWindows: hasValidFlowerMonths
        ? [[flowerStart, 1, flowerEnd, monthLengths[flowerEnd - 1]]]
        : inferredFlowerWindows,
      source: String(row.nectar_sources || '\u871c\u6e90\u8d44\u6599\u4e0d\u8db3'),
      note: String(row.data_quality_note || row.flower_notes || '\u6309\u73b0\u6709\u8def\u7ebf\u548c\u7701\u7ea7\u7269\u5019\u8d44\u6599\u5c55\u793a\u3002'),
    };
  });
  segmentNwi = routeRows.map((row) => Number(row.avgNWI));
  const base = document.querySelector('[data-l1-layer]');
  if (base) {
    base.src = resolveAssetUrl(currentRouteConfig.baseAsset);
    base.alt = `${currentRouteConfig.routeName}全年时间分段与地点轨道基底`;
    applyLayerFrame(base, currentRouteConfig.baseFrame);
  }
}

function resolveAssetUrl(assetPath) {
  return window.__DEMO_ASSET_URLS?.[assetPath] || assetPath;
}

function applyLayerFrame(element, frame) {
  element.style.left = `${((frame.x - canvasViewBox.x) / canvasViewBox.width * 100).toFixed(5)}%`;
  element.style.top = `${((frame.y - canvasViewBox.y) / canvasViewBox.height * 100).toFixed(5)}%`;
  element.style.width = `${(frame.width / canvasViewBox.width * 100).toFixed(5)}%`;
  element.style.height = `${(frame.height / canvasViewBox.height * 100).toFixed(5)}%`;
}

function applyFullLayerFrame(element) {
  element.style.left = '0';
  element.style.top = '0';
  element.style.width = '100%';
  element.style.height = '100%';
}

function setVisualizationViewBox(viewBox) {
  const value = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
  document.querySelector('[data-lane-highlight-layer]')?.setAttribute('viewBox', value);
  document.querySelector('[data-lane-active-flowering-layer]')?.setAttribute('viewBox', value);
  document.querySelector('[data-annotation-layer]')?.setAttribute('viewBox', value);
}

function isCombinedRouteSelection(state = appState) {
  return primaryRouteIds.every((routeId) => state.selectedRoutes.includes(routeId));
}

async function loadFloweringOverlay() {
  const host = document.querySelector('[data-flowering-layer]');
  if (!host) return;
  const response = await fetch(currentRouteConfig.floweringAsset);
  if (!response.ok) throw new Error('L4 花期图层载入失败');
  const documentNode = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  const svg = documentNode.documentElement;
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('aria-hidden', 'true');
  svg.querySelectorAll('[fill="#F2EEE0"], [fill="black"]').forEach((element) => element.setAttribute('opacity', '0'));
  if (activeFloweringSourceUrl) URL.revokeObjectURL(activeFloweringSourceUrl);
  activeFloweringSourceUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }),
  );
  host.replaceChildren(document.importNode(svg, true));
  applyLayerFrame(host, currentRouteConfig.floweringFrame);
}

function renderAnnotationLayers() {
  const layer = document.querySelector('[data-annotation-layer]');
  if (!layer) return;
  if (isCombinedRouteMode) {
    layer.replaceChildren();
    return;
  }
  layer.innerHTML = `
    <g class="rhythm-annotation-group" data-annotation-group="l2">${renderSegmentContent(renderStayMark)}</g>
    <g class="rhythm-annotation-group" data-annotation-group="l3">${renderSegmentContent(renderWeatherMark)}</g>
    <g class="rhythm-annotation-group" data-annotation-group="l5">${renderSegmentContent(renderEffectiveMark)}</g>
    <g class="rhythm-annotation-group" data-annotation-group="nwi">
      ${renderSegmentContent(renderNwiBubble)}
      <g class="overlay-nwi-daily" data-nwi-daily-layer></g>
    </g>
  `;
  syncLayerVisibility();
}

async function renderCombinedRouteView() {
  closeNwiDetail();
  isCombinedRouteMode = true;
  hoveredCombinedSegmentKey = '';
  hoveredCombinedRouteId = '';
  const canvas = document.querySelector('[data-flowering-canvas]');
  canvas?.classList.add('is-combined-routes');
  resetCombinedSegmentFocus({ restoreView: false });
  setVisualizationViewBox(combinedViewBox);

  const base = document.querySelector('[data-l1-layer]');
  if (base) {
    base.removeAttribute('src');
    base.alt = '东西中南四线合并时间弧线底图';
    applyFullLayerFrame(base);
  }

  const floweringLayer = document.querySelector('[data-flowering-layer]');
  if (floweringLayer) {
    floweringLayer.replaceChildren();
    applyFullLayerFrame(floweringLayer);
  }
  document.querySelector('[data-lane-highlight-layer]')?.replaceChildren();
  document.querySelector('[data-lane-active-flowering-layer]')?.replaceChildren();
  document.querySelector('[data-annotation-layer]')?.replaceChildren();
  document.querySelector('[data-segment-index]')?.replaceChildren();
  document.querySelector('[data-nwi-overview-calendars]')?.remove();

  await loadCombinedRouteData();
  await renderCombinedInlineSvg();
  showCombinedViewLegend();
  syncLayerVisibility();
  applyCombinedSelection();
  setZoom(1);
}

async function renderCombinedInlineSvg() {
  const host = document.querySelector('[data-flowering-layer]');
  if (!host) return;
  const response = await fetch(resolveAssetUrl(combinedRouteAsset));
  if (!response.ok) throw new Error('四线合并底图载入失败');
  const documentNode = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  const svg = documentNode.documentElement;
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.classList.add('combined-inline-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '东西中南四线合并时间弧线填色图');
  host.replaceChildren(document.importNode(svg, true));
  const mountedSvg = host.querySelector('svg');
  markCombinedTextLabels(mountedSvg);
  indexCombinedSvgCells(mountedSvg);
  renderCombinedRouteHighlightLayer(mountedSvg);
  renderCombinedSegmentLines(mountedSvg);
  paintCombinedSvgCells();
  bindCombinedSvgCellInteractions(mountedSvg);
}

function indexCombinedSvgCells(svg) {
  combinedCellsByRouteDay = new Map();
  combinedCellDetails = new Map();
  if (!svg) return;

  const measuredCells = [...svg.querySelectorAll('path')]
    .filter((path) => String(path.getAttribute('fill') || '').toLowerCase() === '#e2e1de')
    .map((path) => {
      const box = path.getBBox();
      return { path, x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
  const routeTracks = buildCombinedSvgCellTracks(measuredCells);
  if (routeTracks.length >= combinedRouteArcOrder.length) {
    combinedRouteArcOrder.forEach((routeId, routeIndex) => {
      const orderedTrack = routeTracks[routeIndex];
      orderedTrack.forEach((cell, cellIndex) => {
        registerCombinedSvgCell(cell.path, routeId, combinedTrackOrdinal(cellIndex, orderedTrack.length));
      });
    });
    return;
  }

  const lowerCenter = { x: 289.814, y: 489.014 };
  const upperCenter = { x: 701.24, y: 271.209 };
  const lowerCells = measuredCells
    .filter((cell) => cell.y >= 395)
    .map((cell) => ({
      ...cell,
      radius: combinedRadius(cell, lowerCenter),
      timeOrder: -combinedLowerArcTimeScore(cell),
    }));
  const upperCells = measuredCells
    .filter((cell) => cell.y < 395)
    .map((cell) => ({
      ...cell,
      radius: combinedRadius(cell, upperCenter),
      timeOrder: combinedUpperArcTimeScore(cell),
    }));
  const lowerDayCount = 181;

  indexCombinedCellGroup(lowerCells, 1, lowerDayCount, 'asc');
  indexCombinedCellGroup(upperCells, lowerDayCount + 1, 365 - lowerDayCount, 'desc');
}

function buildCombinedSvgCellTracks(cells) {
  const components = connectedCombinedCellComponents(cells, combinedCellTrackLinkDistance)
    .filter((component) => component.length > 100)
    .sort((a, b) => averageCombinedCellY(a) - averageCombinedCellY(b));
  return components.map((component) => orderCombinedCellTrack(component));
}

function connectedCombinedCellComponents(cells, maxDistance) {
  const visited = new Set();
  const components = [];
  cells.forEach((cell) => {
    if (visited.has(cell)) return;
    const component = [];
    const stack = [cell];
    visited.add(cell);
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      cells.forEach((candidate) => {
        if (visited.has(candidate)) return;
        if (combinedPointDistance(current, candidate) > maxDistance) return;
        visited.add(candidate);
        stack.push(candidate);
      });
    }
    components.push(component);
  });
  return components;
}

function averageCombinedCellY(cells) {
  return cells.reduce((sum, cell) => sum + cell.y, 0) / Math.max(1, cells.length);
}

function orderCombinedCellTrack(cells) {
  if (cells.length <= 1) return [...cells];
  const remaining = new Set(cells);
  const ordered = [];
  let current = [...remaining].sort((a, b) => a.x - b.x || a.y - b.y)[0];
  while (current) {
    ordered.push(current);
    remaining.delete(current);
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((candidate) => {
      const distance = combinedPointDistance(current, candidate);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    });
    current = nearest;
  }
  return ordered;
}

function combinedTrackOrdinal(index, trackLength) {
  if (trackLength <= 1) return 1;
  return Math.max(1, Math.min(365, Math.round(1 + (index * 364) / (trackLength - 1))));
}

function combinedPointDistance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function combinedRadius(cell, center) {
  return Math.hypot(cell.x - center.x, cell.y - center.y);
}

function combinedLowerArcTimeScore(cell) {
  const center = { x: 289.814, y: 489.014 };
  let angle = Math.atan2(cell.y - center.y, cell.x - center.x) * 180 / Math.PI;
  if (angle > 180) angle -= 360;
  return angle;
}

function combinedUpperArcTimeScore(cell) {
  const center = { x: 701.24, y: 271.209 };
  let angle = Math.atan2(cell.y - center.y, cell.x - center.x) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  return angle;
}

function indexCombinedCellGroup(cells, startOrdinal, dayCount, radiusOrder = 'asc') {
  if (!cells.length || dayCount <= 0) return;
  const sortedByTime = [...cells].sort((a, b) => a.timeOrder - b.timeOrder || a.radius - b.radius);
  const previousRankCells = Array(combinedRouteArcOrder.length).fill(null);
  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const start = Math.round((dayIndex * sortedByTime.length) / dayCount);
    const end = Math.round(((dayIndex + 1) * sortedByTime.length) / dayCount);
    const bucket = sortedByTime
      .slice(start, end)
      .sort((a, b) => radiusOrder === 'asc'
        ? a.radius - b.radius || a.timeOrder - b.timeOrder
        : b.radius - a.radius || a.timeOrder - b.timeOrder);
    const rankedCells = alignCombinedCellBucketToRoutes(bucket, previousRankCells);
    combinedRouteArcOrder.forEach((routeId, routeRank) => {
      const cell = rankedCells[routeRank];
      if (!cell) return;
      registerCombinedSvgCell(cell.path, routeId, startOrdinal + dayIndex);
      previousRankCells[routeRank] = cell;
    });
  }
}

function alignCombinedCellBucketToRoutes(bucket, previousRankCells) {
  const routeCount = combinedRouteArcOrder.length;
  if (bucket.length >= routeCount || !previousRankCells.some(Boolean)) {
    return bucket.slice(0, routeCount);
  }

  let bestRanks = [];
  let bestCost = Number.POSITIVE_INFINITY;
  const chooseRanks = (startRank, chosenRanks) => {
    if (chosenRanks.length === bucket.length) {
      const cost = chosenRanks.reduce((sum, routeRank, bucketIndex) => {
        const previous = previousRankCells[routeRank];
        const cell = bucket[bucketIndex];
        if (!previous || !cell) return sum;
        return sum + Math.hypot(cell.x - previous.x, cell.y - previous.y);
      }, 0);
      if (cost < bestCost) {
        bestCost = cost;
        bestRanks = [...chosenRanks];
      }
      return;
    }
    const remainingCells = bucket.length - chosenRanks.length;
    for (let routeRank = startRank; routeRank <= routeCount - remainingCells; routeRank += 1) {
      chosenRanks.push(routeRank);
      chooseRanks(routeRank + 1, chosenRanks);
      chosenRanks.pop();
    }
  };

  chooseRanks(0, []);
  const rankedCells = Array(routeCount).fill(null);
  bestRanks.forEach((routeRank, bucketIndex) => {
    rankedCells[routeRank] = bucket[bucketIndex];
  });
  return rankedCells;
}

function registerCombinedSvgCell(cell, routeId, ordinal) {
  const routeData = combinedRouteData.get(routeId);
  const segmentIndex = routeData ? findCombinedSegmentIndexForOrdinal(routeData, ordinal) : -1;
  const segment = segmentIndex >= 0 ? routeData.segments[segmentIndex] : null;
  const rowIndex = segment ? segment.dailyRows.findIndex((row) => row.ordinal === ordinal) : -1;
  const row = rowIndex >= 0 ? segment.dailyRows[rowIndex] : null;
  const detail = { routeId, ordinal, segmentIndex, segment, rowIndex, row };
  const dayKey = routeId + ':' + ordinal;

  combinedCellsByRouteDay.set(dayKey, cell);
  combinedCellDetails.set(cell, detail);
  cell.classList.add('combined-cell');
  cell.dataset.combinedRouteId = routeId;
  cell.dataset.combinedOrdinal = String(ordinal);
  cell.dataset.combinedDayKey = dayKey;
  cell.setAttribute('tabindex', '0');
  cell.setAttribute('role', segment ? 'button' : 'img');
  if (segment) {
    cell.classList.add('combined-segment-cell');
    cell.dataset.combinedSegmentIndex = String(segmentIndex);
    cell.dataset.combinedSegmentKey = combinedSegmentKey(routeId, segmentIndex);
    cell.dataset.combinedLocation = segment.toLocation || segment.route;
  }
  replaceSvgTitle(cell, combinedCellTitle(detail));
}

function combinedSegmentKey(routeId, segmentIndex) {
  return routeId + ':' + segmentIndex;
}

function markCombinedTextLabels(svg) {
  if (!svg) return;
  const blackPaths = [...svg.querySelectorAll('path[fill="black"]')];
  blackPaths.forEach((path, index) => {
    path.classList.toggle('combined-month-label-path', combinedMonthLabelPathIndexes.has(index));
    path.classList.toggle('combined-route-end-label-path', combinedRouteEndLabelPathIndexes.has(index));
  });
}

function renderCombinedRouteHighlightLayer(svg) {
  if (!svg) return;
  svg.querySelector('[data-combined-route-highlight-layer]')?.remove();
  svg.querySelector('[data-combined-route-base-dim-layer]')?.remove();
  const firstCell = svg.querySelector('.combined-cell');
  if (!firstCell?.parentNode) return;

  const baseLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  baseLayer.classList.add('combined-route-base-dim-layer');
  baseLayer.dataset.combinedRouteBaseDimLayer = 'true';
  baseLayer.setAttribute('aria-hidden', 'true');
  svg.querySelectorAll('.combined-cell').forEach((cell) => {
    const clone = cell.cloneNode(false);
    clone.removeAttribute('tabindex');
    clone.removeAttribute('role');
    [...clone.attributes].forEach((attribute) => {
      if (attribute.name.startsWith('data-')) clone.removeAttribute(attribute.name);
    });
    clone.removeAttribute('class');
    clone.classList.add('combined-route-base-dim-cell');
    clone.setAttribute('fill', '#E2E1DE');
    clone.removeAttribute('stroke');
    baseLayer.append(clone);
  });

  const highlightLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  highlightLayer.classList.add('combined-route-highlight-layer');
  highlightLayer.dataset.combinedRouteHighlightLayer = 'true';
  highlightLayer.setAttribute('aria-hidden', 'true');

  combinedRouteArcOrder.forEach((routeId) => {
    const frame = combinedRouteHighlightAssets[routeId];
    if (!frame) return;
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.classList.add('combined-route-highlight-image');
    image.dataset.combinedRouteHighlight = routeId;
    image.setAttribute('href', resolveAssetUrl(frame.asset));
    image.setAttribute('x', String(frame.x));
    image.setAttribute('y', String(frame.y));
    image.setAttribute('width', String(frame.width));
    image.setAttribute('height', String(frame.height));
    image.setAttribute('preserveAspectRatio', 'none');
    highlightLayer.append(image);
  });

  firstCell.parentNode.insertBefore(baseLayer, firstCell);
  firstCell.parentNode.insertBefore(highlightLayer, firstCell);
  updateCombinedRouteHighlightState();
}

function renderCombinedSegmentLines(svg) {
  if (!svg) return;
  svg.querySelector('[data-combined-segment-line-layer]')?.remove();
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  layer.classList.add('combined-segment-line-layer');
  layer.dataset.combinedSegmentLineLayer = 'true';
  layer.setAttribute('aria-hidden', 'true');

  combinedRouteArcOrder.forEach((routeId) => {
    const routeData = combinedRouteData.get(routeId);
    routeData?.segments.forEach((segment, segmentIndex) => {
      const pointGroups = combinedSegmentPointGroups(routeId, segment);
      const visiblePoints = pointGroups.flat();
      if (visiblePoints.length < 2) return;
      const key = combinedSegmentKey(routeId, segmentIndex);
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.classList.add('combined-segment-line-group');
      group.dataset.combinedSegmentLineKey = key;
      group.dataset.combinedRouteId = routeId;
      group.dataset.combinedSegmentIndex = String(segmentIndex);
      group.style.setProperty('--route-color', routeData.color || combinedRouteColors[routeId] || '#8fae8e');

      pointGroups.forEach((points) => {
        if (points.length < 2) return;
        const pathData = points.map((point, index) => (index ? 'L' : 'M') + ' ' + round(point.x) + ' ' + round(point.y)).join(' ');
        const haloPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        haloPath.classList.add('combined-segment-line-halo');
        haloPath.setAttribute('d', pathData);
        group.append(haloPath);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('combined-segment-line');
        path.setAttribute('d', pathData);
        group.append(path);
      });

      const startPoint = visiblePoints[0];
      const endPoint = visiblePoints[visiblePoints.length - 1];
      const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      startMarker.classList.add('combined-segment-marker', 'is-start');
      startMarker.setAttribute('cx', round(startPoint.x));
      startMarker.setAttribute('cy', round(startPoint.y));
      startMarker.setAttribute('r', '4.2');
      group.append(startMarker);

      const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      endMarker.classList.add('combined-segment-marker', 'is-end');
      endMarker.setAttribute('cx', round(endPoint.x));
      endMarker.setAttribute('cy', round(endPoint.y));
      endMarker.setAttribute('r', '4.2');
      group.append(endMarker);

      layer.append(group);
    });
  });

  svg.append(layer);
  updateCombinedSegmentLineStates();
}

function combinedSegmentPointGroups(routeId, segment) {
  return combinedOrdinalGroups(segmentStartOrdinal(segment), segmentEndOrdinal(segment))
    .map((ordinals) => ordinals.map((ordinal) => combinedCellCenter(routeId, ordinal)).filter(Boolean))
    .flatMap((points) => splitCombinedSegmentPointGroup(points))
    .filter((points) => points.length >= 2);
}

function splitCombinedSegmentPointGroup(points) {
  const groups = [];
  let current = [];
  points.forEach((point) => {
    const previous = current[current.length - 1];
    if (
      previous
      && Math.hypot(point.x - previous.x, point.y - previous.y) > combinedSegmentLineMaxStep
    ) {
      if (current.length >= 2) groups.push(current);
      current = [];
    }
    current.push(point);
  });
  if (current.length >= 2) groups.push(current);
  return groups;
}

function combinedOrdinalGroups(start, end) {
  if (end < start) {
    return [ordinalRange(start, 365), ordinalRange(1, end)].filter((group) => group.length);
  }
  return [ordinalRange(start, end)];
}

function ordinalRange(start, end) {
  const ordinals = [];
  for (let ordinal = start; ordinal <= end; ordinal += 1) ordinals.push(ordinal);
  return ordinals;
}

function combinedCellCenter(routeId, ordinal) {
  const cell = combinedCellsByRouteDay.get(routeId + ':' + ordinal);
  if (!cell) return interpolatedCombinedCellCenter(routeId, ordinal);
  const box = cell.getBBox();
  return { ordinal, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function interpolatedCombinedCellCenter(routeId, ordinal) {
  const before = nearestCombinedCellCenter(routeId, ordinal, -1);
  const after = nearestCombinedCellCenter(routeId, ordinal, 1);
  if (before && after && after.ordinal !== before.ordinal) {
    const ratio = (ordinal - before.ordinal) / (after.ordinal - before.ordinal);
    return {
      ordinal,
      x: before.x + (after.x - before.x) * ratio,
      y: before.y + (after.y - before.y) * ratio,
    };
  }
  return before || after || null;
}

function nearestCombinedCellCenter(routeId, ordinal, direction) {
  for (let cursor = ordinal + direction; cursor >= 1 && cursor <= 365; cursor += direction) {
    const cell = combinedCellsByRouteDay.get(routeId + ':' + cursor);
    if (!cell) continue;
    const box = cell.getBBox();
    return { ordinal: cursor, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  return null;
}

function setHoveredCombinedSegment(segmentKey) {
  const nextKey = segmentKey || '';
  if (hoveredCombinedSegmentKey === nextKey) return;
  hoveredCombinedSegmentKey = nextKey;
  paintCombinedSvgCells();
}

function setHoveredCombinedRoute(routeId) {
  const nextRouteId = routeId || '';
  if (hoveredCombinedRouteId === nextRouteId) return;
  hoveredCombinedRouteId = nextRouteId;
  updateCombinedRouteHighlightState();
  if (nextRouteId) document.querySelector('[data-risk-tab="route"]')?.click();
  if (nextRouteId && appState.activeRiskRoute !== nextRouteId) {
    updateState({ activeRiskRoute: nextRouteId, selectedNode: null, selectedNodeSummary: null });
  }
}

function updateCombinedRouteHighlightState() {
  document.querySelectorAll('[data-combined-route-highlight]').forEach((image) => {
    const routeId = image.dataset.combinedRouteHighlight;
    image.classList.toggle('is-active', Boolean(routeId && routeId === hoveredCombinedRouteId));
  });
}

function selectedCombinedSegmentKey() {
  const summary = appState.selectedNodeSummary;
  if (!summary) return '';
  for (const [routeId, routeData] of combinedRouteData.entries()) {
    if (summary.route_name !== routeData.routeName) continue;
    const segmentIndex = routeData.segments.findIndex((segment) => Number(summary.segment_order) === segment.id);
    if (segmentIndex >= 0) return combinedSegmentKey(routeId, segmentIndex);
  }
  return '';
}

function updateCombinedSegmentLineStates() {
  if (!isCombinedRouteMode) return;
  const selectedKey = selectedCombinedSegmentKey();
  document.querySelectorAll('[data-combined-segment-line-key]').forEach((group) => {
    const key = group.dataset.combinedSegmentLineKey;
    group.classList.toggle('is-hovered', Boolean(key && key === hoveredCombinedSegmentKey));
    group.classList.toggle('is-selected', Boolean(key && key === selectedKey));
    group.classList.toggle('is-hidden', !activeLayers.has('l2'));
  });
}

function findCombinedSegmentIndexForOrdinal(routeData, ordinal) {
  return routeData.segments.findIndex((segment) => {
    const start = segmentStartOrdinal(segment);
    const end = segmentEndOrdinal(segment);
    return end < start ? ordinal >= start || ordinal <= end : ordinal >= start && ordinal <= end;
  });
}

function replaceSvgTitle(element, titleText) {
  element.querySelector('title')?.remove();
  if (!titleText) return;
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = titleText;
  element.append(title);
}

function combinedCellTitle(detail) {
  const routeLabel = combinedRouteShortLabels[detail.routeId] || detail.routeId;
  const dateLabel = ordinalToMonthDay(detail.ordinal);
  if (detail.row && detail.segment) {
    const effective = isEffectiveHoneyDay(detail.row, detail.segment);
    return routeLabel + ' · ' + combinedSegmentPlaceLabel(detail.segment)
      + ' · ' + detail.segment.dates
      + ' · ' + dateLabel
      + ' · NWI ' + Math.round(detail.row.nwi)
      + ' · ' + (detail.row.goodHoneyDay ? 'L3' : '非L3')
      + (effective ? ' · L5' : '');
  }
  if (detail.segment) return routeLabel + ' · ' + combinedSegmentPlaceLabel(detail.segment) + ' · ' + detail.segment.dates;
  return routeLabel + ' · ' + dateLabel;
}

function combinedSegmentPlaceLabel(segment) {
  const from = String(segment?.fromLocation || '').trim();
  const to = String(segment?.toLocation || '').trim();
  if (from && to) return from + ' → ' + to;
  return String(segment?.route || to || from || '');
}

function ordinalToMonthDay(ordinal) {
  let remaining = Math.max(1, Math.min(365, Math.round(ordinal)));
  for (let month = 1; month <= monthLengths.length; month += 1) {
    const length = monthLengths[month - 1];
    if (remaining <= length) return month + '/' + remaining;
    remaining -= length;
  }
  return '12/31';
}

function paintCombinedSvgCells() {
  if (!isCombinedRouteMode || !combinedCellDetails.size) return;
  combinedCellDetails.forEach((detail, cell) => {
    const effective = Boolean(detail.row && detail.segment && isEffectiveHoneyDay(detail.row, detail.segment));
    const hasL2 = Boolean(detail.segment);
    const showL3 = Boolean(detail.row?.goodHoneyDay && activeLayers.has('l3'));
    const showL5 = Boolean(effective && activeLayers.has('l5'));
    let fill = '#E2E1DE';
    let fillOpacity = '0.62';
    let stroke = 'none';
    let strokeWidth = null;
    const segmentTint = hasL2 ? combinedSegmentTint(detail) : null;
    const segmentKey = hasL2 ? combinedSegmentKey(detail.routeId, detail.segmentIndex) : '';
    const hovered = Boolean(segmentKey && segmentKey === hoveredCombinedSegmentKey);

    cell.classList.toggle('is-l3', showL3);
    cell.classList.toggle('is-l5', showL5);
    cell.classList.toggle('is-hovered-segment', hovered);

    if (hasL2 && activeLayers.has('l2')) {
      fill = segmentTint;
      fillOpacity = '0.92';
    }

    if (detail.row && activeLayers.has('nwi')) {
      fill = segmentTint
        ? mixColor(nwiBubbleColor(detail.row.nwi), segmentTint, 0.18)
        : nwiBubbleColor(detail.row.nwi);
      fillOpacity = '0.72';
    }

    if (showL3) {
      if (!activeLayers.has('nwi')) {
        fill = '#8dbfc1';
        fillOpacity = '0.76';
      }
      stroke = '#6faeb2';
      strokeWidth = '0.9';
    }

    if (showL5) {
      if (!activeLayers.has('nwi')) {
        fill = '#8fae8e';
        fillOpacity = '0.86';
      }
      stroke = '#315d49';
      strokeWidth = '1.35';
    }

    const selected = isCombinedCellSelected(detail);
    cell.classList.toggle('is-selected-segment', selected);
    if (hovered) {
      fillOpacity = '1';
    }
    if (selected) {
      fillOpacity = '1';
    }

    cell.setAttribute('fill', fill);
    cell.style.fillOpacity = fillOpacity;
    if (stroke === 'none') {
      cell.removeAttribute('stroke');
      cell.style.stroke = '';
      cell.style.strokeWidth = '';
    } else {
      cell.setAttribute('stroke', stroke);
      cell.style.stroke = stroke;
      cell.style.strokeWidth = strokeWidth;
    }
  });
  updateCombinedSegmentLineStates();
}

function isCombinedCellSelected(detail) {
  const summary = appState.selectedNodeSummary;
  const routeData = combinedRouteData.get(detail.routeId);
  return Boolean(
    detail.segment
      && routeData
      && summary?.route_name === routeData.routeName
      && Number(summary?.segment_order) === detail.segment.id,
  );
}

function tintColor(color, amount = 0.6) {
  const hex = color.replace('#', '');
  const value = hex.length === 3 ? hex.split('').map((item) => item + item).join('') : hex;
  const channels = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16));
  const mixed = channels.map((channel) => Math.round(channel + (242 - channel) * amount));
  return 'rgb(' + mixed.join(', ') + ')';
}

function combinedSegmentTint(detail) {
  const baseColor = combinedRouteColors[detail.routeId] || '#d88c52';
  const segmentCount = detail.segment
    ? Math.max(1, combinedRouteData.get(detail.routeId)?.segments.length || 1)
    : 1;
  const ratio = segmentCount > 1 ? detail.segmentIndex / (segmentCount - 1) : 0;
  return tintColor(baseColor, 0.56 + ratio * 0.24);
}

function mixColor(primary, secondary, secondaryWeight = 0.2) {
  const first = parseCssColor(primary);
  const second = parseCssColor(secondary);
  if (!first || !second) return primary;
  const weight = Math.max(0, Math.min(1, secondaryWeight));
  const channels = first.map((channel, index) => Math.round(channel * (1 - weight) + second[index] * weight));
  return 'rgb(' + channels.join(', ') + ')';
}

function parseCssColor(color) {
  const value = String(color || '').trim();
  const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(value);
  if (rgbMatch) return rgbMatch.slice(1, 4).map(Number);
  const hex = value.replace('#', '');
  if (!/^[\da-f]{3}$|^[\da-f]{6}$/i.test(hex)) return null;
  const normalized = hex.length === 3 ? hex.split('').map((item) => item + item).join('') : hex;
  return [0, 2, 4].map((start) => parseInt(normalized.slice(start, start + 2), 16));
}

function bindCombinedSvgCellInteractions(svg) {
  initNwiDayTooltip();
  const rhythmTooltip = document.querySelector('[data-rhythm-tooltip]');
  svg?.querySelectorAll('.combined-cell').forEach((cell) => {
    const detail = combinedCellDetails.get(cell);
    if (!detail) return;
    const show = (event) => {
      setHoveredCombinedRoute(detail.routeId);
      if (detail.segmentIndex >= 0) setHoveredCombinedSegment(combinedSegmentKey(detail.routeId, detail.segmentIndex));
      showCombinedCellTooltip(detail, event, rhythmTooltip);
    };
    const hide = () => {
      setHoveredCombinedSegment('');
      setHoveredCombinedRoute('');
      hideNwiDayTooltip();
      if (rhythmTooltip) rhythmTooltip.hidden = true;
    };
    cell.addEventListener('pointerenter', show);
    cell.addEventListener('pointermove', show);
    cell.addEventListener('pointerleave', hide);
    cell.addEventListener('focus', show);
    cell.addEventListener('blur', hide);
    cell.addEventListener('click', () => {
      if (detail.segmentIndex >= 0) selectCombinedSegment(detail.routeId, detail.segmentIndex, detail.ordinal);
    });
    cell.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (detail.segmentIndex < 0) return;
      event.preventDefault();
      selectCombinedSegment(detail.routeId, detail.segmentIndex, detail.ordinal);
    });
  });
}

function showCombinedCellTooltip(detail, event, rhythmTooltip) {
  if (detail.row && detail.segment && detail.rowIndex < 0) {
    const matchedRowIndex = detail.segment.dailyRows.findIndex((row) => row.ordinal === detail.ordinal);
    if (matchedRowIndex >= 0) detail.rowIndex = matchedRowIndex;
  }
  if (detail.row && detail.segment) {
    showCombinedNwiTooltip(detail.routeId, detail.segmentIndex, detail.rowIndex, event);
    if (rhythmTooltip) rhythmTooltip.hidden = true;
    return;
  }
  hideNwiDayTooltip();
  if (!rhythmTooltip || !detail.segment) return;
  showCombinedSegmentTooltip(detail.routeId, detail.segmentIndex, event, rhythmTooltip);
}

async function loadCombinedRouteData() {
  if (combinedDataPromise) return combinedDataPromise;
  combinedDataPromise = Promise.all([loadCsv(dataFiles.routeSegmentSummary), loadCsv(dailyNwiDataUrl)])
    .then(([summaryRows, weatherRows]) => {
      combinedRouteData = new Map();
      primaryRouteIds.forEach((routeId) => {
        const config = routeVisualConfigs[routeId];
        const routeRows = summaryRows
          .filter((row) => row.route_name === config.routeName && row.era === '2020s')
          .sort((a, b) => Number(a.segment_order) - Number(b.segment_order));
        const segmentsForRoute = routeRows.map((row, index) => {
          const segment = buildCombinedSegment(row, routeId, index);
          const weatherForSegment = buildCombinedWeatherRows(weatherRows, routeId, segment, index);
          const dailyRows = weatherForSegment.filter((rowItem) => rowItem.inStayPeriod);
          const averageNwi = dailyRows.length
            ? dailyRows.reduce((sum, rowItem) => sum + rowItem.nwi, 0) / dailyRows.length
            : Number(row.avgNWI);
          const goodHoneyRate = dailyRows.length
            ? dailyRows.filter((rowItem) => rowItem.goodHoneyDay).length / dailyRows.length
            : Number(row.goodHoneyRate);
          return {
            ...segment,
            weatherRows: weatherForSegment,
            dailyRows,
            avgNwi: Number.isFinite(averageNwi) ? averageNwi : Number(row.avgNWI),
            goodHoneyRate: Number.isFinite(goodHoneyRate) ? goodHoneyRate : Number(row.goodHoneyRate),
            climateRiskIndex: Number(row.climateRiskIndex),
          };
        });
        combinedRouteData.set(routeId, {
          routeId,
          routeName: config.routeName,
          color: combinedRouteColors[routeId],
          segments: segmentsForRoute,
        });
      });
      return combinedRouteData;
    });
  return combinedDataPromise;
}

function buildCombinedSegment(row, routeId, index) {
  const flowerStart = Number(row.flower_start_month);
  const flowerEnd = Number(row.flower_end_month);
  const hasValidFlowerMonths = Number.isInteger(flowerStart) && flowerStart >= 1 && flowerStart <= 12
    && Number.isInteger(flowerEnd) && flowerEnd >= 1 && flowerEnd <= 12;
  const inferredFlowerWindows = routeId === 'central-route' && Number(row.segment_order) === 6
    ? [[Number(row.start_month), Number(row.start_day), Number(row.end_month), Number(row.end_day)]]
    : [];
  const startMonth = Number(row.start_month);
  const startDay = Number(row.start_day);
  const endMonth = Number(row.end_month);
  const endDay = Number(row.end_day);
  const segmentOrder = Number(row.segment_order) || index + 1;
  return {
    id: segmentOrder,
    routeId,
    routeName: routeVisualConfigs[routeId].routeName,
    route: `${row.from_location} → ${row.to_location}`,
    fromLocation: String(row.from_location || ''),
    toLocation: String(row.to_location || ''),
    dates: `${monthDayKey(startMonth, startDay).replace('-', '/')}–${monthDayKey(endMonth, endDay).replace('-', '/')}`,
    start: [startMonth, startDay],
    end: [endMonth, endDay],
    flowerWindows: hasValidFlowerMonths
      ? [[flowerStart, 1, flowerEnd, monthLengths[flowerEnd - 1]]]
      : inferredFlowerWindows,
    source: String(row.nectar_sources || '蜜源资料不足'),
    note: String(row.data_quality_note || row.flower_notes || '按现有路线和省级物候资料展示。'),
    raw: row,
  };
}

function buildCombinedWeatherRows(weatherRows, routeId, segment, segmentIndex) {
  const routeName = routeVisualConfigs[routeId].routeName;
  const routeRows = weatherRows.filter((row) => row.route_name === routeName);
  const isSouthRoute = routeId === 'south-route';
  const isCentralRoute = routeId === 'central-route';
  const usesSegmentDateMatch = isSouthRoute || isCentralRoute;
  const currentRows = usesSegmentDateMatch
    ? routeRows
    : routeRows.filter((row) => String(row.stay_start || '').startsWith('2024-'));
  const start = monthDayKey(segment.start[0], segment.start[1]);
  const end = monthDayKey(segment.end[0], segment.end[1]);
  const segmentRows = currentRows.filter((row) => usesSegmentDateMatch
    ? combinedDailyRowMatchesSegment(row, segment, routeId, segmentIndex)
    : String(row.stay_start).slice(5) === start && String(row.stay_end).slice(5) === end);
  const latestRouteYear = Math.max(
    ...segmentRows
      .map((row) => Number(String(isCentralRoute ? row.stay_start || row.date : row.date).slice(0, 4)))
      .filter((year) => Number.isFinite(year)),
  );

  return segmentRows
    .filter((row) => !usesSegmentDateMatch
      || !Number.isFinite(latestRouteYear)
      || Number(String(isCentralRoute ? row.stay_start || row.date : row.date).slice(0, 4)) === latestRouteYear)
    .map((row) => {
      const ordinal = dateStringToOrdinal(row.date);
      const centralFlags = isCentralRoute ? centralDailyStayFlags(ordinal, segment) : null;
      return {
        ordinal,
        date: String(row.date),
        nwi: Number(row.nectar_weather_index),
        weather: String(row.weather_description || '—'),
        tempMin: Number(row.temp_min_c),
        tempMax: Number(row.temp_max_c),
        precipitation: Number(row.precipitation_mm),
        wind: Number(row.wind_max_kmh),
        badStreak: Number(row.bad_weather_streak),
        goodHoneyDay: Number(row.good_honey_day) === 1,
        inStayPeriod: centralFlags?.inStayPeriod ?? Number(row.in_stay_period) === 1,
        bufferBefore: centralFlags?.bufferBefore ?? Number(row.buffer_before) === 1,
        bufferAfter: centralFlags?.bufferAfter ?? Number(row.buffer_after) === 1,
      };
    })
    .filter((row) => Number.isFinite(row.nwi))
    .sort((a, b) => isCentralRoute
      ? chronologicalOrdinalForSegment(a.ordinal, segment) - chronologicalOrdinalForSegment(b.ordinal, segment)
      : a.ordinal - b.ordinal);
}

function combinedDailyRowMatchesSegment(row, segment, routeId, segmentIndex) {
  if (routeId === 'south-route') return combinedSouthDailyRowMatchesSegment(row, segment, segmentIndex);
  const destination = String(segment.route).split('→').pop()?.trim();
  if (destination && String(row.location || '').trim() !== destination) return false;
  const ordinal = dateStringToOrdinal(row.date);
  const start = segmentStartOrdinal(segment);
  const end = segmentEndOrdinal(segment);
  return end < start ? ordinal >= start || ordinal <= end : ordinal >= start && ordinal <= end;
}

function combinedSouthDailyRowMatchesSegment(row, segment, segmentIndex) {
  const destination = String(segment.route).split('→').pop()?.trim();
  if (destination && String(row.location || '').trim() !== destination) return false;
  const ordinal = dateStringToOrdinal(row.date);
  const southWindow = southWeatherWindowForSegmentIndex(segmentIndex);
  const start = Math.max(southWindow.start, dateToOrdinal(segment.start[0], segment.start[1]));
  const end = Math.min(southWindow.end, dateToOrdinal(segment.end[0], segment.end[1]));
  return end < start ? ordinal >= start || ordinal <= end : ordinal >= start && ordinal <= end;
}

async function loadCombinedGeometry() {
  if (combinedGeometryPromise) return combinedGeometryPromise;
  combinedGeometryPromise = fetch(resolveAssetUrl(combinedRouteAsset))
    .then((response) => {
      if (!response.ok) throw new Error('四线合并底图载入失败');
      return response.text();
    })
    .then((svgText) => {
      combinedDayPointsByRoute = buildCombinedDayPoints(parseCombinedDayCells(svgText));
      return combinedDayPointsByRoute;
    });
  return combinedGeometryPromise;
}

function parseCombinedDayCells(svgText) {
  const cells = [];
  const pathPattern = /<path\b([^>]*)>/g;
  let match;
  while ((match = pathPattern.exec(svgText))) {
    const attrs = match[1];
    const fillMatch = /\bfill="([^"]+)"/.exec(attrs);
    if (String(fillMatch?.[1] || '').toLowerCase() !== '#e2e1de') continue;
    const dMatch = /\bd="([^"]+)"/.exec(attrs);
    if (!dMatch) continue;
    const numbers = [...dMatch[1].matchAll(/-?\d+(?:\.\d+)?/g)].map((item) => Number(item[0]));
    const xs = numbers.filter((_, index) => index % 2 === 0);
    const ys = numbers.filter((_, index) => index % 2 === 1);
    if (!xs.length || !ys.length) continue;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    cells.push({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
  }
  return cells;
}

function buildCombinedDayPoints(cells) {
  const rankedPoints = Array.from({ length: combinedRouteArcOrder.length }, () => Array(365).fill(null));
  const sortedCells = [...cells].sort((a, b) => a.x - b.x || a.y - b.y);
  for (let day = 0; day < 365; day += 1) {
    const start = Math.round((day * sortedCells.length) / 365);
    const end = Math.round(((day + 1) * sortedCells.length) / 365);
    const bucket = sortedCells.slice(start, end).sort((a, b) => a.y - b.y);
    combinedRouteArcOrder.forEach((_, rank) => {
      if (bucket[rank]) rankedPoints[rank][day] = bucket[rank];
    });
  }
  return new Map(combinedRouteArcOrder.map((routeId, rank) => [routeId, fillMissingCombinedPoints(rankedPoints[rank])]));
}

function fillMissingCombinedPoints(points) {
  return points.map((point, index) => {
    if (point) return point;
    let previousIndex = index - 1;
    while (previousIndex >= 0 && !points[previousIndex]) previousIndex -= 1;
    let nextIndex = index + 1;
    while (nextIndex < points.length && !points[nextIndex]) nextIndex += 1;
    const previous = points[previousIndex];
    const next = points[nextIndex];
    if (previous && next) {
      const ratio = (index - previousIndex) / (nextIndex - previousIndex);
      return {
        x: previous.x + (next.x - previous.x) * ratio,
        y: previous.y + (next.y - previous.y) * ratio,
      };
    }
    return previous || next || {
      x: combinedViewBox.width * (index / 364),
      y: combinedViewBox.height / 2,
    };
  });
}

function renderCombinedAnnotationLayers() {
  const layer = document.querySelector('[data-annotation-layer]');
  if (!layer) return;
  layer.innerHTML = `
    <g class="rhythm-annotation-group combined-annotation-group" data-annotation-group="l2">${renderCombinedRoutes(renderCombinedLocationSegments)}</g>
    <g class="rhythm-annotation-group combined-annotation-group" data-annotation-group="l3">${renderCombinedRoutes(renderCombinedWeatherWindows)}</g>
    <g class="rhythm-annotation-group combined-annotation-group" data-annotation-group="l5">${renderCombinedRoutes(renderCombinedEffectiveWindows)}</g>
    <g class="rhythm-annotation-group combined-annotation-group" data-annotation-group="nwi">${renderCombinedRoutes(renderCombinedNwiMarks)}</g>
  `;
  syncLayerVisibility();
}

function renderCombinedRoutes(renderer) {
  return combinedRouteArcOrder
    .map((routeId) => {
      const routeData = combinedRouteData.get(routeId);
      if (!routeData) return '';
      return `<g class="combined-route-layer" data-combined-route-layer="${routeId}" style="--route-color:${routeData.color}">${renderer(routeData)}</g>`;
    })
    .join('');
}

function renderCombinedLocationSegments(routeData) {
  const rank = combinedRouteArcOrder.indexOf(routeData.routeId);
  const labelOffset = rank < 2 ? -13 : 17;
  return routeData.segments.map((segment, segmentIndex) => {
    const start = segmentStartOrdinal(segment);
    const end = segmentEndOrdinal(segment);
    const mid = segmentMidOrdinal(segment);
    const labelPoint = combinedPointForOrdinal(routeData.routeId, mid, labelOffset);
    const startPoint = combinedPointForOrdinal(routeData.routeId, start);
    const endPoint = combinedPointForOrdinal(routeData.routeId, end);
    const title = `${combinedRouteShortLabels[routeData.routeId]} · ${segment.route} · ${segment.dates} · 风险 ${formatNwiNumber(segment.climateRiskIndex, 2)} · 平均NWI ${formatNwiNumber(segment.avgNwi, 1)}`;
    return `
      <g class="combined-segment" data-combined-segment data-combined-route-id="${routeData.routeId}" data-combined-segment-index="${segmentIndex}" tabindex="0" role="button" aria-label="${escapeSvgText(title)}">
        <path class="combined-location-segment-hit" d="${combinedPathForOrdinalRange(routeData.routeId, start, end)}"></path>
        <path class="combined-location-segment-line" d="${combinedPathForOrdinalRange(routeData.routeId, start, end)}"><title>${escapeSvgText(title)}</title></path>
        <line class="combined-location-boundary" x1="${startPoint.x}" y1="${startPoint.y - 8}" x2="${startPoint.x}" y2="${startPoint.y + 8}"></line>
        <line class="combined-location-boundary" x1="${endPoint.x}" y1="${endPoint.y - 8}" x2="${endPoint.x}" y2="${endPoint.y + 8}"></line>
        <text class="combined-location-label" x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle">${escapeSvgText(segment.toLocation || segment.route)}</text>
      </g>
    `;
  }).join('');
}

function renderCombinedWeatherWindows(routeData) {
  return routeData.segments.map((segment, segmentIndex) => segment.dailyRows
    .map((row, dayIndex) => {
      if (!row.goodHoneyDay) return '';
      const interval = combinedGoodHoneyDayInterval(row, segment, routeData.routeId, segmentIndex);
      if (!interval) return '';
      return `<path class="combined-l3-window" data-combined-day data-combined-route-id="${routeData.routeId}" data-combined-segment-index="${segmentIndex}" data-combined-day-index="${dayIndex}" d="${combinedPathForOrdinalRange(routeData.routeId, interval.dayStart, interval.dayEnd, -5)}"><title>L3 ${combinedRouteShortLabels[routeData.routeId]} ${formatNwiDate(row.date)} · NWI ${Math.round(row.nwi)} · ${escapeSvgText(row.weather)}</title></path>`;
    }).join('')).join('');
}

function renderCombinedEffectiveWindows(routeData) {
  return routeData.segments.map((segment, segmentIndex) => segment.dailyRows
    .map((row, dayIndex) => {
      if (!isEffectiveHoneyDay(row, segment)) return '';
      const interval = combinedGoodHoneyDayInterval(row, segment, routeData.routeId, segmentIndex);
      if (!interval) return '';
      return `<path class="combined-l5-window" data-combined-day data-combined-route-id="${routeData.routeId}" data-combined-segment-index="${segmentIndex}" data-combined-day-index="${dayIndex}" d="${combinedPathForOrdinalRange(routeData.routeId, interval.dayStart, interval.dayEnd, 5)}"><title>L5 ${combinedRouteShortLabels[routeData.routeId]} ${formatNwiDate(row.date)} · NWI ${Math.round(row.nwi)} · L2∩L3∩L4</title></path>`;
    }).join('')).join('');
}

function renderCombinedNwiMarks(routeData) {
  const rank = combinedRouteArcOrder.indexOf(routeData.routeId);
  const offset = rank < 2 ? -24 : 24;
  return routeData.segments.map((segment, segmentIndex) => segment.dailyRows.map((row, dayIndex) => {
    const point = combinedPointForOrdinal(routeData.routeId, row.ordinal, offset);
    const radius = Math.max(2.4, Math.min(5.4, 2.5 + ((row.nwi - 40) / 50) * 3.4));
    const effective = isEffectiveHoneyDay(row, segment);
    return `
      <circle class="combined-nwi-dot${row.goodHoneyDay ? ' has-l3' : ''}${effective ? ' has-l5' : ''}" data-combined-day
        data-combined-route-id="${routeData.routeId}" data-combined-segment-index="${segmentIndex}" data-combined-day-index="${dayIndex}"
        cx="${point.x}" cy="${point.y}" r="${radius.toFixed(1)}" fill="${nwiBubbleColor(row.nwi)}" tabindex="0" role="button"
        aria-label="${combinedRouteShortLabels[routeData.routeId]} ${formatNwiDate(row.date)} NWI ${Math.round(row.nwi)}">
        <title>${combinedRouteShortLabels[routeData.routeId]} · ${segment.toLocation} · ${formatNwiDate(row.date)} · NWI ${Math.round(row.nwi)}</title>
      </circle>
    `;
  }).join('')).join('');
}

function combinedGoodHoneyDayInterval(row, segment, routeId, segmentIndex) {
  const interval = goodHoneyDayInterval(row, segment);
  if (routeId !== 'south-route') return interval;
  const southWindow = southWeatherWindowForSegmentIndex(segmentIndex);
  const dayStart = Math.max(interval.dayStart, southWindow.start);
  const dayEnd = Math.min(interval.dayEnd, southWindow.end);
  return dayEnd >= dayStart ? { dayStart, dayEnd } : null;
}

function combinedPathForOrdinalRange(routeId, rawStart, rawEnd, verticalOffset = 0) {
  const start = Math.max(1, rawStart);
  const end = Math.min(365.999, rawEnd);
  if (end < start) {
    return `${combinedPathForOrdinalRange(routeId, start, 365.999, verticalOffset)} ${combinedPathForOrdinalRange(routeId, 1, end, verticalOffset)}`;
  }
  const points = [];
  for (let ordinal = start; ordinal < end; ordinal += 0.75) {
    points.push(combinedPointForOrdinal(routeId, ordinal, verticalOffset));
  }
  points.push(combinedPointForOrdinal(routeId, end, verticalOffset));
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

function combinedPointForOrdinal(routeId, rawOrdinal, verticalOffset = 0) {
  const points = combinedDayPointsByRoute.get(routeId) || [];
  if (!points.length) return { x: 0, y: 0 };
  const ordinal = Math.max(1, Math.min(365.999, rawOrdinal));
  const position = Math.max(0, Math.min(points.length - 1, ordinal - 1));
  const lower = Math.floor(position);
  const upper = Math.min(points.length - 1, lower + 1);
  const ratio = position - lower;
  const lowerPoint = points[lower];
  const upperPoint = points[upper];
  return {
    x: round(lowerPoint.x + (upperPoint.x - lowerPoint.x) * ratio),
    y: round(lowerPoint.y + (upperPoint.y - lowerPoint.y) * ratio + verticalOffset),
  };
}

function bindCombinedRouteInteractions() {
  initNwiDayTooltip();
  const tooltip = document.querySelector('[data-rhythm-tooltip]');
  document.querySelectorAll('[data-combined-segment]').forEach((element) => {
    const routeId = element.dataset.combinedRouteId;
    const segmentIndex = Number(element.dataset.combinedSegmentIndex);
    const show = (event) => showCombinedSegmentTooltip(routeId, segmentIndex, event, tooltip);
    element.addEventListener('pointerenter', show);
    element.addEventListener('pointermove', show);
    element.addEventListener('pointerleave', () => { if (tooltip) tooltip.hidden = true; });
    element.addEventListener('focus', show);
    element.addEventListener('blur', () => { if (tooltip) tooltip.hidden = true; });
    element.addEventListener('click', () => selectCombinedSegment(routeId, segmentIndex));
    element.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectCombinedSegment(routeId, segmentIndex);
    });
  });

  document.querySelectorAll('[data-combined-day]').forEach((element) => {
    const routeId = element.dataset.combinedRouteId;
    const segmentIndex = Number(element.dataset.combinedSegmentIndex);
    const dayIndex = Number(element.dataset.combinedDayIndex);
    const show = (event) => showCombinedNwiTooltip(routeId, segmentIndex, dayIndex, event);
    element.addEventListener('pointerenter', show);
    element.addEventListener('pointermove', show);
    element.addEventListener('pointerleave', hideNwiDayTooltip);
    element.addEventListener('focus', show);
    element.addEventListener('blur', hideNwiDayTooltip);
  });
}

function showCombinedSegmentTooltip(routeId, segmentIndex, event, tooltip) {
  const routeData = combinedRouteData.get(routeId);
  const segment = routeData?.segments[segmentIndex];
  if (!tooltip || !segment) return;
  tooltip.innerHTML = [
    `<strong>${combinedRouteShortLabels[routeId]} · ${escapeSvgText(combinedSegmentPlaceLabel(segment))}</strong>`,
    `<span>停留 ${escapeSvgText(segment.dates)} · ${escapeSvgText(segment.source)}</span>`,
    `<br><span>起点 ${escapeSvgText(segment.fromLocation || '—')} · 终点 ${escapeSvgText(segment.toLocation || '—')}</span>`,
    `<br><span>平均 NWI ${formatNwiNumber(segment.avgNwi, 1)} · 采蜜率 ${formatPercentSafe(segment.goodHoneyRate)} · 风险 ${formatNwiNumber(segment.climateRiskIndex, 2)}</span>`,
    '<br><span>点击后右侧风险链定位到该地理段</span>',
  ].join('');
  tooltip.hidden = false;
  if (event?.clientX != null) positionTooltip(event, tooltip);
}

function showCombinedNwiTooltip(routeId, segmentIndex, dayIndex, event) {
  const routeData = combinedRouteData.get(routeId);
  const segment = routeData?.segments[segmentIndex];
  const row = segment?.dailyRows[dayIndex];
  const tooltip = document.querySelector('[data-nwi-day-tooltip]');
  if (!tooltip || !row || !segment) return;
  const effective = isEffectiveHoneyDay(row, segment);
  tooltip.hidden = false;
  tooltip.innerHTML = `
    <strong>${combinedRouteShortLabels[routeId]} · ${escapeSvgText(segment.toLocation || segment.route)} · ${formatNwiDate(row.date)}</strong>
    <span>路段 ${escapeSvgText(combinedSegmentPlaceLabel(segment))}</span>
    <span>停留 ${escapeSvgText(segment.dates)}</span>
    <i style="background:${nwiBubbleColor(row.nwi)}"></i>
    <b>NWI ${Math.round(row.nwi)}</b>
    <span>${escapeSvgText(row.weather)}</span>
    <span>${formatNwiNumber(row.tempMin, 0)}-${formatNwiNumber(row.tempMax, 0)}°C · Rain ${formatNwiNumber(row.precipitation, 1)}mm</span>
    <span>${row.goodHoneyDay ? 'L3 天气适宜' : 'L3 不适宜'}${effective ? ' · L5 有效采蜜' : ''}</span>
  `;
  positionFloatingTooltip(tooltip, event);
}

function positionFloatingTooltip(tooltip, event) {
  const gap = 12;
  const clientX = Number.isFinite(event?.clientX) ? event.clientX : window.innerWidth * 0.5;
  const clientY = Number.isFinite(event?.clientY) ? event.clientY : window.innerHeight * 0.5;
  tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - tooltip.offsetWidth - 8, clientX + gap))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(window.innerHeight - tooltip.offsetHeight - 8, clientY + gap))}px`;
}

function selectCombinedSegment(routeId, segmentIndex, focusOrdinal = null) {
  const routeData = combinedRouteData.get(routeId);
  const segment = routeData?.segments[segmentIndex];
  if (!segment) return;
  document.querySelector('[data-risk-tab="route"]')?.click();
  setSelectedNode(`${routeData.routeName}-2020s-${segment.id}`, {
    id: `${routeData.routeName}-2020s-${segment.id}`,
    route_name: routeData.routeName,
    segment_order: segment.id,
    location: segment.toLocation,
    from_location: segment.fromLocation,
    to_location: segment.toLocation,
  });
  applyCombinedSelection();
  focusCombinedSegment(routeId, segmentIndex, focusOrdinal);
}

function applyCombinedSelection() {
  if (!isCombinedRouteMode) return;
  paintCombinedSvgCells();
}

function showCombinedViewLegend() {
  const legend = document.querySelector('.flowering-legend');
  if (!legend) return;
  if (originalFloweringLegendMarkup == null) {
    originalFloweringLegendMarkup = legend.innerHTML;
    originalFloweringLegendLabel = legend.getAttribute('aria-label') || '';
  }
  legend.classList.add('is-combined-view');
  legend.dataset.legendMode = 'combined';
  legend.setAttribute('aria-label', '四线合并视图图例');
  legend.innerHTML = [
    '<span><i class="combined-legend-symbol is-day-cell"></i>1 小格 = 1 天</span>',
    '<span><i class="combined-legend-symbol is-segment-fill"></i>小格填色：停留时段 / 路段归属</span>',
    '<span><i class="combined-legend-symbol is-nwi"></i>NWI 色值：逐日气象适宜度</span>',
    '<span><i class="combined-legend-symbol is-l3"></i>L3 描边：天气窗口适宜日</span>',
    '<span><i class="combined-legend-symbol is-l5"></i>L5 深绿边：有效采蜜日</span>',
    '<span><i class="combined-legend-symbol is-segment-line"></i>半透明粗线：该段停留时间与地点段</span>',
    '<span><i class="combined-legend-symbol is-route-hover"></i>大线路高亮：联动右侧风险面板</span>',
  ].join('');
}

function hideCombinedViewLegend() {
  const legend = document.querySelector('.flowering-legend');
  if (!legend || originalFloweringLegendMarkup == null) return;
  if (legend.dataset.legendMode === 'combined') {
    legend.innerHTML = originalFloweringLegendMarkup;
    if (originalFloweringLegendLabel) legend.setAttribute('aria-label', originalFloweringLegendLabel);
    else legend.removeAttribute('aria-label');
  }
  legend.classList.remove('is-combined-view');
  delete legend.dataset.legendMode;
}

function initCombinedSegmentFocusControl() {
  const shell = document.querySelector('[data-canvas-shell]');
  const canvas = document.querySelector('[data-flowering-canvas]');
  if (!shell || !canvas || canvas.querySelector('[data-combined-segment-focus-back]')) return;
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'compact-button combined-segment-focus-back';
  back.dataset.combinedSegmentFocusBack = '';
  back.textContent = 'Back';
  back.hidden = true;
  back.addEventListener('click', () => resetCombinedSegmentFocus());
  canvas.append(back);
  const note = document.createElement('section');
  note.className = 'combined-segment-focus-note';
  note.dataset.combinedSegmentFocusNote = '';
  note.hidden = true;
  canvas.append(note);
  shell.addEventListener('scroll', positionCombinedSegmentFocusOverlays, { passive: true });
  window.addEventListener('resize', positionCombinedSegmentFocusOverlays);
}

function focusCombinedSegment(routeId, segmentIndex, focusOrdinal = null) {
  if (!isCombinedRouteMode) return;
  const routeData = combinedRouteData.get(routeId);
  const segment = routeData?.segments[segmentIndex];
  const canvas = document.querySelector('[data-flowering-canvas]');
  const shell = document.querySelector('[data-canvas-shell]');
  if (!segment || !canvas || !shell) return;
  const focus = combinedSegmentFocusBounds(routeId, segment, focusOrdinal);
  if (!focus) return;

  combinedSegmentFocusState ??= {
    zoom,
    scrollLeft: shell.scrollLeft,
    scrollTop: shell.scrollTop,
  };

  const back = document.querySelector('[data-combined-segment-focus-back]');
  if (back) {
    back.style.left = '0px';
    back.style.top = '0px';
    back.removeAttribute('hidden');
  }
  renderCombinedSegmentFocusNote(routeId, segment);
  canvas.classList.add('is-combined-segment-focused');
  setZoom(3.2);

  requestAnimationFrame(() => {
    const centerX = canvas.offsetLeft + canvasXToPixel(focus.center.x, canvas);
    const centerY = canvas.offsetTop + canvasYToPixel(focus.center.y, canvas);
    shell.scrollLeft = clampNumber(centerX - shell.clientWidth / 2, 0, Math.max(0, shell.scrollWidth - shell.clientWidth));
    shell.scrollTop = clampNumber(centerY - shell.clientHeight / 2, 0, Math.max(0, shell.scrollHeight - shell.clientHeight));
    positionCombinedSegmentFocusOverlays();
  });
}

function renderCombinedSegmentFocusNote(routeId, segment) {
  const note = document.querySelector('[data-combined-segment-focus-note]');
  if (!note || !segment) return;
  note.innerHTML = [
    '<small>当前放大路段</small>',
    '<strong>' + escapeSvgText(combinedRouteShortLabels[routeId] || routeId) + ' · ' + escapeSvgText(combinedSegmentPlaceLabel(segment)) + '</strong>',
    '<span>时间 ' + escapeSvgText(segment.dates || '—') + '</span>',
    '<span>起点 ' + escapeSvgText(segment.fromLocation || '—') + ' · 终点 ' + escapeSvgText(segment.toLocation || '—') + '</span>',
  ].join('');
  note.removeAttribute('hidden');
}

function combinedSegmentFocusBounds(routeId, segment, focusOrdinal = null) {
  const pointGroups = combinedOrdinalGroups(segmentStartOrdinal(segment), segmentEndOrdinal(segment))
    .map((ordinals) => ordinals.map((ordinal) => combinedCellCenter(routeId, ordinal)).filter(Boolean))
    .filter((points) => points.length);
  if (!pointGroups.length) return null;

  let focusPoints = pointGroups.flat();
  if (Number.isFinite(Number(focusOrdinal))) {
    const ordinal = Number(focusOrdinal);
    const containingGroup = pointGroups.find((points) => points.some((point) => point.ordinal === ordinal));
    if (containingGroup?.length) focusPoints = containingGroup;
  } else if (pointGroups.length > 1) {
    focusPoints = [...pointGroups].sort((a, b) => b.length - a.length)[0];
  }

  const xs = focusPoints.map((point) => point.x);
  const ys = focusPoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    },
  };
}

function resetCombinedSegmentFocus({ restoreView = true } = {}) {
  const canvas = document.querySelector('[data-flowering-canvas]');
  const shell = document.querySelector('[data-canvas-shell]');
  const back = document.querySelector('[data-combined-segment-focus-back]');
  const note = document.querySelector('[data-combined-segment-focus-note]');
  back?.setAttribute('hidden', '');
  note?.setAttribute('hidden', '');
  canvas?.classList.remove('is-combined-segment-focused');
  const previousState = combinedSegmentFocusState;
  combinedSegmentFocusState = null;
  if (isCombinedRouteMode && restoreView) showCombinedViewLegend();
  if (!restoreView || !shell || !previousState) return;
  setZoom(previousState.zoom ?? 1);
  requestAnimationFrame(() => {
    shell.scrollLeft = previousState.scrollLeft ?? 0;
    shell.scrollTop = previousState.scrollTop ?? 0;
  });
}

function positionCombinedSegmentFocusOverlays() {
  positionCombinedSegmentFocusNote();
  positionCombinedSegmentFocusBack();
}

function positionCombinedSegmentFocusNote() {
  const note = document.querySelector('[data-combined-segment-focus-note]');
  const shell = document.querySelector('[data-canvas-shell]');
  const canvas = document.querySelector('[data-flowering-canvas]');
  if (!note || note.hidden || !shell || !canvas) return;
  const inset = 18;
  note.style.left = (shell.scrollLeft - canvas.offsetLeft + inset) + 'px';
  note.style.top = (shell.scrollTop - canvas.offsetTop + inset) + 'px';
}

function positionCombinedSegmentFocusBack() {
  const back = document.querySelector('[data-combined-segment-focus-back]');
  const shell = document.querySelector('[data-canvas-shell]');
  const canvas = document.querySelector('[data-flowering-canvas]');
  if (!back || back.hidden || !shell || !canvas) return;
  const inset = 18;
  back.style.left = (shell.scrollLeft + shell.clientWidth - canvas.offsetLeft - back.offsetWidth - inset) + 'px';
  back.style.top = (shell.scrollTop + shell.clientHeight - canvas.offsetTop - back.offsetHeight - inset) + 'px';
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPercentSafe(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 100)}%` : '—';
}

async function renderLaneHighlights() {
  const layer = document.querySelector('[data-lane-highlight-layer]');
  if (!layer) return;
  laneHighlightPathMarkup = await Promise.all(
    currentRouteConfig.lineAssets.map(async (asset) => {
      const response = await fetch(asset);
      if (!response.ok) throw new Error(`高亮弧线 ${index + 1} 载入失败`);
      const source = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
      return [...source.querySelectorAll('path')]
        .filter((path) => String(path.getAttribute('fill') || '').toLowerCase() === '#f2eee0')
        .map((path) => path.outerHTML)
        .join('');
    }),
  );
  layer.innerHTML = laneHighlightFrames.map((frame, index) => {
    const { x, y, width, height } = laneHighlightFrames[index];
    const label = formatLaneLabel(index);
    return `
    <g class="lane-highlight" data-lane-index="${index}" tabindex="0" role="button"
      aria-label="${label}">
      <image class="lane-highlight-art" href="${resolveAssetUrl(currentRouteConfig.lineAssets[index])}"
        x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none"></image>
      <g class="lane-highlight-hit" transform="translate(${frame.x} ${frame.y})">${laneHighlightPathMarkup[index]}</g>
    </g>
  `;
  }).join('');
  buildLaneDayPoints(layer);

  const activeLayer = document.querySelector('[data-lane-active-flowering-layer]');
  if (!activeLayer || !activeFloweringSourceUrl) return;
  activeLayer.innerHTML = `
    <defs>
      ${laneHighlightFrames.map((frame, index) => `
        <mask id="lane-active-flowering-mask-${index}" maskUnits="userSpaceOnUse" x="-140" y="-160" width="1422" height="1452">
          <rect x="-140" y="-160" width="1422" height="1452" fill="black"></rect>
          <g transform="translate(${frame.x} ${frame.y})">${laneHighlightPathMarkup[index].replaceAll('#F2EEE0', '#ffffff')}</g>
        </mask>
      `).join('')}
    </defs>
    ${laneHighlightFrames.map((_, index) => `
      <g class="lane-active-flowering" data-lane-active-flowering="${index}">
        <image href="${activeFloweringSourceUrl}" x="${currentRouteConfig.floweringFrame.x}" y="${currentRouteConfig.floweringFrame.y}"
          width="${currentRouteConfig.floweringFrame.width}" height="${currentRouteConfig.floweringFrame.height}" mask="url(#lane-active-flowering-mask-${index})"></image>
      </g>
    `).join('')}
  `;
}

function buildLaneDayPoints(layer) {
  laneDayPoints = [...layer.querySelectorAll('[data-lane-index]')].map((lane, laneIndex) => {
    const frame = laneHighlightFrames[laneIndex];
    const rawPoints = [...lane.querySelectorAll('.lane-highlight-hit path')].map((path) => {
      const box = path.getBBox();
      return { x: box.x + box.width / 2 + frame.x, y: box.y + box.height / 2 + frame.y };
    });
    if (currentRouteId === 'west-northwest') return orderWestLaneDayPoints(rawPoints);
    if (currentRouteId === 'central-route') return orderCentralLaneDayPoints(rawPoints);
    if (currentRouteId === 'south-route') return orderSouthLaneDayPoints(rawPoints);
    return orderLaneDayPoints(rawPoints);
  });
  const allPoints = laneDayPoints.flat();
  if (!allPoints.length) return;
  routeGeometryCenter = {
    x: allPoints.reduce((sum, point) => sum + point.x, 0) / allPoints.length,
    y: allPoints.reduce((sum, point) => sum + point.y, 0) / allPoints.length,
  };
}

function laneIndexForSegment(segmentIndex) {
  return currentRouteConfig.segmentLaneMap?.[segmentIndex] ?? segmentIndex;
}

function segmentIndexesForLane(laneIndex) {
  if (!currentRouteConfig.segmentLaneMap) return segments[laneIndex] ? [laneIndex] : [];
  return currentRouteConfig.segmentLaneMap
    .map((mappedLaneIndex, segmentIndex) => (mappedLaneIndex === laneIndex ? segmentIndex : -1))
    .filter((segmentIndex) => segmentIndex >= 0 && segments[segmentIndex]);
}

function primarySegmentIndexForLane(laneIndex) {
  return segmentIndexesForLane(laneIndex)[0] ?? laneIndex;
}

function segmentsForLane(laneIndex) {
  return segmentIndexesForLane(laneIndex).map((segmentIndex) => segments[segmentIndex]).filter(Boolean);
}

function formatLaneLabel(laneIndex) {
  const laneSegments = segmentsForLane(laneIndex);
  if (!laneSegments.length) return `第 ${laneIndex + 1} 条未标注弧线`;
  return laneSegments.map((segment) => `${segment.route}，${segment.dates}`).join(' / ');
}

function orderLaneDayPoints(rawPoints) {
  if (rawPoints.length < 3) return rawPoints;
  const remaining = rawPoints.slice(1);
  const ordered = [rawPoints[0]];
  while (remaining.length) {
    const current = ordered.at(-1);
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const point = remaining[index];
      const distance = (point.x - current.x) ** 2 + (point.y - current.y) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }
    ordered.push(remaining.splice(nearestIndex, 1)[0]);
  }
  return ordered;
}

function orderCentralLaneDayPoints(rawPoints) {
  if (rawPoints.length < 3) return rawPoints;

  // Central-route L0 cells are exported out of calendar order. Its January
  // anchor is the lower-left endpoint; trace the connected arc from that
  // endpoint so L2/L3/L5/NWI all land on the correct day cells.
  return orderPointsAlongMinimumSpanningArc(rawPoints, (candidates) => candidates.reduce((best, item) => {
    const point = rawPoints[item.index];
    const bestPoint = rawPoints[best.index];
    if (point.x !== bestPoint.x) return point.x < bestPoint.x ? item : best;
    return point.y > bestPoint.y ? item : best;
  }));
}

function orderPointsAlongMinimumSpanningArc(rawPoints, selectStartCandidate) {
  const count = rawPoints.length;
  const isInTree = Array(count).fill(false);
  const nearestDistance = Array(count).fill(Infinity);
  const parent = Array(count).fill(-1);
  const neighbors = Array.from({ length: count }, () => []);
  nearestDistance[0] = 0;

  for (let step = 0; step < count; step += 1) {
    let next = -1;
    for (let index = 0; index < count; index += 1) {
      if (!isInTree[index] && (next < 0 || nearestDistance[index] < nearestDistance[next])) next = index;
    }
    isInTree[next] = true;
    if (parent[next] >= 0) {
      const distance = Math.sqrt(nearestDistance[next]);
      neighbors[next].push({ index: parent[next], distance });
      neighbors[parent[next]].push({ index: next, distance });
    }
    for (let index = 0; index < count; index += 1) {
      if (isInTree[index]) continue;
      const candidate = rawPoints[index];
      const current = rawPoints[next];
      const distance = (candidate.x - current.x) ** 2 + (candidate.y - current.y) ** 2;
      if (distance < nearestDistance[index]) {
        nearestDistance[index] = distance;
        parent[index] = next;
      }
    }
  }

  const endpoints = neighbors
    .map((items, index) => ({ index, degree: items.length }))
    .filter((item) => item.degree === 1);
  const candidates = endpoints.length ? endpoints : rawPoints.map((_, index) => ({ index }));
  const startIndex = selectStartCandidate(candidates).index;
  const accumulatedDistance = Array(count).fill(Infinity);
  accumulatedDistance[startIndex] = 0;
  const stack = [{ index: startIndex, previous: -1 }];

  while (stack.length) {
    const { index, previous } = stack.pop();
    neighbors[index].forEach((neighbor) => {
      if (neighbor.index === previous) return;
      accumulatedDistance[neighbor.index] = accumulatedDistance[index] + neighbor.distance;
      stack.push({ index: neighbor.index, previous: index });
    });
  }

  return rawPoints
    .map((point, index) => ({ ...point, distance: accumulatedDistance[index] }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ distance, ...point }) => point);
}

function orderWestLaneDayPoints(rawPoints) {
  if (rawPoints.length < 3) return rawPoints;

  // The cropped West-route SVGs do not share a source-path start.  Their
  // left-most endpoint is the January edge in L0; trace the actual arc from
  // that anchor through the minimum-spanning path to retain the shared yearly
  // Jan-to-Dec sequence on every lane.
  const count = rawPoints.length;
  const isInTree = Array(count).fill(false);
  const nearestDistance = Array(count).fill(Infinity);
  const parent = Array(count).fill(-1);
  const neighbors = Array.from({ length: count }, () => []);
  nearestDistance[0] = 0;

  for (let step = 0; step < count; step += 1) {
    let next = -1;
    for (let index = 0; index < count; index += 1) {
      if (!isInTree[index] && (next < 0 || nearestDistance[index] < nearestDistance[next])) next = index;
    }
    isInTree[next] = true;
    if (parent[next] >= 0) {
      const distance = Math.sqrt(nearestDistance[next]);
      neighbors[next].push({ index: parent[next], distance });
      neighbors[parent[next]].push({ index: next, distance });
    }
    for (let index = 0; index < count; index += 1) {
      if (isInTree[index]) continue;
      const candidate = rawPoints[index];
      const current = rawPoints[next];
      const distance = (candidate.x - current.x) ** 2 + (candidate.y - current.y) ** 2;
      if (distance < nearestDistance[index]) {
        nearestDistance[index] = distance;
        parent[index] = next;
      }
    }
  }

  const januaryIndex = rawPoints.reduce((leftmost, point, index) => (
    point.x < rawPoints[leftmost].x ? index : leftmost
  ), 0);
  const accumulatedDistance = Array(count).fill(Infinity);
  accumulatedDistance[januaryIndex] = 0;
  const stack = [{ index: januaryIndex, previous: -1 }];

  while (stack.length) {
    const { index, previous } = stack.pop();
    neighbors[index].forEach((neighbor) => {
      if (neighbor.index === previous) return;
      accumulatedDistance[neighbor.index] = accumulatedDistance[index] + neighbor.distance;
      stack.push({ index: neighbor.index, previous: index });
    });
  }

  return rawPoints
    .map((point, index) => ({ ...point, distance: accumulatedDistance[index] }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ distance, ...point }) => point);
}

function orderSouthLaneDayPoints(rawPoints) {
  if (rawPoints.length < 3) return rawPoints;

  // South-route SVG path fragments are not emitted in calendar order. Build a
  // geometric path from the L0 cells, then start from the left/top endpoint
  // where the month labels begin. This preserves date-to-position accuracy for
  // L2/L3/L5/NWI instead of relying on arbitrary SVG element order.
  const count = rawPoints.length;
  const isInTree = Array(count).fill(false);
  const nearestDistance = Array(count).fill(Infinity);
  const parent = Array(count).fill(-1);
  const neighbors = Array.from({ length: count }, () => []);
  nearestDistance[0] = 0;

  for (let step = 0; step < count; step += 1) {
    let next = -1;
    for (let index = 0; index < count; index += 1) {
      if (!isInTree[index] && (next < 0 || nearestDistance[index] < nearestDistance[next])) next = index;
    }
    isInTree[next] = true;
    if (parent[next] >= 0) {
      const distance = Math.sqrt(nearestDistance[next]);
      neighbors[next].push({ index: parent[next], distance });
      neighbors[parent[next]].push({ index: next, distance });
    }
    for (let index = 0; index < count; index += 1) {
      if (isInTree[index]) continue;
      const candidate = rawPoints[index];
      const current = rawPoints[next];
      const distance = (candidate.x - current.x) ** 2 + (candidate.y - current.y) ** 2;
      if (distance < nearestDistance[index]) {
        nearestDistance[index] = distance;
        parent[index] = next;
      }
    }
  }

  const endpoints = neighbors
    .map((items, index) => ({ index, degree: items.length }))
    .filter((item) => item.degree === 1);
  const januaryIndex = (endpoints.length ? endpoints : rawPoints.map((_, index) => ({ index })))
    .reduce((best, item) => {
      const point = rawPoints[item.index];
      const bestPoint = rawPoints[best.index];
      if (point.x !== bestPoint.x) return point.x < bestPoint.x ? item : best;
      return point.y < bestPoint.y ? item : best;
    }).index;
  const accumulatedDistance = Array(count).fill(Infinity);
  accumulatedDistance[januaryIndex] = 0;
  const stack = [{ index: januaryIndex, previous: -1 }];

  while (stack.length) {
    const { index, previous } = stack.pop();
    neighbors[index].forEach((neighbor) => {
      if (neighbor.index === previous) return;
      accumulatedDistance[neighbor.index] = accumulatedDistance[index] + neighbor.distance;
      stack.push({ index: neighbor.index, previous: index });
    });
  }

  return rawPoints
    .map((point, index) => ({ ...point, distance: accumulatedDistance[index] }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ distance, ...point }) => point);
}

function renderSegmentContent(renderer) {
  return segments
    .map((segment, index) => `<g data-segment-content="${index}">${renderer(segment, index)}</g>`)
    .join('');
}

function renderNwiBubble(segment, index) {
  const ordinal = segmentMidOrdinal(segment);
  const anchor = overlayPointForOrdinal(ordinal, index);
  const nwi = segmentNwi[index];
  const hasNwi = Number.isFinite(nwi);
  const radius = hasNwi ? 10 + ((nwi - 45) / 45) * 12 : 12;
  const center = nwiBubbleOrbitPoint(ordinal, index);
  const value = hasNwi ? Math.round(nwi) : '?';
  return `
    <g class="overlay-nwi-mark" data-nwi-mark="${index}">
      <line class="overlay-nwi-leader" x1="${anchor.x}" y1="${anchor.y}" x2="${center.x}" y2="${center.y}"></line>
      <circle class="overlay-nwi-halo" cx="${center.x}" cy="${center.y}" r="${(radius + 4).toFixed(1)}"></circle>
      <circle class="overlay-nwi-bubble${hasNwi ? '' : ' is-missing'}" data-nwi-segment="${index}" tabindex="0" role="button" aria-label="${segment.route} NWI ${hasNwi ? value : '\u8d44\u6599\u4e0d\u8db3'}" cx="${center.x}" cy="${center.y}" r="${radius.toFixed(1)}" fill="${hasNwi ? nwiBubbleColor(nwi) : '#bdb8af'}">
        <title>${segment.route}: NWI ${value}</title>
      </circle>
      <text class="overlay-nwi-value" x="${center.x}" y="${center.y + 2.8}" text-anchor="middle">${value}</text>
    </g>
  `;
}

function initNwiBubbleInteractions() {
  if (isCombinedRouteMode) return;
  document.querySelectorAll('[data-nwi-segment]').forEach((mark) => {
    const index = Number(mark.dataset.nwiSegment);
    mark.addEventListener('click', () => openNwiDetail(index));
  });
  initNwiDayTooltip();
  renderOverviewDailyNwiBubbles();
}

function renderOverviewDailyNwiBubbles() {
  const layer = document.querySelector('[data-nwi-daily-layer]');
  if (!layer || isCombinedRouteMode || selectedNwiSegment != null) return;
  layer.classList.remove('is-focused');
  layer.innerHTML = segments.map((segment, segmentIndex) => {
    const rows = dailyNwiBySegment.get(segmentIndex) || [];
    return `<g class="overlay-nwi-daily-overview-segment" data-segment-content="${segmentIndex}" data-nwi-daily-overview-segment="${segmentIndex}">${rows.map((row) => {
      const point = nwiOverviewDailyOrbitPoint(row.ordinal, segmentIndex);
      const radius = Math.max(5, 5.5 + ((row.nwi - 40) / 50) * 7);
      return `<circle class="overlay-nwi-daily-bubble" aria-hidden="true" cx="${point.x}" cy="${point.y}" r="${radius.toFixed(1)}" fill="${nwiBubbleColor(row.nwi)}"></circle>`;
    }).join('')}</g>`;
  }).join('');
}

function renderDailyNwiBubbles(segmentIndex) {
  const layer = document.querySelector('[data-nwi-daily-layer]');
  const rows = dailyNwiBySegment.get(segmentIndex);
  if (!layer || isCombinedRouteMode || !rows?.length) return;
  const focused = selectedNwiSegment === segmentIndex;
  layer.classList.toggle('is-focused', focused);
  const segment = segments[segmentIndex];
  const stayAreaPath = focused ? nwiStayAreaPath(segment, segmentIndex, 133) : '';
  const stayArea = stayAreaPath
    ? `<path class="overlay-nwi-stay-area" data-nwi-stay-area tabindex="0" role="button" aria-label="${segment.route}, ${segment.dates}" d="${stayAreaPath}" style="fill:#65977d;fill-opacity:0.24;stroke:#3f7776;stroke-opacity:0.88;stroke-width:1.65;stroke-linejoin:round;pointer-events:visiblePainted"></path>`
    : '';
  const goodHoneyAreas = focused && activeLayers.has('l3')
    ? renderGoodHoneyAreas(rows, segment, segmentIndex, 133)
    : '';
  const effectiveHoneyAreas = focused && activeLayers.has('l5')
    ? renderEffectiveHoneyAreas(rows, segment, segmentIndex, 133)
    : '';
  const stayArc = focused
    ? `<path class="overlay-nwi-stay-arc" d="${nwiDailyPathForOrdinalRange(segmentStartOrdinal(segment), segmentEndOrdinal(segment), 133, segmentIndex)}"></path>`
    : '';
  layer.innerHTML = `${stayArea}${goodHoneyAreas}${effectiveHoneyAreas}${stayArc}<g data-nwi-daily-bubbles>${rows.map((row, index) => {
    const point = nwiDailyOrbitPoint(row.ordinal, segmentIndex);
    const radius = focused ? Math.max(5.5, 5.5 + ((row.nwi - 40) / 50) * 5) : Math.max(5, 5.5 + ((row.nwi - 40) / 50) * 7);
    return `<g class="overlay-nwi-daily-day"><circle class="overlay-nwi-daily-bubble" data-nwi-daily-day="${index}" tabindex="0" role="button" aria-label="${formatNwiDate(row.date)}, NWI ${Math.round(row.nwi)}" cx="${point.x}" cy="${point.y}" r="${radius.toFixed(1)}" fill="${nwiBubbleColor(row.nwi)}" style="pointer-events:all"></circle></g>`;
  }).join('')}</g><g class="overlay-nwi-daily-hover" data-nwi-daily-hover-layer></g>`;
  bindDailyNwiInteractions(layer);
  bindNwiStayAreaInteractions(layer, segment);
  bindGoodHoneyAreaInteractions(layer);
  bindEffectiveHoneyAreaInteractions(layer);
}

function bindNwiStayAreaInteractions(layer, segment) {
  const area = layer.querySelector('[data-nwi-stay-area]');
  if (!area) return;
  const show = (event) => showNwiStayTooltip(segment, event);
  area.addEventListener('pointerenter', show);
  area.addEventListener('pointermove', show);
  area.addEventListener('pointerleave', hideNwiStayTooltip);
  area.addEventListener('focus', show);
  area.addEventListener('blur', hideNwiStayTooltip);
}

function bindGoodHoneyAreaInteractions(layer) {
  layer.querySelectorAll('[data-good-honey-area]').forEach((area) => {
    const date = area.dataset.goodHoneyDate;
    const show = (event) => showGoodHoneyTooltip(date, event);
    area.addEventListener('pointerenter', show);
    area.addEventListener('pointermove', show);
    area.addEventListener('pointerleave', hideGoodHoneyTooltip);
    area.addEventListener('focus', show);
    area.addEventListener('blur', hideGoodHoneyTooltip);
  });
}

function bindEffectiveHoneyAreaInteractions(layer) {
  layer.querySelectorAll('[data-effective-honey-area]').forEach((area) => {
    const date = area.dataset.effectiveHoneyDate;
    const show = (event) => showEffectiveHoneyTooltip(date, event);
    area.addEventListener('pointerenter', show);
    area.addEventListener('pointermove', show);
    area.addEventListener('pointerleave', hideEffectiveHoneyTooltip);
    area.addEventListener('focus', show);
    area.addEventListener('blur', hideEffectiveHoneyTooltip);
  });
}

function bindDailyNwiInteractions(layer) {
  layer.querySelectorAll('[data-nwi-daily-day]').forEach((bubble) => {
    const dayIndex = Number(bubble.dataset.nwiDailyDay);
    const activate = (event) => {
      if (activeNwiDailyBubble !== bubble) activateNwiDailyBubble(bubble);
      showNwiDayTooltip(dayIndex, event);
    };
    const deactivate = () => {
      requestAnimationFrame(() => {
        if (activeNwiDailyBubble !== bubble || bubble.matches(':hover') || document.activeElement === bubble) return;
        deactivateNwiDailyBubble(bubble);
        hideNwiDayTooltip();
      });
    };
    bubble.addEventListener('pointerenter', activate);
    bubble.addEventListener('pointermove', activate);
    bubble.addEventListener('pointerleave', deactivate);
    bubble.addEventListener('focus', activate);
    bubble.addEventListener('blur', deactivate);
  });
}

function activateNwiDailyBubble(bubble) {
  if (selectedNwiSegment == null) return;
  const row = dailyNwiBySegment.get(selectedNwiSegment)?.[Number(bubble.dataset.nwiDailyDay)];
  if (!row) return;
  document.querySelectorAll('[data-nwi-daily-value]').forEach((value) => value.remove());
  document.querySelectorAll('.overlay-nwi-daily-day.is-active').forEach((day) => day.classList.remove('is-active'));
  const day = bubble.parentElement;
  if (!day) return;
  activeNwiDailyBubble = bubble;
  day.classList.add('is-active');
  document.querySelector(`[data-nwi-calendar-date="${row.date}"]`)?.classList.add('is-active');
  setCalendarLinkedDay(row.date, true);
  const hoverLayer = document.querySelector('[data-nwi-daily-hover-layer]');
  hoverLayer?.replaceChildren();
  const elevatedBubble = bubble.cloneNode(false);
  elevatedBubble.classList.add('is-hover-preview');
  elevatedBubble.removeAttribute('data-nwi-daily-day');
  elevatedBubble.removeAttribute('tabindex');
  elevatedBubble.removeAttribute('role');
  elevatedBubble.removeAttribute('aria-label');
  elevatedBubble.setAttribute('pointer-events', 'none');
  hoverLayer?.append(elevatedBubble);
  const value = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  value.classList.add('overlay-nwi-daily-value');
  value.dataset.nwiDailyValue = '';
  value.setAttribute('x', bubble.getAttribute('cx'));
  value.setAttribute('y', String(Number(bubble.getAttribute('cy')) + 2.7));
  value.setAttribute('text-anchor', 'middle');
  value.textContent = String(Math.round(row.nwi));
  hoverLayer?.append(value);
}

function deactivateNwiDailyBubble(bubble) {
  if (activeNwiDailyBubble !== bubble) return;
  const row = selectedNwiSegment == null
    ? null
    : dailyNwiBySegment.get(selectedNwiSegment)?.[Number(bubble.dataset.nwiDailyDay)];
  activeNwiDailyBubble = null;
  bubble.parentElement?.classList.remove('is-active');
  document.querySelectorAll('[data-nwi-calendar-date].is-active').forEach((cell) => cell.classList.remove('is-active'));
  if (row) setCalendarLinkedDay(row.date, false);
  document.querySelector('[data-nwi-daily-hover-layer]')?.replaceChildren();
}

function clearDailyNwiBubbles() {
  if (selectedNwiSegment != null) return;
  activeNwiDailyBubble = null;
  const layer = document.querySelector('[data-nwi-daily-layer]');
  if (layer) {
    layer.classList.remove('is-focused');
    layer.replaceChildren();
  }
}

function openNwiDetail(segmentIndex) {
  const rows = dailyNwiBySegment.get(segmentIndex);
  if (!rows?.length) return;
  document.querySelector('[data-nwi-overview-calendars]')?.setAttribute('hidden', '');
  selectedNwiSegment = segmentIndex;
  renderDailyNwiBubbles(segmentIndex);
  document.querySelectorAll('[data-nwi-mark]').forEach((mark) => {
    const isSelected = Number(mark.dataset.nwiMark) === segmentIndex;
    mark.classList.toggle('is-detail-selected', isSelected);
    mark.classList.remove('is-nwi-dimmed');
  });
  renderNwiFocusCalendar(segmentIndex);
  focusCanvasOnNwi(segmentIndex);
}

function closeNwiDetail() {
  selectedNwiSegment = null;
  activeNwiDailyBubble = null;
  clearDailyNwiBubbles();
  document.querySelector('[data-flowering-canvas]')?.classList.remove('is-nwi-focused');
  document.querySelectorAll('[data-nwi-mark]').forEach((mark) => mark.classList.remove('is-detail-selected', 'is-nwi-dimmed'));
  setZoom(1);
  zoomBeforeNwiFocus = null;
  document.querySelector('[data-nwi-focus-exit]')?.setAttribute('hidden', '');
  document.querySelector('[data-nwi-focus-calendar]')?.setAttribute('hidden', '');
  const shell = document.querySelector('[data-canvas-shell]');
  if (shell) {
    shell.scrollLeft = 0;
    shell.scrollTop = 0;
  }
  const overviewCalendars = document.querySelector('[data-nwi-overview-calendars]');
  overviewCalendars?.removeAttribute('hidden');
  renderOverviewDailyNwiBubbles();
  hideNwiDayTooltip();
  hideNwiStayTooltip();
  hideGoodHoneyTooltip();
  hideEffectiveHoneyTooltip();
}

function initNwiFocusControl() {
  const shell = document.querySelector('[data-canvas-shell]');
  const canvas = document.querySelector('[data-flowering-canvas]');
  if (!shell || !canvas || canvas.querySelector('[data-nwi-focus-exit]')) return;
  const exit = document.createElement('button');
  exit.type = 'button';
  exit.className = 'compact-button nwi-focus-back';
  exit.dataset.nwiFocusExit = '';
  exit.textContent = 'Back';
  exit.hidden = true;
  exit.addEventListener('click', closeNwiDetail);
  canvas.append(exit);
  const calendar = document.createElement('section');
  calendar.className = 'nwi-focus-calendar';
  calendar.dataset.nwiFocusCalendar = '';
  calendar.hidden = true;
  canvas.append(calendar);
  shell.addEventListener('scroll', positionNwiFocusOverlays, { passive: true });
  window.addEventListener('resize', positionNwiFocusOverlays);
}

function initNwiOverviewCalendars() {
  const canvas = document.querySelector('[data-flowering-canvas]');
  if (!canvas || canvas.querySelector('[data-nwi-overview-calendars]')) return;
  const host = document.createElement('div');
  host.className = 'nwi-overview-calendars';
  host.dataset.nwiOverviewCalendars = '';
  host.dataset.routeId = currentRouteId;
  const isEastRoute = currentRouteId === 'east-coastal';
  const isSouthRoute = currentRouteId === 'south-route';
  const isCentralRoute = currentRouteId === 'central-route';
  const chronologicalIndexes = Array.from({ length: segments.length }, (_, index) => index);
  if (currentRouteConfig.winterFirst) chronologicalIndexes.push(chronologicalIndexes.shift());
  const splitIndex = Math.ceil(chronologicalIndexes.length / 2);
  const earlyIndexes = isEastRoute ? [1, 2, 3, 4, 5]
    : isSouthRoute ? chronologicalIndexes.slice(0, 4)
      : isCentralRoute ? [0, 1, 2, 3, 4]
        : chronologicalIndexes.slice(0, splitIndex);
  const lateIndexes = isEastRoute ? [6, 7, 0]
    : isSouthRoute ? chronologicalIndexes.slice(4)
      : isCentralRoute ? [5, 6, 0]
        : chronologicalIndexes.slice(splitIndex);
  const calendarTitles = currentRouteId === 'east-coastal'
    ? ['\u6625\u590f\u8fc1\u5f99\u5929\u6c14\u4e0e\u6709\u6548\u91c7\u871c\u7a97\u53e3', '\u79cb\u51ac\u8fc1\u5f99\u5929\u6c14\u4e0e\u6709\u6548\u91c7\u871c\u7a97\u53e3']
    : [`${currentRouteConfig.routeName}\u524d\u6bb5\u5929\u6c14\u4e0e\u6709\u6548\u91c7\u871c\u7a97\u53e3`, `${currentRouteConfig.routeName}\u540e\u6bb5\u5929\u6c14\u4e0e\u6709\u6548\u91c7\u871c\u7a97\u53e3`];
  host.innerHTML = `
    ${renderNwiOverviewCalendar(earlyIndexes, 'early', calendarTitles[0])}
    ${renderNwiOverviewCalendar(lateIndexes, 'late', calendarTitles[1])}
  `;
  canvas.append(host);
  bindNwiOverviewInteractions(host);
}

function renderNwiOverviewCalendar(segmentIndexes, placement, title) {
  if (currentRouteId === 'east-coastal') return renderEastOverviewCalendar(segmentIndexes, placement, title);
  const timeline = currentRouteId === 'central-route'
    ? buildCentralOverviewTimeline(placement)
    : buildOverviewTimeline(segmentIndexes);
  if (!timeline) return '';
  const { startDate, endDate, intervals } = timeline;
  const activeDates = new Map();
  intervals.forEach(({ segmentIndex, startDate: segmentStart }) => {
    (dailyNwiBySegment.get(segmentIndex) || []).forEach((row, dayIndex) => {
      const rowDate = parseNwiDate(row.date);
      let displayYear = segmentStart.getUTCFullYear();
      const rowMonthDay = (rowDate.getUTCMonth() + 1) * 100 + rowDate.getUTCDate();
      const startMonthDay = (segmentStart.getUTCMonth() + 1) * 100 + segmentStart.getUTCDate();
      if (rowMonthDay < startMonthDay) displayYear += 1;
      const displayDate = new Date(Date.UTC(displayYear, rowDate.getUTCMonth(), rowDate.getUTCDate()));
      activeDates.set(utcDateKey(displayDate), { row, dayIndex, segmentIndex });
    });
  });
  const gridStart = addUtcDays(startDate, -startDate.getUTCDay());
  const gridEnd = addUtcDays(endDate, 6 - endDate.getUTCDay());
  const gridDays = Math.round((gridEnd - gridStart) / 86400000) + 1;
  const weekCount = gridDays / 7;
  const cells = [];
  for (let index = 0; index < gridDays; index += 1) {
    const date = addUtcDays(gridStart, index);
    const dateKey = utcDateKey(date);
    const inRange = date >= startDate && date <= endDate;
    const active = activeDates.get(dateKey);
    const inStay = intervals.some((interval) => date >= interval.startDate && date <= interval.endDate);
    if (!inRange) {
      cells.push('<span class="nwi-overview-heat-cell is-outside" aria-hidden="true"></span>');
    } else if (!active && inStay) {
      cells.push(`<span class="nwi-overview-heat-cell is-missing" title="${formatNwiDate(dateKey)} \u8d44\u6599\u4e0d\u8db3" aria-label="${formatNwiDate(dateKey)} \u8d44\u6599\u4e0d\u8db3"></span>`);
    } else if (!active) {
      cells.push(`<span class="nwi-overview-heat-cell is-unmarked" title="${formatNwiDate(dateKey)} \u672a\u505c\u7559" aria-label="${formatNwiDate(dateKey)} \u672a\u505c\u7559"></span>`);
    } else {
      const { row, dayIndex, segmentIndex } = active;
      const effective = isEffectiveHoneyDay(row, segments[segmentIndex]);
      cells.push(`<button class="nwi-overview-heat-cell is-active${effective ? ' has-l5' : ''}" type="button"
        data-nwi-overview-day="${dayIndex}" data-nwi-overview-segment-index="${segmentIndex}" data-nwi-overview-date="${row.date}"
        style="--nwi-day-color:${nwiBubbleColor(row.nwi)}" aria-label="${formatNwiDate(row.date)}, NWI ${Math.round(row.nwi)}${row.goodHoneyDay ? ', L3' : ''}${effective ? ', L5' : ''}">
        ${row.goodHoneyDay ? '<i></i>' : ''}
      </button>`);
    }
  }
  const monthMarkers = [];
  let monthCursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  while (monthCursor <= endDate) {
    const visibleDate = monthCursor < startDate ? startDate : monthCursor;
    const dayOffset = Math.round((visibleDate - gridStart) / 86400000);
    const weekIndex = Math.floor(dayOffset / 7);
    monthMarkers.push(`<span style="left:${(weekIndex / weekCount * 100).toFixed(3)}%">${visibleDate.getUTCMonth() + 1}\u6708</span>`);
    monthCursor = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 1));
  }
  return `
    <section class="nwi-overview-calendar is-${placement}" data-nwi-overview-calendar="${placement}" aria-label="${title} NWI \u65e5\u5386">
      <header class="nwi-overview-header">
        <div><small>DAILY NWI CALENDAR</small><strong>${title}</strong></div>
        <b>${formatNwiDate(utcDateKey(startDate))}\u2013${formatNwiDate(utcDateKey(endDate))}</b>
      </header>
      <div class="nwi-overview-legend" aria-label="\u65e5\u5386\u56fe\u4f8b">
        <span class="is-nwi">NWI</span><span class="is-l3">L3 \u5929\u6c14</span><span class="is-l5">L5 \u6709\u6548</span><span class="is-empty">\u672a\u505c\u7559</span><span class="is-missing">\u8d44\u6599\u4e0d\u8db3</span>
      </div>
      <div class="nwi-overview-heatmap">
        <div class="nwi-overview-weekdays" aria-hidden="true">${['\u65e5', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d'].map((day) => `<span>${day}</span>`).join('')}</div>
        <div class="nwi-overview-heat-main">
          <div class="nwi-overview-heat-months">${monthMarkers.join('')}</div>
          <div class="nwi-overview-heat-grid" style="--overview-weeks:${weekCount}">${cells.join('')}</div>
        </div>
      </div>
    </section>`;
}

function buildCentralOverviewTimeline(placement) {
  const interval = (segmentIndex, startMonth, startDay, endMonth, endDay) => ({
    segmentIndex,
    startDate: new Date(Date.UTC(2024, startMonth - 1, startDay)),
    endDate: new Date(Date.UTC(2024, endMonth - 1, endDay)),
  });
  const intervals = placement === 'early'
    ? [
      interval(0, 1, 1, 1, 12),
      interval(1, 2, 22, 3, 17),
      interval(2, 3, 22, 4, 12),
      interval(3, 4, 17, 5, 12),
      interval(4, 5, 17, 6, 7),
    ]
    : [
      interval(5, 6, 17, 7, 17),
      interval(6, 7, 22, 8, 22),
      interval(0, 11, 28, 12, 31),
    ];
  return {
    intervals,
    startDate: placement === 'early' ? new Date(Date.UTC(2024, 0, 1)) : new Date(Date.UTC(2024, 5, 17)),
    endDate: placement === 'early' ? new Date(Date.UTC(2024, 5, 7)) : new Date(Date.UTC(2024, 11, 31)),
  };
}

// Keep the East reference calendars exactly in their approved 2-6 / 7-8-1
// arrangement. The West/South views use the full stay-period timeline above.
function renderEastOverviewCalendar(segmentIndexes, placement, title) {
  const activeDates = new Map();
  segmentIndexes.forEach((segmentIndex) => {
    (dailyNwiBySegment.get(segmentIndex) || []).forEach((row, dayIndex) => {
      activeDates.set(row.date, { row, dayIndex, segmentIndex });
    });
  });
  const orderedRows = segmentIndexes.flatMap((segmentIndex) => dailyNwiBySegment.get(segmentIndex) || []);
  if (!orderedRows.length) return '';
  const startDate = parseNwiDate(orderedRows[0].date);
  const endDate = parseNwiDate(orderedRows[orderedRows.length - 1].date);
  const gridStart = addUtcDays(startDate, -startDate.getUTCDay());
  const gridEnd = addUtcDays(endDate, 6 - endDate.getUTCDay());
  const gridDays = Math.round((gridEnd - gridStart) / 86400000) + 1;
  const weekCount = gridDays / 7;
  const cells = [];
  for (let index = 0; index < gridDays; index += 1) {
    const date = addUtcDays(gridStart, index);
    const dateKey = utcDateKey(date);
    const inRange = date >= startDate && date <= endDate;
    const active = activeDates.get(dateKey);
    if (!inRange) {
      cells.push('<span class="nwi-overview-heat-cell is-outside" aria-hidden="true"></span>');
    } else if (!active) {
      cells.push(`<span class="nwi-overview-heat-cell is-unmarked" title="${formatNwiDate(dateKey)} \u672a\u505c\u7559" aria-label="${formatNwiDate(dateKey)} \u672a\u505c\u7559"></span>`);
    } else {
      const { row, dayIndex, segmentIndex } = active;
      const effective = isEffectiveHoneyDay(row, segments[segmentIndex]);
      cells.push(`<button class="nwi-overview-heat-cell is-active${effective ? ' has-l5' : ''}" type="button"
        data-nwi-overview-day="${dayIndex}" data-nwi-overview-segment-index="${segmentIndex}" data-nwi-overview-date="${row.date}"
        style="--nwi-day-color:${nwiBubbleColor(row.nwi)}" aria-label="${formatNwiDate(row.date)}, NWI ${Math.round(row.nwi)}${row.goodHoneyDay ? ', L3' : ''}${effective ? ', L5' : ''}">
        ${row.goodHoneyDay ? '<i></i>' : ''}
      </button>`);
    }
  }
  const monthMarkers = [];
  let monthCursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  while (monthCursor <= endDate) {
    const visibleDate = monthCursor < startDate ? startDate : monthCursor;
    const dayOffset = Math.round((visibleDate - gridStart) / 86400000);
    const weekIndex = Math.floor(dayOffset / 7);
    monthMarkers.push(`<span style="left:${(weekIndex / weekCount * 100).toFixed(3)}%">${visibleDate.getUTCMonth() + 1}\u6708</span>`);
    monthCursor = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 1));
  }
  return `
    <section class="nwi-overview-calendar is-${placement}" data-nwi-overview-calendar="${placement}" aria-label="${title} NWI \u65e5\u5386">
      <header class="nwi-overview-header">
        <div><small>DAILY NWI CALENDAR</small><strong>${title}</strong></div>
        <b>${formatNwiDate(orderedRows[0].date)}\u2013${formatNwiDate(orderedRows[orderedRows.length - 1].date)}</b>
      </header>
      <div class="nwi-overview-legend" aria-label="\u65e5\u5386\u56fe\u4f8b">
        <span class="is-nwi">NWI</span><span class="is-l3">L3 \u5929\u6c14</span><span class="is-l5">L5 \u6709\u6548</span><span class="is-empty">\u672a\u505c\u7559</span>
      </div>
      <div class="nwi-overview-heatmap">
        <div class="nwi-overview-weekdays" aria-hidden="true">${['\u65e5', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d'].map((day) => `<span>${day}</span>`).join('')}</div>
        <div class="nwi-overview-heat-main">
          <div class="nwi-overview-heat-months">${monthMarkers.join('')}</div>
          <div class="nwi-overview-heat-grid" style="--overview-weeks:${weekCount}">${cells.join('')}</div>
        </div>
      </div>
    </section>`;
}

function buildOverviewTimeline(segmentIndexes) {
  if (!segmentIndexes.length) return null;
  const intervals = [];
  let previousStart = null;
  segmentIndexes.forEach((segmentIndex) => {
    const segment = segments[segmentIndex];
    if (!segment) return;
    let year = previousStart?.getUTCFullYear() || 2024;
    let startDate = new Date(Date.UTC(year, segment.start[0] - 1, segment.start[1]));
    while (previousStart && startDate <= previousStart) {
      year += 1;
      startDate = new Date(Date.UTC(year, segment.start[0] - 1, segment.start[1]));
    }
    let endDate = new Date(Date.UTC(year, segment.end[0] - 1, segment.end[1]));
    if (endDate < startDate) endDate = new Date(Date.UTC(year + 1, segment.end[0] - 1, segment.end[1]));
    intervals.push({ segmentIndex, startDate, endDate });
    previousStart = startDate;
  });
  if (!intervals.length) return null;
  return {
    intervals,
    startDate: intervals[0].startDate,
    endDate: intervals[intervals.length - 1].endDate,
  };
}

function bindNwiOverviewInteractions(host) {
  host.querySelectorAll('[data-nwi-overview-day]').forEach((cell) => {
    const dayIndex = Number(cell.dataset.nwiOverviewDay);
    const segmentIndex = Number(cell.dataset.nwiOverviewSegmentIndex);
    const date = cell.dataset.nwiOverviewDate;
    const activate = (event) => {
      setCalendarLinkedDay(date, true);
      showNwiDayTooltip(dayIndex, event, cell, segmentIndex);
    };
    const deactivate = () => {
      setCalendarLinkedDay(date, false);
      hideNwiDayTooltip();
    };
    cell.addEventListener('pointerenter', activate);
    cell.addEventListener('pointermove', activate);
    cell.addEventListener('pointerleave', deactivate);
    cell.addEventListener('focus', activate);
    cell.addEventListener('blur', deactivate);
  });
}


function focusCanvasOnNwi(segmentIndex) {
  const segment = segments[segmentIndex];
  const canvas = document.querySelector('[data-flowering-canvas]');
  const shell = document.querySelector('[data-canvas-shell]');
  if (!canvas || !shell) return;
  const focus = nwiFocusBounds(segmentIndex);
  const view = nwiFocusViews[segment.id];
  const exit = document.querySelector('[data-nwi-focus-exit]');
  const calendar = document.querySelector('[data-nwi-focus-calendar]');
  if (exit) {
    exit.style.left = '0px';
    exit.style.top = '0px';
  }
  if (calendar) {
    calendar.style.left = '0px';
    calendar.style.top = '0px';
  }
  zoomBeforeNwiFocus ??= zoom;
  setZoom(view?.zoom ?? 3.2);
  canvas.classList.add('is-nwi-focused');
  exit?.removeAttribute('hidden');
  requestAnimationFrame(() => {
    if (view) {
      shell.scrollLeft = Math.max(0, shell.scrollWidth - shell.clientWidth) * view.scrollX;
      shell.scrollTop = Math.max(0, shell.scrollHeight - shell.clientHeight) * view.scrollY;
    } else {
      shell.scrollLeft = Math.max(0, canvasXToPixel(focus.center.x, canvas) - shell.clientWidth / 2);
      shell.scrollTop = Math.max(0, canvasYToPixel(focus.center.y, canvas) - shell.clientHeight / 2);
    }
    positionNwiFocusOverlays();
  });
}

function positionNwiFocusOverlays() {
  positionNwiFocusExit();
  positionNwiFocusCalendar();
}

function positionNwiFocusExit() {
  const exit = document.querySelector('[data-nwi-focus-exit]');
  const shell = document.querySelector('[data-canvas-shell]');
  const canvas = document.querySelector('[data-flowering-canvas]');
  if (!exit || exit.hidden || !shell || !canvas) return;
  const inset = 18;
  exit.style.left = `${shell.scrollLeft + shell.clientWidth - canvas.offsetLeft - exit.offsetWidth - inset}px`;
  exit.style.top = `${shell.scrollTop + shell.clientHeight - canvas.offsetTop - exit.offsetHeight - inset}px`;
}

function renderNwiFocusCalendar(segmentIndex) {
  const calendar = document.querySelector('[data-nwi-focus-calendar]');
  const rows = dailyNwiBySegment.get(segmentIndex) || [];
  const segment = segments[segmentIndex];
  if (!calendar || !segment || !rows.length) return;
  const firstDate = parseNwiDate(rows[0].date);
  const lastDate = parseNwiDate(rows[rows.length - 1].date);
  const gridStart = addUtcDays(firstDate, -mondayIndex(firstDate));
  const gridEnd = addUtcDays(lastDate, 6 - mondayIndex(lastDate));
  const rowsByDate = new Map(rows.map((row, index) => [row.date, { row, index }]));
  const days = [];
  for (let date = gridStart; date <= gridEnd; date = addUtcDays(date, 1)) {
    const dateKey = utcDateKey(date);
    const match = rowsByDate.get(dateKey);
    if (!match) {
      days.push('<span class="nwi-calendar-day is-outside" aria-hidden="true"></span>');
      continue;
    }
    const { row, index } = match;
    const effective = isEffectiveHoneyDay(row, segment);
    days.push(`
      <button class="nwi-calendar-day${effective ? ' has-l5' : ''}" type="button" data-nwi-calendar-date="${row.date}" data-nwi-calendar-index="${index}"
        style="--nwi-day-color:${nwiBubbleColor(row.nwi)}" aria-label="${formatNwiDate(row.date)}, NWI ${Math.round(row.nwi)}${row.goodHoneyDay ? ', L3' : ''}${effective ? ', L5' : ''}">
        ${row.goodHoneyDay ? '<i class="nwi-calendar-band is-l3"></i>' : ''}
        <span>${date.getUTCDate()}</span>
      </button>`);
  }
  const goodCount = rows.filter((row) => row.goodHoneyDay).length;
  const effectiveCount = rows.filter((row) => isEffectiveHoneyDay(row, segment)).length;
  const averageNwi = rows.reduce((sum, row) => sum + row.nwi, 0) / rows.length;
  calendar.dataset.segmentId = String(segment.id);
  calendar.innerHTML = `
    <header class="nwi-calendar-header">
      <div><small>L2 STAY CALENDAR</small><strong>${segment.route}</strong></div>
      <b>${formatNwiDate(rows[0].date)}-${formatNwiDate(rows[rows.length - 1].date)}</b>
    </header>
    <div class="nwi-calendar-summary">
      <span>L3 ${goodCount}\u5929</span><span>L5 ${effectiveCount}\u5929</span><span>\u5e73\u5747 NWI ${Math.round(averageNwi)}</span>
    </div>
    <div class="nwi-calendar-legend" aria-label="\u65e5\u5386\u56fe\u4f8b">
      <span class="is-nwi">NWI</span><span class="is-l3">L3 \u5929\u6c14</span><span class="is-l5">L5 \u6709\u6548</span>
    </div>
    <div class="nwi-calendar-weekdays" aria-hidden="true">${['\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d', '\u65e5'].map((day) => `<span>${day}</span>`).join('')}</div>
    <div class="nwi-calendar-grid">${days.join('')}</div>
  `;
  calendar.hidden = false;
  bindNwiCalendarInteractions(calendar);
}

function bindNwiCalendarInteractions(calendar) {
  calendar.querySelectorAll('[data-nwi-calendar-index]').forEach((cell) => {
    const dayIndex = Number(cell.dataset.nwiCalendarIndex);
    const date = cell.dataset.nwiCalendarDate;
    const activate = (event) => {
      const bubble = document.querySelector(`[data-nwi-daily-day="${dayIndex}"]`);
      if (bubble && activeNwiDailyBubble !== bubble) activateNwiDailyBubble(bubble);
      setCalendarLinkedDay(date, true);
      showNwiDayTooltip(dayIndex, event, cell);
    };
    const deactivate = () => {
      const bubble = document.querySelector(`[data-nwi-daily-day="${dayIndex}"]`);
      if (bubble) deactivateNwiDailyBubble(bubble);
      setCalendarLinkedDay(date, false);
      hideNwiDayTooltip();
    };
    cell.addEventListener('pointerenter', activate);
    cell.addEventListener('pointermove', activate);
    cell.addEventListener('pointerleave', deactivate);
    cell.addEventListener('focus', activate);
    cell.addEventListener('blur', deactivate);
  });
}

function setCalendarLinkedDay(date, active) {
  document.querySelectorAll(`[data-l3-date="${date}"], [data-l5-date="${date}"], [data-good-honey-date="${date}"], [data-effective-honey-date="${date}"]`)
    .forEach((mark) => mark.classList.toggle('is-calendar-linked', active));
}

function positionNwiFocusCalendar() {
  const calendar = document.querySelector('[data-nwi-focus-calendar]');
  const shell = document.querySelector('[data-canvas-shell]');
  const canvas = document.querySelector('[data-flowering-canvas]');
  if (!calendar || calendar.hidden || !shell || !canvas) return;
  const inset = 20;
  const viewportLeft = shell.scrollLeft - canvas.offsetLeft;
  const viewportTop = shell.scrollTop - canvas.offsetTop;
  const placement = nwiCalendarPlacements[Number(calendar.dataset.segmentId)] || 'top-left';
  let left = viewportLeft + inset;
  let top = viewportTop + inset;
  if (typeof placement === 'object') {
    left = viewportLeft + shell.clientWidth * placement.x;
    top = viewportTop + shell.clientHeight * placement.y;
  } else {
    if (placement.includes('right')) left = viewportLeft + shell.clientWidth - calendar.offsetWidth - inset;
    if (placement.includes('center')) left = viewportLeft + (shell.clientWidth - calendar.offsetWidth) / 2;
    if (placement.includes('bottom')) top = viewportTop + shell.clientHeight - calendar.offsetHeight - inset;
  }
  left = Math.min(left, viewportLeft + shell.clientWidth - calendar.offsetWidth - inset);
  top = Math.min(top, viewportTop + shell.clientHeight - calendar.offsetHeight - inset);
  calendar.style.left = `${Math.max(8, left)}px`;
  calendar.style.top = `${Math.max(8, top)}px`;
}

function parseNwiDate(dateString) {
  const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function mondayIndex(date) {
  return (date.getUTCDay() + 6) % 7;
}

function utcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function canvasXToPixel(x, canvas) {
  const viewBox = isCombinedRouteMode ? combinedViewBox : canvasViewBox;
  return (x - viewBox.x) / viewBox.width * canvas.offsetWidth;
}

function canvasYToPixel(y, canvas) {
  const viewBox = isCombinedRouteMode ? combinedViewBox : canvasViewBox;
  return (y - viewBox.y) / viewBox.height * canvas.offsetHeight;
}

function nwiFocusBounds(segmentIndex) {
  const segment = segments[segmentIndex];
  const rows = dailyNwiBySegment.get(segmentIndex) || [];
  const points = [
    overlayPointForOrdinal(segmentStartOrdinal(segment), segmentIndex),
    overlayPointForOrdinal(segmentEndOrdinal(segment), segmentIndex),
    ...rows.map((row) => nwiDailyOrbitPoint(row.ordinal, segmentIndex)),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const padding = 30;
  const minX = Math.max(0, Math.min(...xs) - padding);
  const maxX = Math.min(1142, Math.max(...xs) + padding);
  const minY = Math.max(0, Math.min(...ys) - padding);
  const maxY = Math.min(1232, Math.max(...ys) + padding);
  return {
    minX,
    maxX,
    minY,
    maxY,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  };
}

function initNwiDayTooltip() {
  if (!document.querySelector('[data-nwi-day-tooltip]')) {
    const tooltip = document.createElement('aside');
    tooltip.className = 'nwi-day-tooltip';
    tooltip.dataset.nwiDayTooltip = '';
    tooltip.hidden = true;
    document.body.append(tooltip);
  }
  if (!document.querySelector('[data-nwi-stay-tooltip]')) {
    const stayTooltip = document.createElement('aside');
    stayTooltip.className = 'nwi-stay-tooltip';
    stayTooltip.dataset.nwiStayTooltip = '';
    stayTooltip.hidden = true;
    document.body.append(stayTooltip);
  }
  if (!document.querySelector('[data-good-honey-tooltip]')) {
    const goodTooltip = document.createElement('aside');
    goodTooltip.className = 'good-honey-tooltip';
    goodTooltip.dataset.goodHoneyTooltip = '';
    goodTooltip.hidden = true;
    document.body.append(goodTooltip);
  }
  if (!document.querySelector('[data-effective-honey-tooltip]')) {
    const effectiveTooltip = document.createElement('aside');
    effectiveTooltip.className = 'effective-honey-tooltip';
    effectiveTooltip.dataset.effectiveHoneyTooltip = '';
    effectiveTooltip.hidden = true;
    document.body.append(effectiveTooltip);
  }
}

function showNwiDayTooltip(dayIndex, event, anchor = null, segmentIndex = selectedNwiSegment) {
  const rows = dailyNwiBySegment.get(segmentIndex);
  const tooltip = document.querySelector('[data-nwi-day-tooltip]');
  if (!tooltip || !rows?.[dayIndex]) return;
  const row = rows[dayIndex];
  tooltip.hidden = false;
  tooltip.innerHTML = `
    <strong>${formatNwiDate(row.date)}</strong>
    <i style="background:${nwiBubbleColor(row.nwi)}"></i>
    <b>NWI ${Math.round(row.nwi)}</b>
    <span>${row.weather}</span>
    <span>${formatNwiNumber(row.tempMin, 0)}-${formatNwiNumber(row.tempMax, 0)}°C</span>
    <span>Rain ${formatNwiNumber(row.precipitation, 1)}mm</span>
    <span>Wind ${formatNwiNumber(row.wind, 0)}km/h</span>
    <span>st${formatNwiNumber(row.badStreak, 0)}</span>
  `;
  const target = anchor || document.querySelector(`[data-nwi-daily-day="${dayIndex}"]`);
  const targetRect = target?.getBoundingClientRect();
  if (!targetRect) return;
  const gap = 14;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  const rightLeft = targetRect.right + gap;
  const leftLeft = targetRect.left - tooltipWidth - gap;
  const left = rightLeft + tooltipWidth <= window.innerWidth - 8
    ? rightLeft
    : Math.max(8, leftLeft);
  const top = Math.max(8, Math.min(
    window.innerHeight - tooltipHeight - 8,
    targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
  ));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideNwiDayTooltip() {
  document.querySelector('[data-nwi-day-tooltip]')?.setAttribute('hidden', '');
}

function showNwiStayTooltip(segment, event) {
  const tooltip = document.querySelector('[data-nwi-stay-tooltip]');
  if (!tooltip) return;
  tooltip.hidden = false;
  tooltip.innerHTML = `
    <strong>${segment.route}</strong>
    <span>\u505c\u7559\u65f6\u95f4</span>
    <b>${segment.dates}</b>
    <small>\u65e5 NWI \u6c14\u6ce1\u5bf9\u5e94\u6b64\u65f6\u95f4\u6bb5</small>
  `;
  const gap = 14;
  const clientX = Number.isFinite(event?.clientX) ? event.clientX : window.innerWidth * 0.5;
  const clientY = Number.isFinite(event?.clientY) ? event.clientY : window.innerHeight * 0.5;
  tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - tooltip.offsetWidth - 8, clientX + gap))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(window.innerHeight - tooltip.offsetHeight - 8, clientY + gap))}px`;
}

function hideNwiStayTooltip() {
  document.querySelector('[data-nwi-stay-tooltip]')?.setAttribute('hidden', '');
}

function showGoodHoneyTooltip(date, event) {
  const tooltip = document.querySelector('[data-good-honey-tooltip]');
  if (!tooltip || !date) return;
  tooltip.hidden = false;
  tooltip.innerHTML = `<strong>\u5929\u6c14\u9002\u5b9c\u7a97\u53e3</strong><b>${formatNwiDate(date)}</b><span>good_honey_day = 1</span>`;
  const gap = 12;
  const clientX = Number.isFinite(event?.clientX) ? event.clientX : window.innerWidth * 0.5;
  const clientY = Number.isFinite(event?.clientY) ? event.clientY : window.innerHeight * 0.5;
  tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - tooltip.offsetWidth - 8, clientX + gap))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(window.innerHeight - tooltip.offsetHeight - 8, clientY + gap))}px`;
}

function hideGoodHoneyTooltip() {
  document.querySelector('[data-good-honey-tooltip]')?.setAttribute('hidden', '');
}

function showEffectiveHoneyTooltip(date, event) {
  const tooltip = document.querySelector('[data-effective-honey-tooltip]');
  if (!tooltip || !date) return;
  tooltip.hidden = false;
  tooltip.innerHTML = `<strong>L5 \u6709\u6548\u91c7\u871c\u7a97\u53e3</strong><b>${formatNwiDate(date)}</b><span>L2 \u2229 L3 \u2229 L4</span>`;
  const gap = 12;
  const clientX = Number.isFinite(event?.clientX) ? event.clientX : window.innerWidth * 0.5;
  const clientY = Number.isFinite(event?.clientY) ? event.clientY : window.innerHeight * 0.5;
  tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - tooltip.offsetWidth - 8, clientX + gap))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(window.innerHeight - tooltip.offsetHeight - 8, clientY + gap))}px`;
}

function hideEffectiveHoneyTooltip() {
  document.querySelector('[data-effective-honey-tooltip]')?.setAttribute('hidden', '');
}

function renderStayMark(segment, index) {
  const startOrdinal = segmentStartOrdinal(segment);
  const endOrdinal = segmentEndOrdinal(segment);
  const start = overlayPointForOrdinal(startOrdinal, index);
  const end = overlayPointForOrdinal(endOrdinal, index);
  const geometry = segmentGeometry(index);
  const labelPoint = offsetPoint(geometry.point, geometry.normal, -13);
  return `
    <path class="overlay-l2" d="${pathForOrdinalRange(startOrdinal, endOrdinal, index)}"><title>${segment.route}：L2 停留 ${segment.dates}</title></path>
    <circle class="overlay-stay-endpoint" cx="${start.x}" cy="${start.y}" r="3.5"></circle>
    <circle class="overlay-stay-endpoint" cx="${end.x}" cy="${end.y}" r="3.5"></circle>
    <text class="overlay-date-label" x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle">${segment.dates}</text>
  `;
}

function renderWeatherMark(segment, index) {
  return renderExactWeatherMarks(dailyNwiBySegment.get(index) || [], segment, index);
}

function renderEffectiveMark(segment, index) {
  return renderExactEffectiveMarks(dailyNwiBySegment.get(index) || [], segment, index);
}

function renderBufferMarks(segment, index) {
  const rows = dailyWeatherBySegment.get(index) || [];
  const beforeRows = rows.filter((row) => row.bufferBefore);
  const afterRows = rows.filter((row) => row.bufferAfter);
  if (!beforeRows.length && !afterRows.length) return '';
  const afterEnd = overlayPointForOrdinal(afterRows.at(-1)?.ordinal || segmentEndOrdinal(segment), index);
  const geometry = segmentGeometry(index);
  const labelPoint = offsetPoint(afterEnd, geometry.normal, -8);
  const renderDays = (dayRows, type, label) => dayRows.map((row) => `
    <path class="overlay-buffer ${type}" d="${pathForOrdinalRange(row.ordinal - 0.45, row.ordinal + 0.45, index)}">
      <title>${label} ${formatNwiDate(row.date)} · ${row.weather} · NWI ${Math.round(row.nwi)}</title>
    </path>`).join('');
  return `
    ${renderDays(beforeRows, 'is-before', '到达前缓冲')}
    ${renderDays(afterRows, 'is-after', '离开后缓冲')}
    <text class="overlay-buffer-text" x="${labelPoint.x}" y="${labelPoint.y}">前${beforeRows.length}/后${afterRows.length}d</text>
  `;
}

function renderRiskMark(segment, index) {
  const rows = dailyNwiBySegment.get(index) || [];
  if (!rows.length) return '';
  const risk = calculateSegmentRisk(rows);
  const runs = groupContiguousWeatherRows(rows.filter((row) => !row.goodHoneyDay));
  if (!runs.length) return '';
  const { point: center, normal } = segmentGeometry(index);
  const labelPoint = offsetPoint(center, normal, -17);
  const runPaths = runs.map((run) => {
    const first = run[0];
    const last = run[run.length - 1];
    return `<path class="overlay-risk-run" d="${pathForOrdinalRange(first.ordinal - 0.5, last.ordinal + 0.5, index, -11)}">
      <title>连续不适宜 ${run.length} 天 · ${formatNwiDate(first.date)}–${formatNwiDate(last.date)}</title>
    </path>`;
  }).join('');
  return `<g class="overlay-risk-runs">${runPaths}<text class="overlay-risk-text" x="${labelPoint.x}" y="${labelPoint.y}">R ${risk.index.toFixed(2)}</text>
    <title>风险指数 ${risk.index.toFixed(4)} · 不适宜 ${risk.badDays}/${risk.count}天 · 最长连续 ${risk.maxBadStreak}天 · 降雨 ${risk.rainDays}天 · 高温 ${risk.heatDays}天</title></g>`;
}

function renderPollinationMark(segment, index) {
  const metric = segmentMetricsByIndex.get(index);
  const count = metric?.pollinationCaseCount || 0;
  if (!count) return '';
  const { point: center, normal, tangent } = segmentGeometry(index);
  const point = offsetPoint(center, normal, 15);
  const dots = Array.from({ length: count }, (_, caseIndex) => {
    const casePoint = offsetPoint(point, tangent, (caseIndex - (count - 1) / 2) * 8);
    return `<rect class="overlay-pollination-case" x="${casePoint.x - 3}" y="${casePoint.y - 3}" width="6" height="6" rx="1"></rect>`;
  }).join('');
  const labelPoint = offsetPoint(point, normal, 10);
  return `<g class="overlay-pollination-cases">${dots}
    <text class="overlay-pollination-text" x="${labelPoint.x}" y="${labelPoint.y + 3}" text-anchor="middle">${count}例</text>
    <title>省域授粉市场案例 ${count} 条 · ${escapeSvgText(metric.pollinationCrops)} · ${escapeSvgText(metric.pollinationPrices)} · ${escapeSvgText(metric.pollinationNote)}</title>
  </g>`;
}

function renderClimateMark(segment, index) {
  const metric = segmentMetricsByIndex.get(index);
  if (!metric?.climateYear || !Number.isFinite(metric.climateAdvanceDays)) return '';
  const advanceDays = metric.climateAdvanceDays;
  const currentOrdinal = segmentStartOrdinal(segment);
  const shiftedOrdinal = currentOrdinal - advanceDays;
  const start = overlayPointForOrdinal(currentOrdinal, index, -22);
  const end = overlayPointForOrdinal(shiftedOrdinal, index, -22);
  const { normal } = segmentGeometry(index);
  const midpoint = { x: round((start.x + end.x) / 2), y: round((start.y + end.y) / 2) };
  const labelPoint = offsetPoint(midpoint, normal, -7);
  const direction = advanceDays >= 0 ? '提前' : '推迟';
  const estimated = metric.climateSource.includes('估算');
  return `<line class="overlay-climate-arrow${estimated ? ' is-estimated' : ''}" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}">
      <title>${metric.climateYear}年省域气候 · ${direction}${Math.abs(advanceDays)}天 · 春季均温 ${formatNwiNumber(metric.climateSpringTemp, 1)}°C · 高温 ${formatNwiNumber(metric.climateHeatDays, 0)}天 · 暴雨 ${formatNwiNumber(metric.climateRainstormDays, 0)}天 · 来源 ${escapeSvgText(metric.climateSource)}</title>
    </line>
    <text class="overlay-climate-text${estimated ? ' is-estimated' : ''}" x="${labelPoint.x}" y="${labelPoint.y}">${estimated ? '估算 ' : ''}${direction}${Math.abs(advanceDays)}d</text>`;
}

function calculateSegmentRisk(rows) {
  const count = rows.length || 1;
  const goodDays = rows.filter((row) => row.goodHoneyDay).length;
  const rainDays = rows.filter((row) => row.precipitation > 0).length;
  const heatDays = rows.filter((row) => row.tempMax > 35).length;
  const maxBadStreak = Math.max(0, ...rows.map((row) => row.badStreak || 0));
  const index = Math.max(0, Math.min(1, 1 - goodDays / count + maxBadStreak / 12 + rainDays / count / 5 + heatDays / count / 4));
  return { index, count, badDays: count - goodDays, rainDays, heatDays, maxBadStreak };
}

function groupContiguousWeatherRows(rows) {
  return rows.reduce((groups, row) => {
    const current = groups[groups.length - 1];
    if (current?.length && row.ordinal - current[current.length - 1].ordinal === 1) current.push(row);
    else groups.push([row]);
    return groups;
  }, []);
}

function escapeSvgText(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function segmentGeometry(index) {
  const segment = segments[index];
  const ordinal = segmentMidOrdinal(segment);
  const point = overlayPointForOrdinal(ordinal, index);
  const before = overlayPointForOrdinal(ordinal - 0.25, index);
  const after = overlayPointForOrdinal(ordinal + 0.25, index);
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  const tangent = { x: dx / length, y: dy / length };
  return { point, tangent, normal: { x: -tangent.y, y: tangent.x } };
}

function offsetPoint(point, vector, distance) {
  return { x: round(point.x + vector.x * distance), y: round(point.y + vector.y * distance) };
}

function segmentStartOrdinal(segment) {
  return dateToOrdinal(segment.start[0], segment.start[1]);
}

function segmentEndOrdinal(segment) {
  return dateToOrdinal(segment.end[0], segment.end[1]);
}

function segmentMidOrdinal(segment) {
  const start = segmentStartOrdinal(segment);
  let end = segmentEndOrdinal(segment);
  if (end < start) end += 365;
  const midpoint = (start + end) / 2;
  return midpoint > 365 ? midpoint - 365 : midpoint;
}

function dateToOrdinal(month, day) {
  return monthLengths.slice(0, month - 1).reduce((total, length) => total + length, 0) + day;
}

function monthDayKey(month, day) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateStringToOrdinal(dateString) {
  const [, month, day] = String(dateString).split('-').map(Number);
  return dateToOrdinal(month, day);
}

function dailyRowMatchesSegment(row, segment, segmentIndex) {
  if (currentRouteId === 'south-route') return southDailyRowMatchesSegment(row, segment, segmentIndex);
  const destination = String(segment.route).split('→').pop()?.trim();
  if (destination && String(row.location || '').trim() !== destination) return false;
  const ordinal = dateStringToOrdinal(row.date);
  const start = segmentStartOrdinal(segment);
  const end = segmentEndOrdinal(segment);
  return end < start ? ordinal >= start || ordinal <= end : ordinal >= start && ordinal <= end;
}

function chronologicalOrdinalForSegment(ordinal, segment) {
  const start = segmentStartOrdinal(segment);
  return ordinal < start ? ordinal + 365 : ordinal;
}

function centralDailyStayFlags(ordinal, segment) {
  const start = segmentStartOrdinal(segment);
  const end = segmentEndOrdinal(segment);
  const current = chronologicalOrdinalForSegment(ordinal, segment);
  const normalizedEnd = end < start ? end + 365 : end;
  return {
    inStayPeriod: current >= start && current <= normalizedEnd,
    bufferBefore: current >= start - 10 && current < start,
    bufferAfter: current > normalizedEnd && current <= normalizedEnd + 10,
  };
}

function southDailyRowMatchesSegment(row, segment, segmentIndex) {
  const destination = String(segment.route).split('→').pop()?.trim();
  if (destination && String(row.location || '').trim() !== destination) return false;
  const ordinal = dateStringToOrdinal(row.date);
  const southWindow = southWeatherWindowForSegmentIndex(segmentIndex);
  const start = Math.max(southWindow.start, dateToOrdinal(segment.start[0], segment.start[1]));
  const end = Math.min(southWindow.end, dateToOrdinal(segment.end[0], segment.end[1]));
  return end < start ? ordinal >= start || ordinal <= end : ordinal >= start && ordinal <= end;
}

function southWeatherWindowForSegmentIndex(segmentIndex) {
  return segmentIndex <= 3 ? southWeatherWindows.front : southWeatherWindows.back;
}

function southWeatherWindowForOrdinal(ordinal) {
  return Object.values(southWeatherWindows).find((window) => ordinal >= window.start && ordinal <= window.end) || null;
}

function constrainSouthWeatherInterval(interval, rowOrdinal, segmentIndex) {
  if (currentRouteId !== 'south-route') return interval;
  const southWindow = Number.isFinite(segmentIndex)
    ? southWeatherWindowForSegmentIndex(segmentIndex)
    : southWeatherWindowForOrdinal(rowOrdinal);
  if (!southWindow) return null;
  const dayStart = Math.max(interval.dayStart, southWindow.start);
  const dayEnd = Math.min(interval.dayEnd, southWindow.end);
  return dayEnd >= dayStart ? { dayStart, dayEnd } : null;
}

function formatNwiDate(dateString) {
  const [, month, day] = String(dateString).split('-').map(Number);
  return `${month}/${day}`;
}

function formatNwiNumber(value, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function overlayPointForOrdinal(rawOrdinal, segmentIndex, radiusOffset = 0) {
  if (currentRouteId === 'east-coastal') return eastPointForOrdinal(rawOrdinal, segmentIndex, radiusOffset);
  const ordinal = Math.max(1, Math.min(365.999, rawOrdinal));
  const laneIndex = laneIndexForSegment(segmentIndex);
  const points = laneDayPoints[laneIndex] || [];
  if (!points.length) return { x: 0, y: 0 };
  const position = Math.max(0, Math.min(points.length - 1, ordinal - 1));
  const lower = Math.floor(position);
  const upper = Math.min(points.length - 1, lower + 1);
  const ratio = position - lower;
  const point = {
    x: points[lower].x + (points[upper].x - points[lower].x) * ratio,
    y: points[lower].y + (points[upper].y - points[lower].y) * ratio,
  };
  if (!radiusOffset) return { x: round(point.x), y: round(point.y) };
  const normal = curveNormalAtOrdinal(ordinal, segmentIndex);
  return { x: round(point.x + normal.x * radiusOffset), y: round(point.y + normal.y * radiusOffset) };
}

function curveNormalAtOrdinal(ordinal, segmentIndex, outward = false) {
  if (currentRouteId === 'east-coastal') return eastNormalForOrdinal(ordinal);
  const laneIndex = laneIndexForSegment(segmentIndex);
  const points = laneDayPoints[laneIndex] || [];
  if (!points.length) return { x: 0, y: -1 };
  const currentIndex = Math.max(0, Math.min(points.length - 1, Math.round(ordinal - 1)));
  const before = points[Math.max(0, currentIndex - 1)];
  const after = points[Math.min(points.length - 1, currentIndex + 1)];
  const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
  let normal = { x: -(after.y - before.y) / length, y: (after.x - before.x) / length };
  if (outward) {
    const point = points[currentIndex];
    if (normal.x * (point.x - routeGeometryCenter.x) + normal.y * (point.y - routeGeometryCenter.y) < 0) {
      normal = { x: -normal.x, y: -normal.y };
    }
  }
  return normal;
}

function eastPointForOrdinal(rawOrdinal, segmentIndex, radiusOffset = 0) {
  const ordinal = Math.max(1, Math.min(365.999, rawOrdinal));
  const half = ordinal < eastArcModel.upper.startOrdinal ? eastArcModel.lower : eastArcModel.upper;
  const radii = half.radii;
  // At the June-to-July handoff, selected routes continue on the matching
  // outer upper semicircle. This keeps the two L0 half-arcs continuous.
  const upperLaneShift = half === eastArcModel.upper ? (segments[segmentIndex]?.upperLaneShift || 0) : 0;
  const radiusIndex = half === eastArcModel.upper
    ? radii.length - 1 - segmentIndex + upperLaneShift
    : segmentIndex;
  const radius = radii[Math.max(0, Math.min(radii.length - 1, radiusIndex))] + radiusOffset;
  const progress = (ordinal - half.startOrdinal) / (half.endOrdinal - half.startOrdinal);
  const angle = degreesToRadians(half.startAngle + (half.endAngle - half.startAngle) * progress);
  const handoffCorrection = eastHandoffCorrection(half, segmentIndex, radiusOffset);
  return {
    x: round(half.cx + Math.cos(angle) * radius + handoffCorrection.x),
    y: round(half.cy + Math.sin(angle) * radius + handoffCorrection.y),
  };
}

function eastHandoffCorrection(half, segmentIndex, radiusOffset = 0) {
  const segment = segments[segmentIndex];
  if (!isStandaloneEastSegmentSix(segment) || half !== eastArcModel.upper) return { x: 0, y: 0 };
  const ordinal = eastArcModel.upper.startOrdinal;
  const lowerRadius = eastArcModel.lower.radii[segmentIndex] + radiusOffset;
  const upperRadiusIndex = eastArcModel.upper.radii.length - 1 - segmentIndex + (segment.upperLaneShift || 0);
  const upperRadius = eastArcModel.upper.radii[Math.max(0, Math.min(eastArcModel.upper.radii.length - 1, upperRadiusIndex))] + radiusOffset;
  const lowerPoint = eastArcPoint(eastArcModel.lower, lowerRadius, ordinal);
  const upperPoint = eastArcPoint(eastArcModel.upper, upperRadius, ordinal);
  return {
    x: lowerPoint.x - upperPoint.x,
    y: lowerPoint.y - upperPoint.y,
  };
}

function eastArcPoint(half, radius, ordinal) {
  const progress = (ordinal - half.startOrdinal) / (half.endOrdinal - half.startOrdinal);
  const angle = degreesToRadians(half.startAngle + (half.endAngle - half.startAngle) * progress);
  return {
    x: half.cx + Math.cos(angle) * radius,
    y: half.cy + Math.sin(angle) * radius,
  };
}

function eastNormalForOrdinal(rawOrdinal) {
  const ordinal = Math.max(1, Math.min(365.999, rawOrdinal));
  const half = ordinal < eastArcModel.upper.startOrdinal ? eastArcModel.lower : eastArcModel.upper;
  const progress = (ordinal - half.startOrdinal) / (half.endOrdinal - half.startOrdinal);
  const angle = degreesToRadians(half.startAngle + (half.endAngle - half.startAngle) * progress);
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function nwiBubbleOrbitPoint(rawOrdinal, segmentIndex) {
  if (currentRouteId === 'west-northwest') return westNwiBubbleOrbitPoint(rawOrdinal, segmentIndex);
  if (currentRouteId === 'central-route') return centralNwiBubbleOrbitPoint(rawOrdinal, segmentIndex);
  if (currentRouteId === 'south-route') return southNwiBubbleOrbitPoint(rawOrdinal, segmentIndex);
  return nwiOrbitPoint(rawOrdinal, 68, segmentIndex);
}

function westNwiBubbleOrbitPoint(rawOrdinal, segmentIndex) {
  const bottomBubbleSegments = new Set([0, 4, 6]);
  const outerLaneIndex = bottomBubbleSegments.has(segmentIndex)
    ? Math.max(0, laneDayPoints.length - 1)
    : 0;
  return nwiOrbitPoint(rawOrdinal, 68, outerLaneIndex);
}

function centralNwiBubbleOrbitPoint(rawOrdinal, segmentIndex) {
  const layout = centralNwiLayout(segmentIndex);
  return centralNwiOffsetPoint(rawOrdinal, layout.laneIndex, layout.bubbleOffset, layout.side);
}

function centralNwiOverviewDailyOrbitPoint(rawOrdinal, segmentIndex) {
  const layout = centralNwiLayout(segmentIndex, rawOrdinal, true);
  return centralNwiOffsetPoint(rawOrdinal, layout.laneIndex, layout.dailyOffset, layout.side);
}

function centralNwiLayout(segmentIndex, rawOrdinal = null, isDaily = false) {
  if (!laneDayPoints.length) {
    return { laneIndex: laneIndexForSegment(segmentIndex), bubbleOffset: 68, dailyOffset: 105, side: 'above' };
  }
  // Central-route NWI follows the same external-arc rule used for the West
  // route: bubbles on the same side are projected onto one shared outer lane
  // with a constant normal offset, so their centers form a parallel arc.
  //
  // Required grouping:
  // - Jiangxi-Hunan, Hubei, both Henan windows, and Hebei-Beijing sit outside
  //   the Inner Mongolia/top L0 lane.
  // - The remaining windows sit on the opposite side of the base geometry.
  const innerMongoliaOuterSegments = new Set([1, 2, 3, 4, 5]);
  const useInnerMongoliaSide = innerMongoliaOuterSegments.has(segmentIndex);
  const outerLaneIndex = useInnerMongoliaSide
    ? laneIndexForSegment(6)
    : laneIndexForSegment(0);
  const isGuangxiJanuaryTail = isDaily
    && segmentIndex === 0
    && Number.isFinite(rawOrdinal)
    && rawOrdinal <= segmentEndOrdinal(segments[segmentIndex]);
  return {
    laneIndex: primarySegmentIndexForLane(outerLaneIndex),
    bubbleOffset: 68,
    dailyOffset: isGuangxiJanuaryTail ? 200 : 105,
    side: isGuangxiJanuaryTail ? 'below' : 'above',
  };
}

function centralNwiOffsetPoint(rawOrdinal, laneIndex, offset, side) {
  const base = overlayPointForOrdinal(rawOrdinal, laneIndex);
  const positive = nwiOrbitPoint(rawOrdinal, offset, laneIndex);
  const negative = nwiOrbitPoint(rawOrdinal, -offset, laneIndex);
  if (side === 'below') return positive.y > base.y ? positive : negative;
  return positive.y < base.y ? positive : negative;
}

function nwiOverviewDailyOrbitPoint(rawOrdinal, segmentIndex) {
  if (currentRouteId === 'central-route') return centralNwiOverviewDailyOrbitPoint(rawOrdinal, segmentIndex);
  if (currentRouteId === 'south-route') return southNwiOverviewDailyOrbitPoint(rawOrdinal, segmentIndex);
  if (currentRouteId !== 'west-northwest') return nwiOrbitPoint(rawOrdinal, 105, segmentIndex);
  const bottomBubbleSegments = new Set([0, 4, 6]);
  const outerLaneIndex = bottomBubbleSegments.has(segmentIndex)
    ? Math.max(0, laneDayPoints.length - 1)
    : 0;
  const isYunnanJanuaryTail = segmentIndex === 0
    && segmentStartOrdinal(segments[segmentIndex]) > segmentEndOrdinal(segments[segmentIndex])
    && rawOrdinal <= segmentEndOrdinal(segments[segmentIndex]);
  return nwiOrbitPoint(rawOrdinal, isYunnanJanuaryTail ? 215 : 105, outerLaneIndex);
}

function southNwiBubbleOrbitPoint(rawOrdinal, segmentIndex) {
  const layout = southNwiLayout(segmentIndex);
  return southNwiOffsetPoint(rawOrdinal, layout.laneIndex, layout.bubbleOffset, layout.side);
}

function southNwiOverviewDailyOrbitPoint(rawOrdinal, segmentIndex) {
  const layout = southNwiLayout(segmentIndex);
  return southNwiOffsetPoint(rawOrdinal, layout.laneIndex, layout.dailyOffset, layout.side);
}

function southNwiLayout(segmentIndex) {
  if (!laneDayPoints.length) {
    return { laneIndex: segmentIndex, bubbleOffset: 68, dailyOffset: 105, side: 'below' };
  }
  if (segmentIndex === 5) {
    return { laneIndex: 5, bubbleOffset: 86, dailyOffset: 124, side: 'above' };
  }
  return {
    laneIndex: 0,
    bubbleOffset: 132,
    dailyOffset: 176,
    side: 'below',
  };
}

function southNwiOffsetPoint(rawOrdinal, laneIndex, offset, side) {
  const base = overlayPointForOrdinal(rawOrdinal, laneIndex);
  const positive = nwiOrbitPoint(rawOrdinal, offset, laneIndex);
  const negative = nwiOrbitPoint(rawOrdinal, -offset, laneIndex);
  if (side === 'above') return positive.y < base.y ? positive : negative;
  return positive.y > base.y ? positive : negative;
}

function nwiDailyOrbitPoint(rawOrdinal, segmentIndex) {
  if (selectedNwiSegment === segmentIndex) return nwiFocusedDailyOrbitPoint(rawOrdinal, segmentIndex);
  return nwiOverviewDailyOrbitPoint(rawOrdinal, segmentIndex);
}

function nwiFocusedDailyOrbitPoint(rawOrdinal, segmentIndex) {
  if (currentRouteId === 'south-route') {
    const layout = southNwiLayout(segmentIndex);
    return southNwiOffsetPoint(rawOrdinal, layout.laneIndex, layout.dailyOffset + 34, layout.side);
  }
  return nwiOrbitPoint(rawOrdinal, 145, segmentIndex);
}

function nwiDailyPathForOrdinalRange(rawStart, rawEnd, outerOffset, segmentIndex) {
  const start = Math.max(1, rawStart);
  const end = Math.min(365.999, rawEnd);
  if (end < start) {
    return `${nwiDailyPathForOrdinalRange(start, 365.999, outerOffset, segmentIndex)} ${nwiDailyPathForOrdinalRange(1, end, outerOffset, segmentIndex)}`;
  }
  const points = [];
  for (let ordinal = start; ordinal < end; ordinal += 0.25) {
    points.push(nwiOrbitPoint(ordinal, outerOffset, segmentIndex));
  }
  points.push(nwiOrbitPoint(end, outerOffset, segmentIndex));
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

function nwiStayAreaPath(segment, segmentIndex, outerOffset) {
  return nwiAreaPathForOrdinalRange(segmentStartOrdinal(segment), segmentEndOrdinal(segment), segmentIndex, outerOffset);
}

function nwiAreaPathForOrdinalRange(start, end, segmentIndex, outerOffset) {
  if (end < start) {
    return `${nwiAreaPathForOrdinalRange(start, 365.999, segmentIndex, outerOffset)} ${nwiAreaPathForOrdinalRange(1, end, segmentIndex, outerOffset)}`;
  }
  const basePoints = [];
  const outerPoints = [];
  for (let ordinal = start; ordinal < end; ordinal += 0.25) {
    basePoints.push(overlayPointForOrdinal(ordinal, segmentIndex));
    outerPoints.push(nwiOrbitPoint(ordinal, outerOffset, segmentIndex));
  }
  basePoints.push(overlayPointForOrdinal(end, segmentIndex));
  outerPoints.push(nwiOrbitPoint(end, outerOffset, segmentIndex));
  const closedPoints = [...basePoints, ...outerPoints.reverse()];
  return `${closedPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')} Z`;
}

function renderGoodHoneyAreas(rows, segment, segmentIndex, outerOffset) {
  return rows
    .filter((row) => row.goodHoneyDay)
    .map((row) => {
      const interval = constrainSouthWeatherInterval(goodHoneyDayInterval(row, segment), row.ordinal, segmentIndex);
      if (!interval) return '';
      const path = nwiAreaPathForOrdinalRange(interval.dayStart, interval.dayEnd, segmentIndex, outerOffset);
      return `<path class="overlay-good-honey-area" data-good-honey-area data-good-honey-date="${row.date}" tabindex="0" role="button" aria-label="\u9002\u5b9c\u91c7\u871c\u65e5 ${formatNwiDate(row.date)}" d="${path}"></path>`;
    }).join('');
}

function renderEffectiveHoneyAreas(rows, segment, segmentIndex, outerOffset) {
  return rows
    .filter((row) => isEffectiveHoneyDay(row, segment))
    .map((row) => {
      const interval = constrainSouthWeatherInterval(goodHoneyDayInterval(row, segment), row.ordinal, segmentIndex);
      if (!interval) return '';
      const path = nwiAreaPathForOrdinalRange(interval.dayStart, interval.dayEnd, segmentIndex, outerOffset);
      return `<path class="overlay-effective-honey-area" data-effective-honey-area data-effective-honey-date="${row.date}" tabindex="0" role="button" aria-label="L5 \u6709\u6548\u91c7\u871c\u65e5 ${formatNwiDate(row.date)}" d="${path}"></path>`;
    }).join('');
}

function renderExactWeatherMarks(rows, segment, segmentIndex) {
  return rows
    .filter((row) => row.goodHoneyDay)
    .map((row) => {
      const interval = constrainSouthWeatherInterval(goodHoneyDayInterval(row, segment), row.ordinal, segmentIndex);
      if (!interval) return '';
      return `<path class="overlay-l3 overlay-l3-daily" data-l3-date="${row.date}" d="${pathForOrdinalRange(interval.dayStart, interval.dayEnd, segmentIndex, 4)}"><title>L3 \u5929\u6c14\u9002\u5b9c\u65e5 ${formatNwiDate(row.date)}</title></path>`;
    }).join('');
}

function renderExactEffectiveMarks(rows, segment, segmentIndex) {
  return rows
    .filter((row) => isEffectiveHoneyDay(row, segment))
    .map((row) => {
      const interval = constrainSouthWeatherInterval(goodHoneyDayInterval(row, segment), row.ordinal, segmentIndex);
      if (!interval) return '';
      return `<path class="overlay-l5 overlay-l5-daily" data-l5-date="${row.date}" d="${pathForOrdinalRange(interval.dayStart, interval.dayEnd, segmentIndex, -4)}"><title>L5 \u6709\u6548\u91c7\u871c\u65e5 ${formatNwiDate(row.date)}</title></path>`;
    }).join('');
}

function isStandaloneEastSegmentSix(segment) {
  return currentRouteId === 'east-coastal' && !isCombinedRouteMode && segment?.id === 6;
}

function isEffectiveHoneyDay(row, segment) {
  if (!row.goodHoneyDay) return false;
  return (segment.flowerWindows || []).some(([startMonth, startDay, endMonth, endDay]) => {
    const start = dateToOrdinal(startMonth, startDay);
    const end = dateToOrdinal(endMonth, endDay);
    return row.ordinal >= start && row.ordinal <= end;
  });
}

function goodHoneyDayInterval(row, segment) {
  const start = segmentStartOrdinal(segment);
  const end = segmentEndOrdinal(segment);
  if (end < start) {
    if (row.ordinal >= start) {
      return { dayStart: Math.max(start, row.ordinal - 0.5), dayEnd: Math.min(365.999, row.ordinal + 0.5) };
    }
    return { dayStart: Math.max(1, row.ordinal - 0.5), dayEnd: Math.min(end, row.ordinal + 0.5) };
  }
  return {
    dayStart: Math.max(start, row.ordinal - 0.5),
    dayEnd: Math.min(end, row.ordinal + 0.5),
  };
}

function nwiOrbitPoint(rawOrdinal, outerOffset, segmentIndex) {
  if (currentRouteId === 'east-coastal') {
    const ordinal = Math.max(1, Math.min(365.999, rawOrdinal));
    const half = ordinal < eastArcModel.upper.startOrdinal ? eastArcModel.lower : eastArcModel.upper;
    const progress = (ordinal - half.startOrdinal) / (half.endOrdinal - half.startOrdinal);
    const angle = degreesToRadians(half.startAngle + (half.endAngle - half.startAngle) * progress);
    const radius = half.radii[half.radii.length - 1] + outerOffset;
    return { x: round(half.cx + Math.cos(angle) * radius), y: round(half.cy + Math.sin(angle) * radius) };
  }
  const point = overlayPointForOrdinal(rawOrdinal, segmentIndex);
  const normal = curveNormalAtOrdinal(rawOrdinal, segmentIndex, true);
  return { x: round(point.x + normal.x * outerOffset), y: round(point.y + normal.y * outerOffset) };
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function nwiBubbleColor(nwi) {
  const progress = Math.max(0, Math.min(1, (nwi - 40) / 50));
  const low = [187, 104, 78];
  const high = [73, 151, 108];
  const channels = low.map((channel, index) => Math.round(channel + (high[index] - channel) * progress));
  return `rgb(${channels.join(', ')})`;
}

function pathForOrdinalRange(rawStart, rawEnd, segmentIndex, radiusOffset = 0) {
  const start = Math.max(1, rawStart);
  const end = Math.min(365.999, rawEnd);
  if (end < start) {
    return `${pathForOrdinalRange(start, 365.999, segmentIndex, radiusOffset)} ${pathForOrdinalRange(1, end, segmentIndex, radiusOffset)}`;
  }
  const points = [];
  const step = segments[segmentIndex].id === 6 ? 0.25 : 0.75;
  for (let ordinal = start; ordinal < end; ordinal += step) {
    points.push(overlayPointForOrdinal(ordinal, segmentIndex, radiusOffset));
  }
  points.push(overlayPointForOrdinal(end, segmentIndex, radiusOffset));
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

function centeredSegmentInterval(segment, proportion) {
  const start = segmentStartOrdinal(segment);
  let end = segmentEndOrdinal(segment);
  if (end < start) end += 365;
  const duration = end - start;
  const visibleDuration = Math.max(1, duration * proportion);
  const margin = (duration - visibleDuration) / 2;
  const normalize = (ordinal) => ordinal > 365 ? ordinal - 365 : ordinal;
  return { start: normalize(start + margin), end: normalize(end - margin) };
}

function round(value) {
  return Number(value.toFixed(1));
}

function renderSegmentIndex() {
  const index = document.querySelector('[data-segment-index]');
  if (!index) return;
  index.innerHTML = segments.map((segment, segmentIndex) => {
    const point = segmentGeometry(segmentIndex).point;
    return `
      <button class="segment-marker${segment.reference ? ' is-reference' : ''}" type="button"
        style="left:${((point.x / 1142) * 100).toFixed(3)}%;top:${((point.y / 1232) * 100).toFixed(3)}%"
        data-segment="${segment.id}" aria-label="第 ${segment.id} 段：${segment.route}，${segment.dates}">
        <b>${segment.id}</b><span>${segment.route}</span>
      </button>
    `;
  }).join('');

  const tooltip = document.querySelector('[data-rhythm-tooltip]');
  index.querySelectorAll('[data-segment]').forEach((marker) => {
    const segment = segments.find((item) => item.id === Number(marker.dataset.segment));
    marker.addEventListener('pointerenter', (event) => showTooltip(event, segment, tooltip));
    marker.addEventListener('pointermove', (event) => positionTooltip(event, tooltip));
    marker.addEventListener('pointerleave', () => { tooltip.hidden = true; });
    marker.addEventListener('focus', () => showTooltip(marker.getBoundingClientRect(), segment, tooltip));
    marker.addEventListener('blur', () => { tooltip.hidden = true; });
  });
}

function initLaneInteractions() {
  const tooltip = document.querySelector('[data-rhythm-tooltip]');
  document.querySelectorAll('[data-lane-index]').forEach((lane) => {
    const laneIndex = Number(lane.dataset.laneIndex);
    const laneSegments = segmentsForLane(laneIndex);
    lane.addEventListener('pointerenter', (event) => {
      hoveredLaneIndex = laneIndex;
      applyLaneFocus();
      showLaneTooltip(event, laneSegments, tooltip);
    });
    lane.addEventListener('pointermove', (event) => positionTooltip(event, tooltip));
    lane.addEventListener('pointerleave', () => {
      hoveredLaneIndex = null;
      applyLaneFocus();
      if (tooltip) tooltip.hidden = true;
    });
    lane.addEventListener('focus', () => {
      hoveredLaneIndex = laneIndex;
      applyLaneFocus();
      showLaneTooltip(lane.getBoundingClientRect(), laneSegments, tooltip);
    });
    lane.addEventListener('blur', () => {
      hoveredLaneIndex = null;
      applyLaneFocus();
      if (tooltip) tooltip.hidden = true;
    });
    lane.addEventListener('click', () => selectLane(laneIndex));
    lane.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectLane(laneIndex);
    });
  });

  if (!laneStateSubscribed) {
    laneStateSubscribed = true;
    subscribe((state) => {
      const summary = state.selectedNodeSummary;
      selectedLaneIndex = summary?.route_name === currentRouteConfig.routeName
        ? Number(summary.segment_order) - 1
        : null;
      if (!Number.isInteger(selectedLaneIndex) || !segments[selectedLaneIndex]) selectedLaneIndex = null;
      applyLaneFocus();
    });
  }
  applyLaneFocus();
}

function initLaneFocusBack() {
  document.querySelector('[data-lane-focus-back]')?.addEventListener('click', () => {
    hoveredLaneIndex = null;
    selectedLaneIndex = null;
    setSelectedNode(null, null);
    applyLaneFocus();
  });
}

function selectLane(laneIndex) {
  const segmentIndex = primarySegmentIndexForLane(laneIndex);
  const segment = segments[segmentIndex];
  if (!segment) return;
  const [fromLocation, toLocation] = segment.route.split(/\s*→\s*/);
  document.querySelector('[data-risk-tab="route"]')?.click();
  setSelectedNode(`${currentRouteConfig.routeName}-2020s-${segment.id}`, {
    id: `${currentRouteConfig.routeName}-2020s-${segment.id}`,
    route_name: currentRouteConfig.routeName,
    segment_order: segment.id,
    location: toLocation,
    from_location: fromLocation,
    to_location: toLocation,
  });
}

function applyLaneFocus() {
  if (isCombinedRouteMode) {
    const canvas = document.querySelector('[data-flowering-canvas]');
    canvas?.classList.remove('has-lane-focus');
    document.querySelectorAll('[data-lane-index], [data-lane-active-flowering], [data-segment-content], [data-nwi-mark]')
      .forEach((element) => element.classList.remove('is-lane-active', 'is-lane-selected', 'is-dimmed', 'is-detail-selected', 'is-nwi-dimmed'));
    document.querySelector('[data-lane-focus-back]')?.setAttribute('hidden', '');
    return;
  }
  const activeSegmentIndexes = new Set([selectedLaneIndex].filter(Number.isInteger));
  if (Number.isInteger(selectedLaneIndex)) {
    segmentIndexesForLane(laneIndexForSegment(selectedLaneIndex)).forEach((segmentIndex) => activeSegmentIndexes.add(segmentIndex));
  }
  if (Number.isInteger(hoveredLaneIndex)) {
    segmentIndexesForLane(hoveredLaneIndex).forEach((segmentIndex) => activeSegmentIndexes.add(segmentIndex));
  }
  const activeLaneIndexes = new Set([...activeSegmentIndexes].map((segmentIndex) => laneIndexForSegment(segmentIndex)));
  const canvas = document.querySelector('[data-flowering-canvas]');
  canvas?.classList.toggle('has-lane-focus', activeSegmentIndexes.size > 0);
  document.querySelectorAll('[data-lane-index]').forEach((lane) => {
    const laneIndex = Number(lane.dataset.laneIndex);
    lane.classList.toggle('is-lane-active', activeLaneIndexes.has(laneIndex));
    lane.classList.toggle('is-lane-selected', activeLaneIndexes.has(laneIndex) && segmentIndexesForLane(laneIndex).includes(selectedLaneIndex));
  });
  document.querySelectorAll('[data-lane-active-flowering]').forEach((layer) => {
    layer.classList.toggle('is-lane-active', activeLaneIndexes.has(Number(layer.dataset.laneActiveFlowering)));
  });
  document.querySelectorAll('[data-segment-content]').forEach((content) => {
    const segmentIndex = Number(content.dataset.segmentContent);
    content.classList.toggle('is-lane-muted', activeSegmentIndexes.size > 0 && !activeSegmentIndexes.has(segmentIndex));
  });
  document.querySelectorAll('.segment-marker[data-segment]').forEach((marker) => {
    const segmentIndex = Number(marker.dataset.segment) - 1;
    marker.classList.toggle('is-lane-muted', activeSegmentIndexes.size > 0 && !activeSegmentIndexes.has(segmentIndex));
    marker.classList.toggle('is-lane-active', activeSegmentIndexes.has(segmentIndex));
  });
  const back = document.querySelector('[data-lane-focus-back]');
  if (back) back.hidden = selectedLaneIndex == null;
}

function showLaneTooltip(eventOrRect, laneSegments, tooltip) {
  if (!tooltip) return;
  const items = Array.isArray(laneSegments) ? laneSegments : [laneSegments].filter(Boolean);
  if (!items.length) {
    tooltip.hidden = true;
    return;
  }
  tooltip.innerHTML = items.length === 1
    ? `<strong>${items[0].route}</strong><span>${items[0].dates}</span>`
    : items.map((segment) => `<strong>${segment.route}</strong><span>${segment.dates}</span>`).join('<hr>');
  tooltip.hidden = false;
  if ('clientX' in eventOrRect) positionTooltip(eventOrRect, tooltip);
  else {
    tooltip.style.left = `${Math.min(window.innerWidth - 246, eventOrRect.right + 8)}px`;
    tooltip.style.top = `${Math.min(window.innerHeight - 80, eventOrRect.top)}px`;
  }
}

function showTooltip(eventOrRect, segment, tooltip) {
  if (!tooltip || !segment) return;
  tooltip.innerHTML = `<strong>${segment.id}. ${segment.route} · ${segment.dates}</strong>${segment.source}<br>${segment.note}`;
  tooltip.hidden = false;
  if ('clientX' in eventOrRect) positionTooltip(eventOrRect, tooltip);
  else {
    tooltip.style.left = `${Math.min(window.innerWidth - 246, eventOrRect.right + 8)}px`;
    tooltip.style.top = `${Math.min(window.innerHeight - 100, eventOrRect.top)}px`;
  }
}

function positionTooltip(event, tooltip) {
  tooltip.style.left = `${Math.min(window.innerWidth - 246, event.clientX + 14)}px`;
  tooltip.style.top = `${Math.min(window.innerHeight - 110, event.clientY + 14)}px`;
}

function initLayerControls() {
  const toggleList = document.querySelector('.flowering-layer-toggles');
  if (toggleList && !toggleList.querySelector('[data-overlay-toggle="nwi"]')) {
    const nwiToggle = document.createElement('button');
    nwiToggle.className = 'layer-toggle';
    nwiToggle.type = 'button';
    nwiToggle.dataset.overlayToggle = 'nwi';
    nwiToggle.textContent = 'NWI bubbles';
    toggleList.append(nwiToggle);
  }
  const floweringLayer = document.querySelector('[data-flowering-layer]');
  const opacity = document.querySelector('[data-opacity]');
  document.querySelectorAll('[data-overlay-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const layerName = button.dataset.overlayToggle;
      if (activeLayers.has(layerName)) activeLayers.delete(layerName);
      else activeLayers.add(layerName);
      syncLayerVisibility();
      if (isCombinedRouteMode) {
        paintCombinedSvgCells();
        updateCombinedSegmentLineStates();
      }
      if ((layerName === 'l3' || layerName === 'l5') && selectedNwiSegment != null) renderDailyNwiBubbles(selectedNwiSegment);
    });
  });
  opacity?.addEventListener('input', () => {
    const value = String(Number(opacity.value) / 100);
    floweringLayer?.style.setProperty('opacity', value);
  });
  syncLayerVisibility();
}

function syncLayerVisibility() {
  document.querySelector('[data-l1-layer]')?.classList.toggle('is-hidden', !activeLayers.has('l1'));
  document.querySelector('[data-lane-highlight-layer]')?.classList.toggle('is-hidden', !activeLayers.has('l1'));
  document.querySelector('[data-flowering-layer]')?.classList.toggle('is-hidden', isCombinedRouteMode ? false : !activeLayers.has('l4'));
  document.querySelector('[data-lane-active-flowering-layer]')?.classList.toggle('is-hidden', isCombinedRouteMode ? true : !activeLayers.has('l4'));
  document.querySelectorAll('[data-annotation-group]').forEach((group) => {
    group.classList.toggle('is-hidden', !activeLayers.has(group.dataset.annotationGroup));
  });
  document.querySelectorAll('[data-overlay-toggle]').forEach((button) => {
    button.setAttribute('aria-pressed', String(activeLayers.has(button.dataset.overlayToggle)));
  });
  if (isCombinedRouteMode) updateCombinedSegmentLineStates();
}

function initZoomControls() {
  document.querySelector('[data-zoom-in]')?.addEventListener('click', () => setZoom(zoom + 0.15));
  document.querySelector('[data-zoom-out]')?.addEventListener('click', () => setZoom(zoom - 0.15));
  document.querySelector('[data-fit-view]')?.addEventListener('click', () => fitCurrentRouteView());
}

function setZoom(nextZoom) {
  zoom = Math.max(0.7, Math.min(3.2, Number(nextZoom.toFixed(2))));
  const canvas = document.querySelector('[data-flowering-canvas]');
  const label = document.querySelector('[data-zoom-label]');
  if (canvas) {
    const baseWidth = isCombinedRouteMode ? combinedCanvasBaseWidth : 970;
    canvas.style.width = `${Math.round(100 * zoom)}%`;
    canvas.style.maxWidth = `${Math.round(baseWidth * zoom)}px`;
  }
  if (label) label.textContent = `${Math.round(zoom * 100)}%`;
}

function fitCurrentRouteView() {
  const shell = document.querySelector('[data-canvas-shell]');
  const canvas = document.querySelector('[data-flowering-canvas]');
  setZoom(1);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scrollToCurrentRouteBounds(shell, canvas));
  });
}

function scrollToCurrentRouteBounds(shell, canvas) {
  if (!shell || !canvas) return;
  if (isCombinedRouteMode) {
    shell.scrollLeft = 0;
    shell.scrollTop = 0;
    return;
  }

  const rects = [...canvas.querySelectorAll([
    '.lane-highlight-hit path',
    '.overlay-nwi-bubble',
    '.overlay-nwi-value',
    '.nwi-overview-calendar',
  ].join(','))]
    .filter((element) => !element.closest('.is-hidden'))
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);

  if (!rects.length) return;

  const shellRect = shell.getBoundingClientRect();
  const bounds = rects.reduce((acc, rect) => ({
    left: Math.min(acc.left, rect.left - shellRect.left + shell.scrollLeft),
    top: Math.min(acc.top, rect.top - shellRect.top + shell.scrollTop),
    right: Math.max(acc.right, rect.right - shellRect.left + shell.scrollLeft),
    bottom: Math.max(acc.bottom, rect.bottom - shellRect.top + shell.scrollTop),
  }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });

  const maxScrollLeft = Math.max(0, shell.scrollWidth - shell.clientWidth);
  const maxScrollTop = Math.max(0, shell.scrollHeight - shell.clientHeight);
  shell.scrollLeft = clampNumber((bounds.left + bounds.right - shell.clientWidth) / 2, 0, maxScrollLeft);
  shell.scrollTop = clampNumber((bounds.top + bounds.bottom - shell.clientHeight) / 2, 0, maxScrollTop);
}

function initRouteStatus() {
  const render = (state) => {
    if (isCombinedRouteSelection(state)) {
      if (!isCombinedRouteMode) {
        routeSwitchSequence = routeSwitchSequence.then(() => renderCombinedRouteView()).catch(console.error);
      } else {
        applyCombinedSelection();
      }
      return;
    }

    const nextRouteId = routeVisualConfigs[state.activeRiskRoute]
      ? state.activeRiskRoute
      : state.selectedRoutes.find((routeId) => routeVisualConfigs[routeId]) || 'east-coastal';
    if (!routeVisualConfigs[nextRouteId]) return;
    if (!isCombinedRouteMode && nextRouteId === currentRouteId) return;
    routeSwitchSequence = routeSwitchSequence.then(() => switchMainRoute(nextRouteId)).catch(console.error);
  };
  subscribe(render);
  render(appState);
}

async function switchMainRoute(routeId) {
  closeNwiDetail();
  resetCombinedSegmentFocus({ restoreView: false });
  hideCombinedViewLegend();
  isCombinedRouteMode = false;
  hoveredCombinedRouteId = '';
  updateCombinedRouteHighlightState();
  document.querySelector('[data-flowering-canvas]')?.classList.remove('is-combined-routes');
  setVisualizationViewBox(canvasViewBox);
  setZoom(1);
  hoveredLaneIndex = null;
  selectedLaneIndex = null;
  await loadRouteDefinition(routeId);
  await loadFloweringOverlay();
  await loadDailyNwi();
  await loadSegmentMetrics();
  await renderLaneHighlights();
  renderAnnotationLayers();
  initNwiBubbleInteractions();
  initLaneInteractions();
  document.querySelector('[data-nwi-overview-calendars]')?.remove();
  initNwiOverviewCalendars();
  applyLaneFocus();
  fitCurrentRouteView();
}

bootstrap().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="app-shell"><section class="panel"><div class="panel-body"><h1 class="panel-title">花期节律页面载入失败</h1><p>${error.message}</p></div></section></main>`;
});
