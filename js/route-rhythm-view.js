import { loadRouteRhythmData } from './data-loader.js';
import { appState, setSelectedNode, subscribe, toggleLayer } from './state.js';

const routeLabels = {
  'east-coastal': '东线（沿海线）',
  'west-northwest': '西线（西北线）',
  'central-route': '中线（京广线）',
  'south-route': '南线',
};

const eraWeatherYear = {
  '1980s': 1985,
  '2000s': 2005,
  '2020s': 2024,
};

const monthWindows = {
  all: [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  spring: [2, 3, 4, 5],
  summer: [6, 7, 8],
};

const monthSequence = monthWindows.all;
const daysInMonth = {
  1: 31,
  2: 28,
  3: 31,
  4: 30,
  5: 31,
  6: 30,
  7: 31,
  8: 31,
  9: 30,
  10: 31,
  11: 30,
  12: 31,
};

const chartFrame = {
  top: 82,
  right: 34,
  bottom: 58,
  left: 104,
  rowHeight: 70,
  monthWidth: 64,
  columnGap: 42,
};

let rhythmData = null;
let currentSegments = [];

export function initRouteRhythmView(root = document) {
  root.querySelectorAll('[data-layer]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleLayer(button.dataset.layer);
    });
  });

  subscribe((state) => {
    syncLayerButtons(state);
    if (rhythmData) {
      renderRouteRhythm(state);
    }
  });
  syncLayerButtons(appState);

  loadRouteRhythmData()
    .then((data) => {
      rhythmData = data;
      renderRouteRhythm(appState);
    })
    .catch(showRhythmError);
}

function renderRouteRhythm(state) {
  const chart = document.querySelector('[data-route-rhythm-chart]');
  if (!chart || !rhythmData) return;

  const selectedRouteIds = state.selectedRoutes.length ? state.selectedRoutes : ['east-coastal'];
  const selectedRouteNames = selectedRouteIds.map((routeId) => routeLabels[routeId] || routeId);
  const months = monthWindows[state.selectedMonthWindow] || monthWindows.all;
  const routeGroups = selectedRouteNames
    .map((routeName, routeIndex) => prepareRouteGroup(routeName, state.selectedEra, routeIndex, selectedRouteNames.length, months))
    .filter((group) => group.segments.length);

  currentSegments = routeGroups.flatMap((group) => group.segments);

  const titleTarget = document.querySelector('[data-rhythm-route-title]');
  if (titleTarget) {
    titleTarget.textContent = `${selectedRouteNames.join(' / ')} · ${state.selectedEra}`;
  }

  const modeTarget = document.querySelector('[data-rhythm-mode-note]');
  if (modeTarget) {
    modeTarget.textContent =
      routeGroups.length > 1
        ? `多路线并排比较 · ${windowLabel(state.selectedMonthWindow)}`
        : `单路线分析 · ${windowLabel(state.selectedMonthWindow)}`;
  }

  if (!routeGroups.length) {
    chart.innerHTML = `<div class="panel-loading">当前年代与时间窗口暂无匹配路线数据：${escapeHtml(selectedRouteNames.join(' / '))}</div>`;
    renderDetailPanel(null);
    return;
  }

  const columns = buildColumns(routeGroups, months);
  const height = Math.max(
    560,
    chartFrame.top + Math.max(...columns.map((column) => column.rows.length), 1) * chartFrame.rowHeight + chartFrame.bottom,
  );
  const width =
    columns.reduce((max, column) => Math.max(max, column.x + column.width), 0) + chartFrame.right;

  chart.innerHTML = `
    <svg class="rhythm-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="路径节律主视图">
      <defs>
        <marker id="route-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="#909090"></path>
        </marker>
      </defs>
      ${columns.map((column) => renderRouteColumn(column, height, state)).join('')}
    </svg>
  `;
  chart.style.minHeight = `${height}px`;
  chart.style.minWidth = `${width}px`;

  attachNodeEvents(chart);
  renderDetailPanel(currentSegments.find((segment) => segment.id === state.selectedNode) || null);
}

function prepareRouteGroup(routeName, era, routeIndex, routeCount, months) {
  const routeRows = rhythmData.routeSegmentSummary
    .filter((row) => row.route_name === routeName && eraMatches(row.era, era))
    .sort((a, b) => Number(a.segment_order) - Number(b.segment_order));
  const weatherYear = eraWeatherYear[era] || 2024;
  const profitRow = getProfitReference(rhythmData.profitByMode, era);
  const visibleRows = routeRows.filter((row) => segmentIntersectsMonths(row, months));

  const segments = visibleRows.map((row) => {
    const weatherRows = findWeatherRows(row, rhythmData.weatherDaily, row.weather_year_actual || weatherYear);
    const allEraWeather = buildEraWeatherComparisons(row, rhythmData.weatherDaily);
    const id = row.segment_id || `${routeName}-${era}-${row.segment_order}`.replace(/\s+/g, '-');

    return {
      ...row,
      id,
      displayEra: era,
      routeIndex,
      routeCount,
      weatherRows,
      allEraWeather,
      profitRow,
      summary: summaryFromDerived(row, weatherRows),
    };
  });

  return { routeName, routeIndex, segments, routeCount };
}

function buildColumns(routeGroups, months) {
  const monthCount = months.length;
  const columnWidth = chartFrame.left + monthCount * chartFrame.monthWidth + chartFrame.right;
  return routeGroups.map((group, index) => {
    const x = index * (columnWidth + chartFrame.columnGap);
    return {
      ...group,
      x,
      width: columnWidth,
      months,
      rows: buildLocationRows(group.segments),
    };
  });
}

function renderRouteColumn(column, height, state) {
  const summary = summarizeRoute(column.segments);
  return `
    <g class="rhythm-route-column" data-route-column="${escapeAttribute(column.routeName)}" transform="translate(${column.x},0)">
      <text class="rhythm-column-title" x="${chartFrame.left - 6}" y="26">${escapeHtml(column.routeName)}</text>
      <text class="rhythm-column-subtitle" x="${chartFrame.left - 6}" y="43">${summary.segmentCount} 段 · ${formatNumber(
        summary.distance,
        0,
      )} km · 平均采蜜率 ${formatPercent(summary.goodHoneyRate)}</text>
      ${renderMonthAxis(column.months, height)}
      ${renderRows(column.rows, column.months)}
      ${renderRouteGroup(column, state)}
    </g>
  `;
}

function renderRouteGroup(column, state) {
  const layers = state.activeLayers;
  const links = layers.has('route')
    ? column.segments
        .slice(1)
        .map((segment, index) => {
          const previous = column.segments[index];
          const start = pointForSegment(previous, column, 'end');
          const end = pointForSegment(segment, column, 'start');
          const path = linkPath(start, end);
          const linked = [previous.id, segment.id].includes(state.selectedNode) ? ' is-linked' : '';
          const dash = getTimingDash(segment);

          return `<path class="rhythm-link${linked}" d="${path}" marker-end="url(#route-arrow)" style="${dash}"></path>`;
        })
        .join('')
    : '';

  const nodes = column.segments.map((segment) => renderSegment(segment, column, layers, state)).join('');
  return `<g data-route-group="${escapeAttribute(column.routeName)}">${links}${nodes}</g>`;
}

function renderSegment(segment, column, layers, state) {
  const y = yForLocation(segment.to_location, column.rows);
  const xStart = xForDateParts(segment.start_month, segment.start_day, column.months);
  const xEnd = xForDateParts(segment.end_month, segment.end_day, column.months);
  const clippedStart = clamp(xStart, chartFrame.left, chartFrame.left + column.months.length * chartFrame.monthWidth);
  const clippedEnd = clamp(xEnd, chartFrame.left, chartFrame.left + column.months.length * chartFrame.monthWidth);
  const xCenter = (clippedStart + clippedEnd) / 2;
  const radius = clamp(7 + Number(segment.stay_days) * 0.4, 11, 20);
  const selected = state.selectedNode === segment.id ? ' is-selected' : '';
  const layersSvg = [
    layers.has('route') ? renderStayLayer(segment, clippedStart, clippedEnd, y) : '',
    layers.has('buffer') ? renderBufferLayer(segment, column.months, y) : '',
    layers.has('weather') ? renderWeatherLayer(segment, column.months, y) : '',
    layers.has('flowering') ? renderFlowerLayer(segment, column.months, y) : '',
    layers.has('weather') && layers.has('flowering') ? renderEffectiveLayer(segment, column.months, y) : '',
    layers.has('risk') ? renderRiskLayer(segment, column.months, y) : '',
    layers.has('pollination') ? renderPollinationLayer(segment, xCenter, y) : '',
    layers.has('climate') ? renderClimateLayer(segment, column.months, y) : '',
    layers.has('profit') ? renderProfitLayer(segment, xCenter, y) : '',
  ].join('');

  const badgeX = Math.min(clippedEnd + 8, chartFrame.left + column.months.length * chartFrame.monthWidth - 62);
  const labelX = Math.max(chartFrame.left + 4, xCenter - 36);
  const dataQualityClass = segment.data_quality_note ? ' has-caveat' : '';

  return `
    <g class="rhythm-node-group${selected}${dataQualityClass}" data-node-group="${escapeAttribute(segment.id)}">
      ${layersSvg}
      ${
        layers.has('route')
          ? `
            <circle class="route-node-core" cx="${xCenter.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}"></circle>
            <rect class="route-node-hit" x="${(clippedStart - 8).toFixed(1)}" y="${(y - 30).toFixed(1)}" width="${Math.max(
              clippedEnd - clippedStart + 16,
              50,
            ).toFixed(1)}" height="62" rx="4" data-node-id="${escapeAttribute(segment.id)}"></rect>
            <text class="route-node-label" x="${labelX.toFixed(1)}" y="${(y - 26).toFixed(1)}">${escapeHtml(
              `${segment.segment_order} ${segment.to_location}`,
            )}</text>
            <text class="route-node-subtitle" x="${labelX.toFixed(1)}" y="${(y - 13).toFixed(1)}">${escapeHtml(
              segment.nectar_sources || '蜜源待补',
            )}</text>
            <rect class="route-node-badge" x="${badgeX.toFixed(1)}" y="${(y + 12).toFixed(1)}" width="62" height="16" rx="8"></rect>
            <text class="route-node-badge-text" x="${(badgeX + 31).toFixed(1)}" y="${(y + 23.5).toFixed(
              1,
            )}" text-anchor="middle">NWI ${formatNumber(segment.summary.avgNWI, 0)}</text>
            ${segment.data_quality_note ? `<text class="route-node-caveat" x="${(badgeX + 68).toFixed(1)}" y="${(y + 23.5).toFixed(1)}">有限</text>` : ''}
          `
          : ''
      }
    </g>
  `;
}

function renderStayLayer(segment, xStart, xEnd, y) {
  const dash = getTimingDash(segment);
  return `<line class="route-layer-l2" x1="${xStart.toFixed(1)}" x2="${xEnd.toFixed(1)}" y1="${(y - 8).toFixed(
    1,
  )}" y2="${(y - 8).toFixed(1)}" style="${dash}"></line>`;
}

function renderBufferLayer(segment, months, y) {
  const rows = segment.weatherRows.filter((row) => row.buffer_before === 1 || row.buffer_after === 1);
  if (!rows.length) return '';
  return rows
    .map((row) => {
      if (!dateInMonths(row.date, months)) return '';
      const x = xForDateString(row.date, months);
      const width = dayWidth(row.date);
      const before = row.buffer_before === 1 ? ' is-before' : ' is-after';
      return `<rect class="route-buffer-band${before}" x="${x.toFixed(1)}" y="${(y - 18).toFixed(1)}" width="${width.toFixed(
        1,
      )}" height="36"></rect>`;
    })
    .join('');
}

function renderWeatherLayer(segment, months, y) {
  const rows = segment.weatherRows.filter((row) => row.in_stay_period === 1 && dateInMonths(row.date, months));
  return rows
    .map((row) => {
      const x = xForDateString(row.date, months);
      const width = dayWidth(row.date);
      const nwi = Number(row.nectar_weather_index) || 0;
      const good = row.good_honey_day === 1;
      const fair = nwi < 80 ? ' is-fair' : '';
      const interruption = !good ? ' is-interrupted' : '';
      const rain = Number(row.precipitation_mm) > 0 ? renderRainMark(row, months, y) : '';
      const honeyMark = good ? renderGoodHoneyMark(x + width / 2, y) : '';
      const strokeWidth = nwi >= 80 ? 2.2 : 1.4;
      return `
        <line class="route-layer-l3${fair}${interruption}" x1="${x.toFixed(1)}" x2="${(x + width).toFixed(1)}" y1="${y.toFixed(
          1,
        )}" y2="${y.toFixed(1)}" style="stroke-width:${strokeWidth}"></line>
        ${honeyMark}
        ${rain}
      `;
    })
    .join('');
}

function renderGoodHoneyMark(x, y) {
  return `<path class="route-good-day-mark" d="M ${x.toFixed(1)} ${(y - 7).toFixed(1)} l 3 5 h -6 z"></path>`;
}

function renderRainMark(row, months, y) {
  const x = xForDateString(row.date, months) + dayWidth(row.date) / 2;
  const height = clamp(Number(row.precipitation_mm) / 4, 2, 11);
  return `<line class="route-rain-mark" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${(y + 2).toFixed(1)}" y2="${(
    y +
    2 +
    height
  ).toFixed(1)}"></line>`;
}

function renderFlowerLayer(segment, months, y) {
  if (!segment.flower_start_month || !segment.flower_end_month) return '';
  const xStart = xForDateParts(segment.flower_start_month, 1, months);
  const xEnd = xForDateParts(segment.flower_end_month, daysInMonth[segment.flower_end_month] || 30, months);
  const chartStart = chartFrame.left;
  const chartEnd = chartFrame.left + months.length * chartFrame.monthWidth;
  const clippedStart = clamp(xStart, chartStart, chartEnd);
  const clippedEnd = clamp(xEnd, chartStart, chartEnd);
  if (clippedEnd <= chartStart || clippedStart >= chartEnd) return '';
  const peakX = clamp(xForDateParts(segment.flower_peak_month, 15, months), chartStart, chartEnd);
  const gradeClass = honeyGradeClass(segment.honey_grade);

  return `
    <line class="route-layer-l4 ${gradeClass}" x1="${clippedStart.toFixed(1)}" x2="${clippedEnd.toFixed(1)}" y1="${(y + 8).toFixed(
      1,
    )}" y2="${(y + 8).toFixed(1)}"></line>
    <path class="route-flower-peak" d="M ${peakX.toFixed(1)} ${(y + 3).toFixed(1)} L ${(peakX + 4).toFixed(1)} ${(y + 8).toFixed(
      1,
    )} L ${peakX.toFixed(1)} ${(y + 13).toFixed(1)} L ${(peakX - 4).toFixed(1)} ${(y + 8).toFixed(1)} Z"></path>
    <text class="route-flower-label" x="${Math.min(clippedEnd + 5, chartEnd - 48).toFixed(1)}" y="${(y + 12).toFixed(
      1,
    )}">${escapeHtml(segment.honey_grade || '')}</text>
  `;
}

function renderEffectiveLayer(segment, months, y) {
  if (!segment.flower_start_month || !segment.flower_end_month) return '';

  return segment.weatherRows
    .filter(
      (row) =>
        row.good_honey_day === 1 &&
        row.in_stay_period === 1 &&
        dateInMonths(row.date, months) &&
        isInFlowerWindow(row.date, segment),
    )
    .map((row) => {
      const x = xForDateString(row.date, months);
      const width = dayWidth(row.date);
      return `<line class="route-layer-l5" x1="${x.toFixed(1)}" x2="${(x + width).toFixed(1)}" y1="${(y + 16).toFixed(
        1,
      )}" y2="${(y + 16).toFixed(1)}"></line>`;
    })
    .join('');
}

function renderRiskLayer(segment, months, y) {
  const riskyRows = segment.weatherRows.filter(
    (row) =>
      row.in_stay_period === 1 &&
      dateInMonths(row.date, months) &&
      (Number(row.bad_weather_streak) >= 3 || Number(row.temp_max_c) > 35 || Number(row.precipitation_mm) > 25),
  );
  if (!riskyRows.length) return '';

  return groupContiguousRows(riskyRows)
    .map((group) => {
      const startX = xForDateString(group[0].date, months);
      const endRow = group[group.length - 1];
      const endX = xForDateString(endRow.date, months) + dayWidth(endRow.date);
      const label = Math.max(...group.map((row) => Number(row.bad_weather_streak) || 0));
      return `
        <rect class="route-risk-band" x="${startX.toFixed(1)}" y="${(y - 23).toFixed(1)}" width="${Math.max(
          endX - startX,
          4,
        ).toFixed(1)}" height="12" rx="2"></rect>
        <circle class="route-risk-dot" cx="${((startX + endX) / 2).toFixed(1)}" cy="${(y - 17).toFixed(1)}" r="3.6"></circle>
        ${label >= 3 ? `<text class="route-risk-label" x="${(endX + 4).toFixed(1)}" y="${(y - 14).toFixed(1)}">${label}天</text>` : ''}
      `;
    })
    .join('');
}

function renderPollinationLayer(segment, x, y) {
  if (!Number(segment.pollination_case_count)) return '';
  const count = Number(segment.pollination_case_count);
  return `
    <g class="route-pollination-mark">
      <rect x="${(x + 14).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="21" height="16" rx="3"></rect>
      <text x="${(x + 24.5).toFixed(1)}" y="${(y + 6.5).toFixed(1)}" text-anchor="middle">${count}</text>
    </g>
  `;
}

function renderClimateLayer(segment, months, y) {
  if (!segment.climate_year) return '';
  const offset = clamp(Number(segment.climate_flowering_advance_days) || 0, -8, 12);
  const x = xForDateParts(segment.start_month, segment.start_day, months);
  if (!Number.isFinite(x)) return '';
  const direction = offset >= 0 ? '提前' : '推迟';
  return `
    <g class="route-climate-mark">
      <line x1="${(x - offset * 1.6).toFixed(1)}" x2="${x.toFixed(1)}" y1="${(y + 25).toFixed(1)}" y2="${(y + 25).toFixed(
        1,
      )}"></line>
      <text x="${(x + 4).toFixed(1)}" y="${(y + 29).toFixed(1)}">${direction}${Math.abs(offset)}天</text>
    </g>
  `;
}

function renderProfitLayer(segment, x, y) {
  const value = Number(segment.profitRow?.intensive_migratory_profit_per_colony);
  if (!Number.isFinite(value)) return '';
  return `
    <g class="route-profit-mark">
      <rect x="${(x - 25).toFixed(1)}" y="${(y + 26).toFixed(1)}" width="50" height="16" rx="8"></rect>
      <text x="${x.toFixed(1)}" y="${(y + 37.5).toFixed(1)}" text-anchor="middle">¥${formatNumber(value, 0)}/箱</text>
    </g>
  `;
}

function renderMonthAxis(months, height) {
  return months
    .map((month, index) => {
      const x = chartFrame.left + index * chartFrame.monthWidth;
      return `
        <line class="rhythm-month-line" x1="${x}" x2="${x}" y1="${chartFrame.top - 30}" y2="${height - chartFrame.bottom}"></line>
        <text class="rhythm-axis-text" x="${x + 8}" y="${chartFrame.top - 40}">${month}月</text>
      `;
    })
    .join('');
}

function renderRows(rows, months) {
  const chartEnd = chartFrame.left + months.length * chartFrame.monthWidth;
  return rows
    .map((row, index) => {
      const y = chartFrame.top + index * chartFrame.rowHeight;
      return `
        <line class="rhythm-row-line" x1="${chartFrame.left - 8}" x2="${chartEnd}" y1="${y}" y2="${y}"></line>
        <text class="rhythm-row-text" x="${chartFrame.left - 16}" y="${y + 4}" text-anchor="end">${escapeHtml(row.location)}</text>
        <text class="rhythm-axis-text" x="${chartFrame.left - 16}" y="${y + 18}" text-anchor="end">${formatNumber(row.lat, 1)}°N</text>
      `;
    })
    .join('');
}

function buildLocationRows(segments) {
  const byLocation = new Map();
  segments.forEach((segment) => {
    if (!byLocation.has(segment.to_location)) {
      byLocation.set(segment.to_location, {
        location: segment.to_location,
        lat: Number(segment.to_lat),
      });
    }
  });

  return Array.from(byLocation.values()).sort((a, b) => a.lat - b.lat);
}

function pointForSegment(segment, column, edge) {
  return {
    x: edge === 'start' ? xForDateParts(segment.start_month, segment.start_day, column.months) : xForDateParts(segment.end_month, segment.end_day, column.months),
    y: yForLocation(segment.to_location, column.rows),
  };
}

function linkPath(start, end) {
  const midX = (start.x + end.x) / 2;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${midX.toFixed(1)} ${start.y.toFixed(1)}, ${midX.toFixed(
    1,
  )} ${end.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function yForLocation(location, rows) {
  const index = Math.max(
    rows.findIndex((row) => row.location === location),
    0,
  );
  return chartFrame.top + index * chartFrame.rowHeight;
}

function xForDateString(dateString, months) {
  const { month, day } = getDateParts(dateString);
  return xForDateParts(month, day, months);
}

function xForDateParts(month, day, months = monthSequence) {
  const monthIndex = months.indexOf(Number(month));
  const fallbackIndex = monthSequence.indexOf(Number(month));
  const resolvedIndex = monthIndex >= 0 ? monthIndex : clamp(fallbackIndex, 0, months.length - 1);
  const monthDays = daysInMonth[Number(month)] || 30;
  return chartFrame.left + (resolvedIndex + (Number(day) - 1) / monthDays) * chartFrame.monthWidth;
}

function dayWidth(dateString) {
  const { month } = getDateParts(dateString);
  return chartFrame.monthWidth / (daysInMonth[month] || 30);
}

function getDateParts(dateString) {
  const [, month, day] = String(dateString).match(/\d{4}-(\d{2})-(\d{2})/) || [];
  return {
    month: Number(month || 1),
    day: Number(day || 1),
  };
}

function getYear(dateString) {
  return Number(String(dateString).slice(0, 4));
}

function monthDayKey(dateString) {
  const { month, day } = getDateParts(dateString);
  return `${month}-${day}`;
}

function dateInMonths(dateString, months) {
  return months.includes(getDateParts(dateString).month);
}

function segmentIntersectsMonths(segment, months) {
  const segmentMonths = expandMonthRange(segment.start_month, segment.end_month);
  return segmentMonths.some((month) => months.includes(month));
}

function findWeatherRows(segment, weatherRows, weatherYear) {
  const startKey = monthDayKey(segment.start_date);
  const endKey = monthDayKey(segment.end_date);
  const strictRows = weatherRows.filter(
    (row) =>
      row.route_name === segment.route_name &&
      row.location === segment.to_location &&
      getYear(row.date) === Number(weatherYear) &&
      monthDayKey(row.stay_start) === startKey &&
      monthDayKey(row.stay_end) === endKey,
  );
  const fallbackRows = weatherRows.filter(
    (row) =>
      row.route_name === segment.route_name &&
      row.location === segment.to_location &&
      getYear(row.date) === Number(weatherYear),
  );

  return (strictRows.length ? strictRows : fallbackRows).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function buildEraWeatherComparisons(segment, weatherRows) {
  return Object.entries(eraWeatherYear)
    .map(([era, year]) => {
      const rows = findWeatherRows(segment, weatherRows, year).filter((row) => row.in_stay_period === 1);
      if (!rows.length) return null;
      const goodDays = rows.filter((row) => row.good_honey_day === 1).length;
      const avgNWI = rows.reduce((sum, row) => sum + Number(row.nectar_weather_index || 0), 0) / rows.length;
      return {
        era,
        year,
        goodHoneyRate: goodDays / rows.length,
        avgNWI,
      };
    })
    .filter(Boolean);
}

function summaryFromDerived(row, weatherRows) {
  const fallback = summarizeWeather(weatherRows, Number(row.stay_days));
  return {
    goodDays: Number(row.good_days) || fallback.goodDays,
    stayDays: Number(row.weather_day_count) || fallback.stayDays,
    goodHoneyRate: numberOrFallback(row.goodHoneyRate, fallback.goodHoneyRate),
    avgNWI: numberOrFallback(row.avgNWI, fallback.avgNWI),
    avgTemp: numberOrFallback(row.avgTemp, fallback.avgTemp),
    rainDays: Number(row.rainDays) || fallback.rainDays,
    maxPrecip: numberOrFallback(row.maxPrecip, fallback.maxPrecip),
    heatDays: Number(row.heatDays) || fallback.heatDays,
    maxBadStreak: Number(row.maxBadStreak) || fallback.maxBadStreak,
    climateRiskIndex: numberOrFallback(row.climateRiskIndex, fallback.climateRiskIndex),
  };
}

function summarizeWeather(rows, stayDays) {
  const validRows = rows.filter((row) => row.in_stay_period === 1);
  const count = validRows.length || stayDays || 1;
  const sum = (key) => validRows.reduce((total, row) => total + Number(row[key] || 0), 0);
  const goodDays = validRows.filter((row) => row.good_honey_day === 1).length;
  const rainRows = validRows.filter((row) => Number(row.precipitation_mm) > 0);
  const heatDays = validRows.filter((row) => Number(row.temp_max_c) > 35).length;
  const maxBadStreak = Math.max(0, ...validRows.map((row) => Number(row.bad_weather_streak) || 0));
  const goodHoneyRate = goodDays / count;
  const climateRiskIndex = clamp(1 - goodHoneyRate + maxBadStreak / 12 + rainRows.length / count / 5 + heatDays / count / 4, 0, 1);

  return {
    goodDays,
    stayDays: count,
    goodHoneyRate,
    avgNWI: sum('nectar_weather_index') / count,
    avgTemp: sum('temp_mean_c') / count,
    rainDays: rainRows.length,
    maxPrecip: Math.max(0, ...validRows.map((row) => Number(row.precipitation_mm) || 0)),
    heatDays,
    maxBadStreak,
    climateRiskIndex,
  };
}

function isInFlowerWindow(dateString, segment) {
  const { month } = getDateParts(dateString);
  return expandMonthRange(segment.flower_start_month, segment.flower_end_month).includes(month);
}

function expandMonthRange(startMonth, endMonth) {
  const startIndex = monthSequence.indexOf(Number(startMonth));
  const endIndex = monthSequence.indexOf(Number(endMonth));
  if (startIndex === -1 || endIndex === -1) return [];
  if (startIndex <= endIndex) return monthSequence.slice(startIndex, endIndex + 1);
  return [...monthSequence.slice(startIndex), ...monthSequence.slice(0, endIndex + 1)];
}

function groupContiguousRows(rows) {
  const sorted = rows.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return sorted.reduce((groups, row) => {
    const current = groups[groups.length - 1];
    if (!current || daysBetween(current[current.length - 1].date, row.date) > 1) {
      groups.push([row]);
    } else {
      current.push(row);
    }
    return groups;
  }, []);
}

function daysBetween(a, b) {
  return Math.abs((new Date(b) - new Date(a)) / 86400000);
}

function getProfitReference(rows, era) {
  const targetYear = era === '1980s' ? 2005 : era === '2000s' ? 2005 : 2023;
  return rows.find((row) => Number(row.year) === targetYear) || rows.reduce((latest, row) => (Number(row.year) > Number(latest.year) ? row : latest), rows[0]);
}

function summarizeRoute(segments) {
  const segmentCount = segments.length;
  const distance = segments.reduce((total, row) => total + Number(row.segment_km || 0), 0);
  const rates = segments.map((row) => row.summary.goodHoneyRate).filter(Number.isFinite);
  return {
    segmentCount,
    distance,
    goodHoneyRate: rates.reduce((total, value) => total + value, 0) / (rates.length || 1),
  };
}

function getHoneyGrade(segment) {
  return segment.honey_grade || '--';
}

function getTimingDash(segment) {
  if (!segment.flower_peak_month) return '';
  const peak = Number(segment.flower_peak_month);
  const arrival = Number(segment.start_month);
  const latestSegmentOrder = Math.max(...currentSegments.map((item) => Number(item.segment_order) || 0), 0);
  if (Number(segment.segment_order) === latestSegmentOrder && arrival >= 10) return 'stroke-dasharray:2 4;';
  if (arrival === peak) return '';
  return arrival > peak ? 'stroke-dasharray:4 4;' : 'stroke-dasharray:8 4;';
}

function attachNodeEvents(chart) {
  chart.querySelectorAll('.route-node-hit').forEach((hit) => {
    hit.addEventListener('pointerenter', (event) => {
      const segment = currentSegments.find((item) => item.id === hit.dataset.nodeId);
      if (!segment) return;
      chart.classList.add('is-hovering');
      chart.querySelector(`[data-node-group="${cssEscape(segment.id)}"]`)?.classList.add('is-hovered');
      showTooltip(segment, event);
    });

    hit.addEventListener('pointermove', (event) => {
      positionTooltip(event);
    });

    hit.addEventListener('pointerleave', () => {
      chart.classList.remove('is-hovering');
      chart.querySelectorAll('.is-hovered').forEach((item) => item.classList.remove('is-hovered'));
      hideTooltip();
    });

    hit.addEventListener('click', () => {
      const segment = currentSegments.find((item) => item.id === hit.dataset.nodeId);
      const nextNodeId = appState.selectedNode === hit.dataset.nodeId ? null : hit.dataset.nodeId;
      setSelectedNode(nextNodeId, nextNodeId ? buildNodeSummary(segment) : null);
    });
  });
}

function showTooltip(segment, event) {
  const tooltip = document.querySelector('[data-window="tooltip-layer"]');
  if (!tooltip) return;

  tooltip.hidden = false;
  tooltip.style.position = 'fixed';
  tooltip.style.pointerEvents = 'none';
  tooltip.innerHTML = `
    <strong>${escapeHtml(segment.segment_order)} ${escapeHtml(segment.to_location)} · ${escapeHtml(segment.nectar_sources || '蜜源')}</strong>
    <p class="placeholder-copy">停留：${formatMonthDay(segment.start_date)} - ${formatMonthDay(segment.end_date)}（${formatNumber(
      segment.stay_days,
      0,
    )}天）</p>
    <p class="placeholder-copy">理论花期：${segment.flower_match_plant ? `${segment.flower_start_month}月-${segment.flower_end_month}月，盛花 ${segment.flower_peak_month}月` : '暂无匹配'} · ${escapeHtml(
      getHoneyGrade(segment),
    )}</p>
    <p class="placeholder-copy">产量参考：${escapeHtml(segment.nectar_yield_kg_per_colony || '--')} kg/箱 · 适温 ${escapeHtml(
      segment.temp_range_c || '--',
    )}°C</p>
    <p class="placeholder-copy">有效采蜜日：${segment.summary.goodDays}/${segment.summary.stayDays}（${formatPercent(
      segment.summary.goodHoneyRate,
    )}） · 平均 NWI ${formatNumber(segment.summary.avgNWI, 0)}</p>
    <p class="placeholder-copy">最长连续恶劣：${segment.summary.maxBadStreak}天 · 气候风险 ${formatNumber(
      segment.summary.climateRiskIndex,
      2,
    )}</p>
    <p class="placeholder-copy">授粉案例：${Number(segment.pollination_case_count) || 0} 个${segment.pollination_crops ? ` · ${escapeHtml(segment.pollination_crops)}` : ''}</p>
    <p class="placeholder-copy">参考利润：${formatCurrency(segment.profitRow?.intensive_migratory_profit_per_colony)}元/箱（大转地 ${segment.profitRow?.year}）</p>
    ${segment.data_quality_note ? `<p class="placeholder-copy">数据备注：${escapeHtml(segment.data_quality_note)}</p>` : ''}
  `;
  positionTooltip(event);
}

function positionTooltip(event) {
  const tooltip = document.querySelector('[data-window="tooltip-layer"]');
  if (!tooltip || tooltip.hidden) return;

  const offset = 14;
  const rect = tooltip.getBoundingClientRect();
  const left = Math.max(offset, Math.min(event.clientX + offset, window.innerWidth - rect.width - offset));
  const top = Math.max(offset, Math.min(event.clientY + offset, window.innerHeight - rect.height - offset));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  const tooltip = document.querySelector('[data-window="tooltip-layer"]');
  if (tooltip) tooltip.hidden = true;
}

function renderDetailPanel(segment) {
  const panel = document.querySelector('[data-rhythm-detail-panel]');
  if (!panel) return;

  if (!segment) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }

  panel.hidden = false;
  panel.innerHTML = `
    <header class="rhythm-detail-header">
      <div>
        <h3 class="rhythm-detail-title">${escapeHtml(segment.segment_order)} ${escapeHtml(segment.to_location)} · ${escapeHtml(
          segment.nectar_sources || '蜜源',
        )}</h3>
        <div class="rhythm-detail-meta">${formatMonthDay(segment.start_date)}-${formatMonthDay(segment.end_date)} · 停留 ${formatNumber(
          segment.stay_days,
          0,
        )} 天 · 天气年 ${segment.weather_year_actual || segment.weather_year_requested}</div>
      </div>
      <div class="rhythm-detail-meta">
        ${segment.flower_match_plant ? `匹配蜜源 ${escapeHtml(segment.flower_match_plant)} · 蜜质 ${escapeHtml(getHoneyGrade(segment))} · 理论花期 ${segment.flower_start_month}-${segment.flower_end_month}月 · 盛花 ${segment.flower_peak_month}月` : '花期数据暂缺'}
      </div>
    </header>
    <div class="weather-day-strip" aria-label="逐日天气">
      ${segment.weatherRows.filter((row) => row.in_stay_period === 1).map(renderWeatherDayCard).join('') || '<div class="panel-loading">该节点暂无逐日天气数据。</div>'}
    </div>
    <div class="weather-summary-grid">
      <span>总停留 <strong>${segment.summary.stayDays}</strong> 天</span>
      <span>适宜 <strong>${segment.summary.goodDays}</strong> 天</span>
      <span>采蜜率 <strong>${formatPercent(segment.summary.goodHoneyRate)}</strong></span>
      <span>平均 NWI <strong>${formatNumber(segment.summary.avgNWI, 0)}</strong></span>
      <span>降水日 <strong>${segment.summary.rainDays}</strong> 天</span>
      <span>连续恶劣 <strong>${segment.summary.maxBadStreak}</strong> 天</span>
    </div>
    ${renderEraComparison(segment)}
    ${renderPollinationDetail(segment)}
    ${segment.data_quality_note ? `<p class="data-caveat-note">${escapeHtml(segment.data_quality_note)}</p>` : ''}
    <p class="rhythm-reading-note">${buildReadingNote(segment)}</p>
  `;
}

function renderWeatherDayCard(row) {
  const nwi = Number(row.nectar_weather_index) || 0;
  const riskClass = Number(row.bad_weather_streak) >= 3 || Number(row.precipitation_mm) > 25 || Number(row.temp_max_c) > 35 ? ' is-risk' : '';
  return `
    <article class="weather-day-card${riskClass}">
      <strong>${formatMonthDay(row.date)}</strong>
      <div class="weather-nwi-bar" style="background:${nwiColor(nwi)}"></div>
      <span>NWI ${formatNumber(nwi, 0)}</span>
      <span>${row.good_honey_day === 1 ? '适宜采蜜' : '窗口中断'}</span>
      <span>${formatNumber(row.temp_min_c, 0)}-${formatNumber(row.temp_max_c, 0)}°C</span>
      <span>雨 ${formatNumber(row.precipitation_mm, 1)}mm</span>
      <span>风 ${formatNumber(row.wind_max_kmh, 0)}km/h</span>
      <span>st${formatNumber(row.bad_weather_streak, 0)}</span>
    </article>
  `;
}

function renderEraComparison(segment) {
  if (!segment.allEraWeather.length) return '';
  const maxNwi = Math.max(...segment.allEraWeather.map((row) => row.avgNWI), 1);
  return `
    <div class="era-weather-comparison">
      ${segment.allEraWeather
        .map(
          (row) => `
            <span>
              <em>${row.era}</em>
              <i style="width:${(row.avgNWI / maxNwi) * 100}%"></i>
              <strong>NWI ${formatNumber(row.avgNWI, 0)} · ${formatPercent(row.goodHoneyRate)}</strong>
            </span>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderPollinationDetail(segment) {
  if (!Number(segment.pollination_case_count)) return '';
  return `
    <div class="pollination-detail-note">
      <strong>授粉案例预览</strong>
      <span>${escapeHtml(segment.pollination_crops)} · ${escapeHtml(segment.pollination_price_range)}</span>
      <small>按省域/地区名称匹配，不能视为该路段的精确授粉合同。</small>
    </div>
  `;
}

function buildReadingNote(segment) {
  const flowerText = segment.flower_match_plant
    ? `${segment.nectar_sources}匹配到${segment.to_location}的${segment.flower_match_plant}，理论花期为${segment.flower_start_month}-${segment.flower_end_month}月，盛花在${segment.flower_peak_month}月`
    : `${segment.nectar_sources}花期暂无精确匹配`;
  const timing =
    segment.flower_peak_month && Number(segment.start_month) > Number(segment.flower_peak_month)
      ? '蜂农到达时间晚于盛花月，L2 停留与 L4 花期存在横向错位。'
      : '蜂农停留与花期窗口存在可对照的重叠段。';
  const risk =
    segment.summary.maxBadStreak >= 3
      ? `停留期内最长连续恶劣天气为 ${segment.summary.maxBadStreak} 天，风险层中的陶土色带标出中断位置。`
      : '停留期没有出现 3 天及以上连续恶劣天气。';

  return `${flowerText}。${timing}L5 深色线表示停留、天气适宜、花期同时成立的有效采蜜窗口；${risk}`;
}

function buildNodeSummary(segment) {
  if (!segment) return null;
  return {
    id: segment.id,
    route_name: segment.route_name,
    era: segment.displayEra || segment.era,
    segment_order: segment.segment_order,
    location: segment.to_location,
    nectar_sources: segment.nectar_sources,
    stay_days: segment.stay_days,
    weather_year_actual: segment.weather_year_actual,
    weather_year_requested: segment.weather_year_requested,
    goodHoneyRate: segment.summary.goodHoneyRate,
    avgNWI: segment.summary.avgNWI,
    rainDays: segment.summary.rainDays,
    maxBadStreak: segment.summary.maxBadStreak,
    climateRiskIndex: segment.summary.climateRiskIndex,
    pollination_case_count: segment.pollination_case_count,
    pollination_crops: segment.pollination_crops,
    route_mode: segment.route_mode,
    data_quality_note: segment.data_quality_note,
  };
}

function nwiColor(nwi) {
  if (nwi >= 80) return '#66bb6a';
  if (nwi >= 60) return '#c9b75f';
  if (nwi >= 40) return '#d88c52';
  return '#b96c54';
}

function honeyGradeClass(grade) {
  if (String(grade).includes('一等')) return 'is-grade-one';
  if (String(grade).includes('二等')) return 'is-grade-two';
  if (String(grade).includes('三等')) return 'is-grade-three';
  return '';
}

function eraMatches(rowEra, selectedEra) {
  return rowEra === selectedEra || String(rowEra).includes(selectedEra);
}

function syncLayerButtons(state) {
  document.querySelectorAll('[data-layer]').forEach((button) => {
    button.setAttribute('aria-pressed', String(state.activeLayers.has(button.dataset.layer)));
  });
}

function showRhythmError(error) {
  const chart = document.querySelector('[data-route-rhythm-chart]');
  if (chart) {
    chart.innerHTML = `<div class="panel-loading">路径节律数据载入失败：${escapeHtml(error.message)}</div>`;
  }
  console.error(error);
}

function windowLabel(windowName) {
  if (windowName === 'spring') return '春花期';
  if (windowName === 'summer') return '夏蜜源';
  return '全年路线';
}

function numberOrFallback(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatMonthDay(dateString) {
  const { month, day } = getDateParts(dateString);
  return `${month}/${day}`;
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return '--';
  return `${formatNumber(Number(value) * 100, 0)}%`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(Number(value))) return '--';
  return Number(value || 0).toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : undefined,
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/"/g, '\\"');
}

function escapeAttribute(value) {
  return String(value)
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
