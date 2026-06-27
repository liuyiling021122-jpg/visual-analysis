const DATA_ROOT = 'project_reference/data/养蜂数据/datasets';
const DERIVED_ROOT = 'project_reference/data/derived';

export const dataFiles = {
  chinaBoundary: 'project_reference/data/china_l7_boundary_2025.json',
  routeSegmentSummary: `${DERIVED_ROOT}/route_segment_summary.csv`,
  routeSegments: `${DATA_ROOT}/data_migration_routes_detailed.csv`,
  floweringCalendar: `${DATA_ROOT}/flowering_calendar_by_province.csv`,
  provinceNectarDistribution: `${DATA_ROOT}/province_nectar_distribution.csv`,
  nectarLocationCenters: `${DERIVED_ROOT}/nectar_location_centers.json`,
  weatherDaily: `${DATA_ROOT}/weather_daily_migration_routes.csv`,
  profitByMode: `${DATA_ROOT}/beekeeper_profit_by_mode.csv`,
  finance: `${DATA_ROOT}/beekeeper_finance_detail.csv`,
  industryLatest: `${DATA_ROOT}/china_bee_industry_latest.csv`,
  beeProductAnnual: `${DATA_ROOT}/bee_product_national_annual.csv`,
  pesticide: `${DATA_ROOT}/pesticide_use_2000_2023.csv`,
  pollination: `${DATA_ROOT}/pollination_service_market.csv`,
  climateFactors: `${DATA_ROOT}/climate_factors_province_2000_2023.csv`,
  provinceAnnual: `${DATA_ROOT}/beekeeper_province_annual_series.csv`,
};

export async function loadCsv(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Cannot load data file: ${path}`);
  }

  return parseCsv(await response.text());
}

export async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Cannot load data file: ${path}`);
  }

  return response.json();
}

export async function loadLivelihoodData() {
  const [profitByMode, finance, beeProductAnnual, pesticide, routeSegmentSummary, climateFactors, provinceAnnual, weatherDaily] = await Promise.all([
    loadCsv(dataFiles.profitByMode),
    loadCsv(dataFiles.finance),
    loadCsv(dataFiles.beeProductAnnual),
    loadCsv(dataFiles.pesticide),
    loadCsv(dataFiles.routeSegmentSummary),
    loadCsv(dataFiles.climateFactors),
    loadCsv(dataFiles.provinceAnnual),
    loadCsv(dataFiles.weatherDaily),
  ]);

  return { profitByMode, finance, beeProductAnnual, pesticide, routeSegmentSummary, climateFactors, provinceAnnual, weatherDaily };
}

export async function loadMigrationRoutes() {
  return loadCsv(dataFiles.routeSegments);
}

export async function loadRouteRhythmData() {
  const [routeSegments, routeSegmentSummary, floweringCalendar, weatherDaily, profitByMode, pollination, climateFactors] = await Promise.all([
    loadCsv(dataFiles.routeSegments),
    loadCsv(dataFiles.routeSegmentSummary),
    loadCsv(dataFiles.floweringCalendar),
    loadCsv(dataFiles.weatherDaily),
    loadCsv(dataFiles.profitByMode),
    loadCsv(dataFiles.pollination),
    loadCsv(dataFiles.climateFactors),
  ]);

  return { routeSegments, routeSegmentSummary, floweringCalendar, weatherDaily, profitByMode, pollination, climateFactors };
}

function parseCsv(csvText) {
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
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      current.push(field);
      field = '';
      if (current.some((value) => value !== '')) {
        rows.push(current);
      }
      current = [];
    } else {
      field += char;
    }
  }

  if (field || current.length) {
    current.push(field);
    rows.push(current);
  }

  const [rawHeaders, ...body] = rows;
  const headers = uniquifyHeaders(rawHeaders || []);

  return body.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = normalizeValue(row[index]);
    });
    return record;
  });
}

function uniquifyHeaders(headers) {
  const seen = new Map();
  return headers.map((header) => {
    const cleanHeader = header.replace(/^\uFEFF/, '');
    const count = seen.get(cleanHeader) || 0;
    seen.set(cleanHeader, count + 1);
    return count === 0 ? cleanHeader : `${cleanHeader}_${count + 1}`;
  });
}

function normalizeValue(value = '') {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return numeric;
  }

  return trimmed;
}
