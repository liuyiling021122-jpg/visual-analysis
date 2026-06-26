import { dataFiles, loadCsv, loadJson } from './data-loader.js';
import { appState, setSelectedRoute, subscribe } from './state.js';

const routeLabels = {
  'east-coastal': '东线（沿海线）',
  'west-northwest': '西线（西北线）',
  'central-route': '中线（京广线）',
  'south-route': '南线',
};

const routeColors = {
  'east-coastal': '#d88c52',
  'west-northwest': '#6faeb2',
  'central-route': '#c89a5b',
  'south-route': '#8fae8e',
};

const routeOrder = ['east-coastal', 'central-route', 'west-northwest', 'south-route'];

const mapFrame = {
  width: 330,
  height: 330,
  left: 20,
  right: 18,
  top: 18,
  bottom: 26,
  minLng: 73,
  maxLng: 135,
  minLat: 17,
  maxLat: 54,
};

const expandedMapFrame = {
  width: 900,
  height: 620,
  left: 64,
  right: 56,
  top: 46,
  bottom: 56,
  minLng: 73,
  maxLng: 135,
  minLat: 17,
  maxLat: 54,
};

const routeMapSourceNote = 'L7 Polygon/Line/Point 分层思路 · 本地中国边界';

let routeRows = [];
let chinaBoundary = null;
let baseMapMarkup = '';
let expandedBaseMapMarkup = '';
let lastRenderedMapKey = '';
let dynamicRouteOptions = [];
let mapExpanded = false;

export function initRouteMapPanel(root = document) {
  root.querySelectorAll('[data-route]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      setSelectedRoute(checkbox.dataset.route, checkbox.checked);
    });
  });

  subscribe((state) => {
    syncRouteCheckboxes(state);
    renderRouteMapIfNeeded(state);
  });

  Promise.all([loadCsv(dataFiles.routeSegments), loadJson(dataFiles.chinaBoundary)])
    .then(([rows, boundary]) => {
      routeRows = rows;
      chinaBoundary = boundary;
      dynamicRouteOptions = buildDynamicRouteOptions(rows);
      renderDynamicRouteList();
      baseMapMarkup = renderBaseMap(mapFrame);
      expandedBaseMapMarkup = renderBaseMap(expandedMapFrame);
      renderRouteMapIfNeeded(appState, true);
    })
    .catch(showMapError);

  syncRouteCheckboxes(appState);
  initExpandedMapControls(root);
}

function renderRouteMap(state) {
  const stage = document.querySelector('[data-route-map-stage]');
  if (!stage || !routeRows.length || !chinaBoundary) return;

  const groups = buildVisibleRouteGroups(state);
  const selectedGroups = groups.filter((group) => group.selected);

  if (!groups.length) {
    stage.innerHTML = `<div class="panel-loading">当前年代暂无路线地图数据。</div>`;
    updateMapMeta([], '[data-route-map-meta]');
    renderExpandedMap(state, []);
    return;
  }

  stage.innerHTML = renderMapSvg(groups, {
    frame: mapFrame,
    baseMap: baseMapMarkup,
    expanded: false,
    markerId: 'route-map-arrow',
  });

  stage.querySelectorAll('[data-select-route]').forEach((target) => {
    target.addEventListener('click', (event) => {
      event.stopPropagation();
      setSelectedRoute(target.dataset.selectRoute, !appState.selectedRoutes.includes(target.dataset.selectRoute));
    });
  });

  updateMapMeta(selectedGroups, '[data-route-map-meta]');
  attachMapTooltips(stage);
  renderExpandedMap(state, groups);
}

function buildVisibleRouteGroups(state) {
  const selectedDynamicIds = state.selectedRoutes.filter((routeId) => !routeLabels[routeId]);
  const displayRouteIds = unique([...routeOrder, ...selectedDynamicIds]);
  return displayRouteIds
    .map((routeId) => buildRouteGroup(routeId, state.selectedEra, state.selectedRoutes.includes(routeId)))
    .filter((group) => group.segments.length);
}

function renderMapSvg(groups, options) {
  const { frame, baseMap, expanded, markerId } = options;
  const className = expanded ? 'route-map-svg is-expanded' : 'route-map-svg';
  return `
    <svg class="${className}" viewBox="0 0 ${frame.width} ${frame.height}" role="img" aria-label="中国流动养蜂路线选择地图">
      <defs>
        <marker id="${markerId}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke"></path>
        </marker>
      </defs>
      ${baseMap}
      <g class="route-map-candidates" aria-label="可选迁徙路线">
        ${groups.map((group, index) => renderRouteGroup(group, index, frame, { expanded, markerId })).join('')}
      </g>
    </svg>
  `;
}

function renderExpandedMap(state, groups = buildVisibleRouteGroups(state)) {
  const expandedStage = document.querySelector('[data-route-map-expanded-stage]');
  if (!expandedStage || !groups.length) return;

  expandedStage.innerHTML = renderMapSvg(groups, {
    frame: expandedMapFrame,
    baseMap: expandedBaseMapMarkup,
    expanded: true,
    markerId: 'route-map-expanded-arrow',
  });

  expandedStage.querySelectorAll('[data-select-route]').forEach((target) => {
    target.addEventListener('click', (event) => {
      event.stopPropagation();
      setSelectedRoute(target.dataset.selectRoute, !appState.selectedRoutes.includes(target.dataset.selectRoute));
    });
  });

  attachMapTooltips(expandedStage);
  updateMapMeta(groups.filter((group) => group.selected), '[data-route-map-expanded-meta]');
}

function renderRouteMapIfNeeded(state, force = false) {
  const currentLocation = state.selectedNodeSummary?.location || '';
  const mapKey = `${state.selectedEra}:${state.selectedRoutes.join('|')}:${currentLocation}`;
  if (!force && mapKey === lastRenderedMapKey) return;
  lastRenderedMapKey = mapKey;
  renderRouteMap(state);
}

function buildRouteGroup(routeId, era, selected) {
  const routeName = routeLabels[routeId] || routeId;
  const color = routeColors[routeId] || '#d88c52';
  const dynamicOption = dynamicRouteOptions.find((option) => option.routeId === routeId);
  const segments = routeRows
    .filter((row) => row.route_name === routeName && eraMatches(row.era, era, dynamicOption?.era))
    .sort((a, b) => Number(a.segment_order) - Number(b.segment_order))
    .filter((row) => hasCoordinate(row.from_lat, row.from_lng) || hasCoordinate(row.to_lat, row.to_lng));

  return {
    routeId,
    routeName,
    color,
    selected,
    segments,
    points: orderedRoutePoints(segments),
    nodes: uniqueRouteNodes(segments),
    distance: segments.reduce((total, row) => total + Number(row.segment_km || 0), 0),
  };
}

function renderBaseMap(frame = mapFrame) {
  const features = chinaBoundary.features || [];
  const regionPaths = features
    .filter((feature) => feature.properties?.name !== '境界线')
    .map((feature) => renderGeoFeature(feature, 'route-map-province', frame))
    .join('');
  const borderPaths = features
    .filter((feature) => feature.properties?.gb === '003' || feature.properties?.name === '境界线')
    .map((feature) => renderGeoFeature(feature, 'route-map-undelimited-boundary', frame))
    .join('');

  return `
    <g class="route-map-basemap" aria-hidden="true">
      ${regionPaths}
      ${borderPaths}
      ${renderMapLabels(frame)}
    </g>
  `;
}

function renderGeoFeature(feature, className, frame) {
  const geometry = feature.geometry;
  if (!geometry) return '';

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((polygon) => renderRing(polygon, className, frame)).join('');
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map((polygon) => polygon.map((ring) => renderRing(ring, className, frame)).join(''))
      .join('');
  }

  if (geometry.type === 'LineString') {
    return `<path class="${className}" d="${polylinePath(geometry.coordinates, frame)}"></path>`;
  }

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.map((line) => `<path class="${className}" d="${polylinePath(line, frame)}"></path>`).join('');
  }

  return '';
}

function renderRing(ring, className, frame) {
  return `<path class="${className}" d="${polylinePath(ring, frame)} Z"></path>`;
}

function renderMapLabels(frame) {
  const labels = [
    ['西北', 87.6, 43.8],
    ['华北', 114.5, 38.6],
    ['东北', 126.5, 45.8],
    ['华东', 119.5, 31.1],
    ['华南', 112.5, 23.3],
    ['西南', 103.2, 29.8],
  ];

  return labels
    .map(([label, lng, lat]) => {
      const point = project(lng, lat, frame);
      return `<text class="route-map-region-label" x="${point.x}" y="${point.y}">${label}</text>`;
    })
    .join('');
}

function renderRouteGroup(group, groupIndex, frame = mapFrame, options = {}) {
  const routeClass = group.selected ? ' is-selected' : ' is-muted';
  const offset = (groupIndex - Math.max(routeOrder.length - 1, 1) / 2) * 2.4;
  const tooltip = `${group.routeName}\n${group.segments.length} 段迁徙 · 约 ${formatNumber(group.distance, 0)} km\n点击${group.selected ? '取消选择' : '加入对比'}`;
  const segments = buildRouteConnections(group.points).map((connection, index) => renderRouteSegment(connection, group, offset, index, frame, options)).join('');
  const nodes = group.nodes.map((node) => renderRouteNode(node, group, frame, options)).join('');
  const hitPath = routeHitPath(group.points, offset, frame);
  const expandedClass = options.expanded ? ' is-expanded-route' : '';

  return `
    <g class="route-map-route${routeClass}${expandedClass}" style="color:${group.color}" data-route-id="${escapeAttribute(group.routeId)}">
      <path
        class="route-map-route-hit"
        d="${hitPath}"
        data-select-route="${escapeAttribute(group.routeId)}"
        data-map-tooltip="${escapeAttribute(tooltip)}"
      ></path>
      ${segments}
      ${nodes}
    </g>
  `;
}

function renderRouteSegment(connection, group, offset, index, frame = mapFrame, options = {}) {
  const start = project(connection.from.lng, connection.from.lat, frame);
  const end = project(connection.to.lng, connection.to.lat, frame);
  if (!start || !end) return '';

  const path = curvePath(start, end, offset);
  const nectar = connection.to.nectarSources.join(' / ') || connection.from.nectarSources.join(' / ') || '蜜源待补';
  const tooltip = `${group.routeName}\n${index + 1}. ${connection.from.label} -> ${connection.to.label}\n${nectar}`;
  const flowClass = options.expanded ? 'route-map-flow is-animated-flow' : 'route-map-flow';
  const markerId = options.markerId || 'route-map-arrow';
  const delay = ((index % 9) * 0.18).toFixed(2);
  const revealDelay = options.expanded ? (index * 0.18).toFixed(2) : '0';

  return `
    <path
      class="${flowClass}"
      d="${path}"
      marker-end="url(#${markerId})"
      style="--flow-delay:${delay}s; --reveal-delay:${revealDelay}s"
      data-select-route="${escapeAttribute(group.routeId)}"
      data-map-tooltip="${escapeAttribute(tooltip)}"
    ></path>
  `;
}

function renderRouteNode(node, group, frame = mapFrame, options = {}) {
  const point = project(node.lng, node.lat, frame);
  const tooltip = `${group.routeName}\n${node.label}\n${node.nectarSources.join(' / ') || '蜜源待补'}\n点击${group.selected ? '取消选择' : '加入对比'}`;
  const isCurrent = appState.selectedNodeSummary?.location && normalizeLocation(node.label) === normalizeLocation(appState.selectedNodeSummary.location);
  const radiusBoost = options.expanded ? 1.5 : 0;

  return `
    <g class="route-map-node${isCurrent ? ' is-current' : ''}" data-select-route="${escapeAttribute(group.routeId)}" data-map-tooltip="${escapeAttribute(tooltip)}">
      <circle cx="${point.x}" cy="${point.y}" r="${(node.count > 1 ? 4.4 : 3.4) + radiusBoost}"></circle>
      ${group.selected || options.expanded ? `<text x="${point.x + 6 + radiusBoost}" y="${point.y - 4}">${escapeHtml(node.shortLabel)}</text>` : ''}
    </g>
  `;
}

function routeHitPath(points, offset, frame = mapFrame) {
  return buildRouteConnections(points)
    .map((connection) => {
      const start = project(connection.from.lng, connection.from.lat, frame);
      const end = project(connection.to.lng, connection.to.lat, frame);
      return curvePath(start, end, offset);
    })
    .filter(Boolean)
    .join(' ');
}

function orderedRoutePoints(segments) {
  const points = [];
  segments.forEach((segment) => {
    appendRoutePoint(points, {
      label: segment.from_location,
      lat: segment.from_lat,
      lng: segment.from_lng,
      nectarSources: [segment.nectar_sources].filter(Boolean),
    });
    appendRoutePoint(points, {
      label: segment.to_location,
      lat: segment.to_lat,
      lng: segment.to_lng,
      nectarSources: [segment.nectar_sources].filter(Boolean),
    });
  });

  return points;
}

function appendRoutePoint(points, point) {
  if (!point.label || !hasCoordinate(point.lat, point.lng)) return;
  const normalizedPoint = {
    ...point,
    lat: Number(point.lat),
    lng: Number(point.lng),
  };
  const previous = points[points.length - 1];

  if (previous && previous.label === normalizedPoint.label && sameCoordinate(previous, normalizedPoint)) {
    normalizedPoint.nectarSources.forEach((source) => {
      if (!previous.nectarSources.includes(source)) previous.nectarSources.push(source);
    });
    return;
  }

  points.push(normalizedPoint);
}

function buildRouteConnections(points) {
  return points.slice(1).map((point, index) => ({
    from: points[index],
    to: point,
  }));
}

function sameCoordinate(a, b) {
  return Math.abs(Number(a.lat) - Number(b.lat)) < 0.0001 && Math.abs(Number(a.lng) - Number(b.lng)) < 0.0001;
}

function uniqueRouteNodes(segments) {
  const nodes = new Map();
  segments.forEach((segment) => {
    [
      { label: segment.from_location, lat: segment.from_lat, lng: segment.from_lng },
      { label: segment.to_location, lat: segment.to_lat, lng: segment.to_lng },
    ].forEach((item) => {
      if (!item.label || !hasCoordinate(item.lat, item.lng)) return;
      const key = `${item.label}-${item.lat}-${item.lng}`;
      const current = nodes.get(key) || {
        ...item,
        shortLabel: compactLocation(item.label),
        nectarSources: [],
        count: 0,
      };
      current.count += 1;
      if (segment.nectar_sources && !current.nectarSources.includes(segment.nectar_sources)) {
        current.nectarSources.push(segment.nectar_sources);
      }
      nodes.set(key, current);
    });
  });

  return Array.from(nodes.values());
}

function segmentPoint(segment, prefix, frame = mapFrame) {
  const lat = segment[`${prefix}_lat`];
  const lng = segment[`${prefix}_lng`];
  if (!hasCoordinate(lat, lng)) return null;
  return project(Number(lng), Number(lat), frame);
}

function hasCoordinate(lat, lng) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

function project(lng, lat, frame = mapFrame) {
  const xRange = frame.width - frame.left - frame.right;
  const yRange = frame.height - frame.top - frame.bottom;
  const x = frame.left + ((Number(lng) - frame.minLng) / (frame.maxLng - frame.minLng)) * xRange;
  const y = frame.top + ((frame.maxLat - Number(lat)) / (frame.maxLat - frame.minLat)) * yRange;
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
  };
}

function polylinePath(coordinates, frame = mapFrame) {
  return coordinates
    .filter((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2)
    .map((coordinate, index) => {
      const point = project(coordinate[0], coordinate[1], frame);
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    })
    .join(' ');
}

function curvePath(start, end, offset = 0) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = (-dy / length) * (9 + offset);
  const normalY = (dx / length) * (9 + offset);
  const cx = (start.x + end.x) / 2 + normalX;
  const cy = (start.y + end.y) / 2 + normalY;
  return `M ${start.x} ${start.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${end.x} ${end.y}`;
}

function loopPath(point, index) {
  const radius = 6 + (index % 3) * 1.7;
  return `M ${point.x} ${point.y} c ${radius} ${-radius} ${radius * 1.8} ${radius} 0 ${radius * 1.5}`;
}

function compactLocation(value) {
  return String(value || '')
    .replace(/\s.+$/, '')
    .replace(/[（(].+[）)]/, '');
}

function normalizeLocation(value) {
  return compactLocation(value).replace(/省|市|自治区|壮族|回族|维吾尔/g, '');
}

function attachMapTooltips(stage) {
  stage.querySelectorAll('[data-map-tooltip]').forEach((target) => {
    target.addEventListener('pointerenter', (event) => showMapTooltip(target.dataset.mapTooltip, event));
    target.addEventListener('pointermove', positionMapTooltip);
    target.addEventListener('pointerleave', hideMapTooltip);
  });
}

function showMapTooltip(text, event) {
  let tooltip = document.querySelector('[data-map-hover-tooltip]');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'data-hover-tooltip';
    tooltip.dataset.mapHoverTooltip = '';
    document.body.appendChild(tooltip);
  }

  tooltip.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
  tooltip.hidden = false;
  positionMapTooltip(event);
}

function positionMapTooltip(event) {
  const tooltip = document.querySelector('[data-map-hover-tooltip]');
  if (!tooltip || tooltip.hidden) return;
  const offset = 14;
  const rect = tooltip.getBoundingClientRect();
  const left = Math.max(offset, Math.min(event.clientX + offset, window.innerWidth - rect.width - offset));
  const top = Math.max(offset, Math.min(event.clientY + offset, window.innerHeight - rect.height - offset));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideMapTooltip() {
  const tooltip = document.querySelector('[data-map-hover-tooltip]');
  if (tooltip) tooltip.hidden = true;
}

function updateMapMeta(groups, selector = '[data-route-map-meta]') {
  const meta = document.querySelector(selector);
  if (!meta) return;

  if (!groups.length) {
    meta.innerHTML = `<span>${routeMapSourceNote}</span><span>点击地图或列表选择路线</span>`;
    return;
  }

  const segmentCount = groups.reduce((total, group) => total + group.segments.length, 0);
  meta.innerHTML = `
    <span>${groups.map((group) => `<i style="background:${group.color}"></i>${escapeHtml(group.routeName)}`).join('')}</span>
    <span>${segmentCount} 段 · ${appState.selectedEra}</span>
  `;
}

function initExpandedMapControls(root) {
  const stage = root.querySelector('[data-route-map-stage]');
  const overlay = root.querySelector('[data-route-map-expanded]');
  if (!stage || !overlay) return;

  stage.addEventListener('click', (event) => {
    if (event.target.closest('[data-select-route]')) return;
    openExpandedMap();
  });

  stage.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openExpandedMap();
  });

  root.querySelectorAll('[data-route-map-collapse]').forEach((target) => {
    target.addEventListener('click', closeExpandedMap);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mapExpanded) closeExpandedMap();
  });
}

function openExpandedMap() {
  const overlay = document.querySelector('[data-route-map-expanded]');
  if (!overlay) return;
  mapExpanded = true;
  overlay.hidden = false;
  document.body.classList.add('is-route-map-expanded');
  renderExpandedMap(appState);
}

function closeExpandedMap() {
  const overlay = document.querySelector('[data-route-map-expanded]');
  if (!overlay) return;
  mapExpanded = false;
  overlay.hidden = true;
  document.body.classList.remove('is-route-map-expanded');
}

function syncRouteCheckboxes(state) {
  document.querySelectorAll('[data-route], [data-dynamic-route]').forEach((checkbox) => {
    checkbox.checked = state.selectedRoutes.includes(checkbox.dataset.route);
  });
}

function renderDynamicRouteList() {
  const container = document.querySelector('[data-extended-route-list]');
  if (!container) return;

  const variants = dynamicRouteOptions.filter((option) => option.routeType === 'variant');
  const cases = dynamicRouteOptions.filter((option) => option.routeType === 'beekeeper_case');

  container.innerHTML = `
    <section class="route-option-section">
      <h3 class="caption">区域/变体路线</h3>
      <div class="route-option-grid">
        ${variants.map(renderDynamicRouteOption).join('')}
      </div>
    </section>
    <section class="route-option-section">
      <h3 class="caption">蜂农个案路线</h3>
      <div class="route-option-grid">
        ${cases.map(renderDynamicRouteOption).join('')}
      </div>
    </section>
  `;

  container.querySelectorAll('[data-dynamic-route]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      setSelectedRoute(checkbox.dataset.route, checkbox.checked);
    });
  });
  syncRouteCheckboxes(appState);
}

function renderDynamicRouteOption(option) {
  const color = option.routeType === 'variant' ? '#8dbfc1' : '#b96c54';
  return `
    <label class="route-option-pill" title="${escapeAttribute(option.note)}">
      <input type="checkbox" data-route="${escapeAttribute(option.routeId)}" data-dynamic-route />
      <span>${escapeHtml(option.routeName)}</span>
      <i style="background:${color}"></i>
    </label>
  `;
}

function buildDynamicRouteOptions(rows) {
  const byRoute = new Map();
  rows
    .filter((row) => row.route_type !== 'classic')
    .forEach((row) => {
      if (!byRoute.has(row.route_name)) {
        byRoute.set(row.route_name, {
          routeId: row.route_name,
          routeName: row.route_name,
          routeType: row.route_type,
          era: row.era,
          note: `${row.route_type === 'variant' ? '区域/变体路线' : '蜂农个案路线'} · ${row.era}`,
        });
      }
    });
  return Array.from(byRoute.values()).sort((a, b) => a.routeType.localeCompare(b.routeType) || a.routeName.localeCompare(b.routeName, 'zh-CN'));
}

function eraMatches(rowEra, selectedEra, optionEra) {
  if (rowEra === selectedEra) return true;
  if (String(rowEra).includes(selectedEra)) return true;
  if (optionEra && String(optionEra).includes(selectedEra)) return true;
  return false;
}

function unique(values) {
  return Array.from(new Set(values));
}

function showMapError(error) {
  const stage = document.querySelector('[data-route-map-stage]');
  if (stage) {
    stage.innerHTML = `<div class="panel-loading">路线地图数据载入失败：${escapeHtml(error.message)}</div>`;
  }
  console.error(error);
}

function formatNumber(value, digits = 1) {
  return Number(value || 0).toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : undefined,
  });
}

function escapeAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
