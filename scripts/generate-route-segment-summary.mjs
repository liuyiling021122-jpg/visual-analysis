import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_ROOT = path.join('project_reference', 'data', '养蜂数据', 'datasets');
const DERIVED_ROOT = path.join('project_reference', 'data', 'derived');

const files = {
  routes: path.join(DATA_ROOT, 'data_migration_routes_detailed.csv'),
  weather: path.join(DATA_ROOT, 'weather_daily_migration_routes.csv'),
  flowering: path.join(DATA_ROOT, 'flowering_calendar_by_province.csv'),
  pollination: path.join(DATA_ROOT, 'pollination_service_market.csv'),
  climate: path.join(DATA_ROOT, 'climate_factors_province_2000_2023.csv'),
};

const eraWeatherYear = {
  '1980s': 1985,
  '2000s': 2005,
  '2020s': 2024,
};

const monthSequence = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const headers = [
  'segment_id',
  'route_type',
  'era',
  'route_name',
  'route_description',
  'beekeeper_name',
  'beekeeper_origin',
  'case_year',
  'segment_order',
  'from_location',
  'to_location',
  'from_lat',
  'from_lng',
  'to_lat',
  'to_lng',
  'start_date',
  'end_date',
  'start_month',
  'start_day',
  'end_month',
  'end_day',
  'stay_days',
  'segment_km',
  'cumulative_km',
  'route_total_km',
  'nectar_sources',
  'transport_mode',
  'data_source',
  'flower_match_plant',
  'flower_match_score',
  'flower_start_month',
  'flower_end_month',
  'flower_peak_month',
  'flowering_months',
  'nectar_yield_kg_per_colony',
  'honey_grade',
  'temp_range_c',
  'flower_notes',
  'weather_year_requested',
  'weather_year_actual',
  'weather_match_scope',
  'weather_day_count',
  'good_days',
  'goodHoneyRate',
  'avgNWI',
  'avgTemp',
  'rainDays',
  'maxPrecip',
  'heatDays',
  'maxBadStreak',
  'climateRiskIndex',
  'buffer_before_days',
  'buffer_after_days',
  'pollination_case_count',
  'pollination_crops',
  'pollination_price_range',
  'pollination_source_note',
  'climate_year',
  'climate_spring_temp_c',
  'climate_heat_days',
  'climate_rainstorm_days',
  'climate_flowering_advance_days',
  'climate_source',
  'route_mode',
  'data_quality_note',
];

async function main() {
  const [routes, weather, flowering, pollination, climate] = await Promise.all([
    readCsv(files.routes),
    readCsv(files.weather),
    readFloweringCsv(files.flowering),
    readCsv(files.pollination),
    readCsv(files.climate),
  ]);

  const weatherIndex = indexWeather(weather);
  const pollinationIndex = indexPollination(pollination);
  const climateIndex = indexClimate(climate);

  const rows = routes.map((segment) => {
    const weatherYear = pickRequestedWeatherYear(segment);
    const segmentProvince = inferProvince(segment.to_location) || segment.to_location;
    const floweringMatch = findFlowering(segment, flowering);
    const weatherMatch = findWeatherRows(segment, weatherIndex, weatherYear);
    const weatherSummary = summarizeWeather(weatherMatch.rows);
    const pollinationSummary = summarizePollination(segmentProvince, pollinationIndex);
    const climateSummary = summarizeClimate(segmentProvince, climateIndex, weatherYear);
    const dataNotes = buildDataNotes(weatherMatch, pollinationSummary, climateSummary, segment);

    return {
      segment_id: makeSegmentId(segment),
      ...pickRouteFields(segment),
      flower_match_plant: floweringMatch?.honey_plant ?? '',
      flower_match_score: floweringMatch?.score ?? '',
      flower_start_month: floweringMatch?.start_month ?? '',
      flower_end_month: floweringMatch?.end_month ?? '',
      flower_peak_month: floweringMatch?.peak_month ?? '',
      flowering_months: floweringMatch?.flowering_months ?? '',
      nectar_yield_kg_per_colony: floweringMatch?.nectar_yield_kg_per_colony ?? '',
      honey_grade: floweringMatch?.honey_grade ?? '',
      temp_range_c: floweringMatch?.temp_range_c ?? '',
      flower_notes: floweringMatch?.notes ?? '',
      weather_year_requested: weatherYear,
      weather_year_actual: weatherMatch.year ?? '',
      weather_match_scope: weatherMatch.scope,
      weather_day_count: weatherSummary.weatherDayCount,
      good_days: weatherSummary.goodDays,
      goodHoneyRate: formatDecimal(weatherSummary.goodHoneyRate, 4),
      avgNWI: formatDecimal(weatherSummary.avgNWI, 2),
      avgTemp: formatDecimal(weatherSummary.avgTemp, 2),
      rainDays: weatherSummary.rainDays,
      maxPrecip: formatDecimal(weatherSummary.maxPrecip, 2),
      heatDays: weatherSummary.heatDays,
      maxBadStreak: weatherSummary.maxBadStreak,
      climateRiskIndex: formatDecimal(weatherSummary.climateRiskIndex, 4),
      buffer_before_days: weatherSummary.bufferBeforeDays,
      buffer_after_days: weatherSummary.bufferAfterDays,
      pollination_case_count: pollinationSummary.count,
      pollination_crops: pollinationSummary.crops,
      pollination_price_range: pollinationSummary.prices,
      pollination_source_note: pollinationSummary.note,
      climate_year: climateSummary.year,
      climate_spring_temp_c: climateSummary.springTemp,
      climate_heat_days: climateSummary.heatDays,
      climate_rainstorm_days: climateSummary.rainstormDays,
      climate_flowering_advance_days: climateSummary.floweringAdvanceDays,
      climate_source: climateSummary.source,
      route_mode: inferRouteMode(segment),
      data_quality_note: dataNotes.join('；'),
    };
  });

  await fs.mkdir(DERIVED_ROOT, { recursive: true });
  const output = stringifyCsv(rows, headers);
  await fs.writeFile(path.join(DERIVED_ROOT, 'route_segment_summary.csv'), output, 'utf8');
  console.log(`Generated ${rows.length} route segment summaries.`);
}

function pickRouteFields(segment) {
  return {
    route_type: segment.route_type,
    era: segment.era,
    route_name: segment.route_name,
    route_description: segment.route_description,
    beekeeper_name: segment.beekeeper_name,
    beekeeper_origin: segment.beekeeper_origin,
    case_year: segment.case_year,
    segment_order: segment.segment_order,
    from_location: segment.from_location,
    to_location: segment.to_location,
    from_lat: segment.from_lat,
    from_lng: segment.from_lng,
    to_lat: segment.to_lat,
    to_lng: segment.to_lng,
    start_date: segment.start_date,
    end_date: segment.end_date,
    start_month: segment.start_month,
    start_day: segment.start_day,
    end_month: segment.end_month,
    end_day: segment.end_day,
    stay_days: segment.stay_days,
    segment_km: segment.segment_km,
    cumulative_km: segment.cumulative_km,
    route_total_km: segment.route_total_km,
    nectar_sources: segment.nectar_sources,
    transport_mode: segment.transport_mode,
    data_source: segment.data_source,
  };
}

function makeSegmentId(segment) {
  return `${segment.route_name}-${segment.era}-${segment.segment_order}`.replace(/\s+/g, '-');
}

function pickRequestedWeatherYear(segment) {
  if (eraWeatherYear[segment.era]) return eraWeatherYear[segment.era];
  if (Number.isFinite(Number(segment.case_year))) return Number(segment.case_year);
  return 2024;
}

function indexWeather(rows) {
  const index = new Map();
  rows.forEach((row) => {
    const key = weatherKey(row.route_name, row.location);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(row);
  });
  return index;
}

function weatherKey(routeName, location) {
  return `${routeName}|||${location}`;
}

function findWeatherRows(segment, weatherIndex, requestedYear) {
  const rows = weatherIndex.get(weatherKey(segment.route_name, segment.to_location)) || [];
  if (!rows.length) return { rows: [], scope: 'missing', year: null };

  const startKey = monthDayKey(segment.start_date);
  const endKey = monthDayKey(segment.end_date);
  const sameYear = rows.filter((row) => getYear(row.date) === requestedYear);
  const strict = sameYear.filter((row) => monthDayKey(row.stay_start) === startKey && monthDayKey(row.stay_end) === endKey);
  if (strict.length) return { rows: strict.sort(sortByDate), scope: 'exact_stay_window', year: requestedYear };
  if (sameYear.length) return { rows: sameYear.sort(sortByDate), scope: 'same_route_location_year', year: requestedYear };

  const years = Array.from(new Set(rows.map((row) => getYear(row.date)))).sort((a, b) => Math.abs(a - requestedYear) - Math.abs(b - requestedYear));
  const fallbackYear = years[0];
  return {
    rows: rows.filter((row) => getYear(row.date) === fallbackYear).sort(sortByDate),
    scope: 'nearest_available_year',
    year: fallbackYear,
  };
}

function summarizeWeather(rows) {
  const stayRows = rows.filter((row) => Number(row.in_stay_period) === 1);
  const count = stayRows.length;
  if (!count) {
    return {
      weatherDayCount: 0,
      goodDays: 0,
      goodHoneyRate: '',
      avgNWI: '',
      avgTemp: '',
      rainDays: 0,
      maxPrecip: '',
      heatDays: 0,
      maxBadStreak: 0,
      climateRiskIndex: '',
      bufferBeforeDays: rows.filter((row) => Number(row.buffer_before) === 1).length,
      bufferAfterDays: rows.filter((row) => Number(row.buffer_after) === 1).length,
    };
  }

  const sum = (key) => stayRows.reduce((total, row) => total + numberOrZero(row[key]), 0);
  const goodDays = stayRows.filter((row) => Number(row.good_honey_day) === 1).length;
  const rainRows = stayRows.filter((row) => numberOrZero(row.precipitation_mm) > 0);
  const heatDays = stayRows.filter((row) => numberOrZero(row.temp_max_c) > 35).length;
  const maxBadStreak = Math.max(0, ...stayRows.map((row) => numberOrZero(row.bad_weather_streak)));
  const goodHoneyRate = goodDays / count;
  const climateRiskIndex = clamp(1 - goodHoneyRate + maxBadStreak / 12 + rainRows.length / count / 5 + heatDays / count / 4, 0, 1);

  return {
    weatherDayCount: count,
    goodDays,
    goodHoneyRate,
    avgNWI: sum('nectar_weather_index') / count,
    avgTemp: sum('temp_mean_c') / count,
    rainDays: rainRows.length,
    maxPrecip: Math.max(0, ...stayRows.map((row) => numberOrZero(row.precipitation_mm))),
    heatDays,
    maxBadStreak,
    climateRiskIndex,
    bufferBeforeDays: rows.filter((row) => Number(row.buffer_before) === 1).length,
    bufferAfterDays: rows.filter((row) => Number(row.buffer_after) === 1).length,
  };
}

function findFlowering(segment, floweringRows) {
  const tokens = normalizePlantTokens(segment.nectar_sources);
  const province = inferProvince(segment.to_location) || segment.to_location;
  const candidates = floweringRows.filter((row) => row.province === province);
  const scored = candidates
    .map((row) => {
      const plant = normalizePlantName(row.honey_plant);
      const nameScore = tokens.some((token) => plant.includes(token) || token.includes(plant)) ? 8 : 0;
      const overlapScore = monthOverlaps(row.start_month, row.end_month, segment.start_month, segment.end_month) ? 3 : 0;
      const sourceScore = row.source_category === '主要蜜源' ? 1 : 0;
      return { ...row, score: nameScore + overlapScore + sourceScore };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.start_month) - Number(b.start_month));

  return scored[0] || null;
}

function normalizePlantTokens(value) {
  return String(value || '')
    .split(/[\/、,，]/)
    .map(normalizePlantName)
    .filter(Boolean)
    .filter((token) => !['越冬繁殖', '越冬南返', '越冬'].includes(token));
}

function normalizePlantName(value) {
  return String(value || '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/甘蓝型/g, '')
    .replace(/二趟/g, '')
    .replace(/早熟|中熟|晚熟|早|中|晚/g, '')
    .trim();
}

function monthOverlaps(startA, endA, startB, endB) {
  const monthsA = expandMonthRange(startA, endA);
  const monthsB = expandMonthRange(startB, endB);
  return monthsA.some((month) => monthsB.includes(month));
}

function expandMonthRange(startMonth, endMonth) {
  const startIndex = monthSequence.indexOf(Number(startMonth));
  const endIndex = monthSequence.indexOf(Number(endMonth));
  if (startIndex === -1 || endIndex === -1) return [];
  if (startIndex <= endIndex) return monthSequence.slice(startIndex, endIndex + 1);
  return [...monthSequence.slice(startIndex), ...monthSequence.slice(0, endIndex + 1)];
}

function indexPollination(rows) {
  const index = new Map();
  rows.forEach((row) => {
    const province = inferProvince(row.region);
    if (!province) return;
    if (!index.has(province)) index.set(province, []);
    index.get(province).push(row);
  });
  return index;
}

function summarizePollination(location, pollinationIndex) {
  const cases = pollinationIndex.get(location) || [];
  if (!cases.length) {
    return {
      count: 0,
      crops: '',
      prices: '',
      note: '',
    };
  }

  return {
    count: cases.length,
    crops: unique(cases.map((row) => row.crop)).join(' / '),
    prices: unique(cases.map((row) => `${row.crop}:${row.rental_price_per_colony}元/群`)).join('；'),
    note: '按省域/地区名称匹配，非精确路段坐标',
  };
}

function inferProvince(region) {
  const value = String(region || '');
  const provinceNames = [
    '黑龙江',
    '内蒙古',
    '新疆',
    '广西',
    '宁夏',
    '西藏',
    '北京',
    '天津',
    '上海',
    '重庆',
    '河北',
    '山西',
    '辽宁',
    '吉林',
    '江苏',
    '浙江',
    '安徽',
    '福建',
    '江西',
    '山东',
    '河南',
    '湖北',
    '湖南',
    '广东',
    '海南',
    '四川',
    '贵州',
    '云南',
    '陕西',
    '甘肃',
    '青海',
  ];
  return provinceNames.find((province) => value.includes(province)) || '';
}

function indexClimate(rows) {
  const index = new Map();
  rows.forEach((row) => {
    if (!index.has(row['省份'])) index.set(row['省份'], []);
    index.get(row['省份']).push(row);
  });
  return index;
}

function summarizeClimate(location, climateIndex, requestedYear) {
  const rows = climateIndex.get(location) || [];
  if (!rows.length || requestedYear < 2000) {
    return {
      year: '',
      springTemp: '',
      heatDays: '',
      rainstormDays: '',
      floweringAdvanceDays: '',
      source: '',
    };
  }

  const selected =
    rows
      .filter((row) => Number(row['年份']) <= Math.min(requestedYear, 2023))
      .sort((a, b) => Number(b['年份']) - Number(a['年份']))[0] ||
    rows.slice().sort((a, b) => Math.abs(Number(a['年份']) - requestedYear) - Math.abs(Number(b['年份']) - requestedYear))[0];

  return {
    year: selected?.['年份'] ?? '',
    springTemp: selected?.['春季均温(°C)'] ?? '',
    heatDays: selected?.['高温日数(≥35°C)'] ?? '',
    rainstormDays: selected?.['暴雨日数(≥50mm)'] ?? '',
    floweringAdvanceDays: selected?.['花期提前(天)'] ?? '',
    source: selected?.['数据来源'] ?? '',
  };
}

function inferRouteMode(segment) {
  if (segment.route_type === 'variant') return '小转地/区域转地';
  if (segment.route_type === 'beekeeper_case') return '蜂农个案参考';
  return '大转地';
}

function buildDataNotes(weatherMatch, pollinationSummary, climateSummary, segment) {
  const notes = [];
  if (weatherMatch.scope === 'missing') notes.push('该路段暂无逐日天气匹配');
  if (weatherMatch.scope === 'nearest_available_year') notes.push(`逐日天气使用邻近可用年份 ${weatherMatch.year}`);
  if (pollinationSummary.count > 0) notes.push('授粉信息为省域/地区案例匹配，不代表路段合同');
  if (!climateSummary.year && Number(pickRequestedWeatherYear(segment)) < 2000) notes.push('省域气候年度数据从 2000 年开始，1980s 不做省域气候趋势判断');
  return notes;
}

function getYear(dateString) {
  return Number(String(dateString || '').slice(0, 4));
}

function monthDayKey(dateString) {
  const match = String(dateString || '').match(/\d{4}-(\d{2})-(\d{2})/);
  return match ? `${Number(match[1])}-${Number(match[2])}` : '';
}

function sortByDate(a, b) {
  return String(a.date).localeCompare(String(b.date));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatDecimal(value, digits) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return '';
  return Number(value).toFixed(digits);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function readCsv(filePath) {
  return parseCsv(await fs.readFile(filePath, 'utf8'));
}

async function readFloweringCsv(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const rawRows = parseCsvRows(text);
  const [rawHeaders, ...body] = rawRows;
  const headers = (rawHeaders || []).map((header) => header.replace(/^\uFEFF/, ''));

  return body.map((row) => {
    const repaired = row.length > headers.length ? repairFloweringRow(row) : row;
    const record = {};
    headers.forEach((header, index) => {
      record[header] = repaired[index] ?? '';
    });
    return record;
  });
}

function repairFloweringRow(row) {
  const fixedPrefix = row.slice(0, 9);
  const fixedSuffix = row.slice(-4);
  const floweringMonths = row.slice(9, row.length - 4).join(',');
  return [...fixedPrefix, floweringMonths, ...fixedSuffix];
}

function parseCsv(csvText) {
  const rows = parseCsvRows(csvText);
  const [rawHeaders, ...body] = rows;
  const headers = (rawHeaders || []).map((header) => header.replace(/^\uFEFF/, ''));
  return body.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? '';
    });
    return record;
  });
}

function parseCsvRows(csvText) {
  const rows = [];
  let current = [];
  let field = '';
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      current.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      current.push(field);
      field = '';
      if (current.some((value) => value !== '')) rows.push(current);
      current = [];
    } else {
      field += char;
    }
  }

  if (field || current.length) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

function stringifyCsv(rows, orderedHeaders) {
  return [
    orderedHeaders.join(','),
    ...rows.map((row) => orderedHeaders.map((header) => csvCell(row[header])).join(',')),
  ].join('\n');
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
