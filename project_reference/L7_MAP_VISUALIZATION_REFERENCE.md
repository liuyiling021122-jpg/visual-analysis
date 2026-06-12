# L7 Map Visualization Reference

L7 is not a Codex skill. It is an AntV WebGL geospatial visualization library that can be used as a reference, and later as a frontend dependency, for map information visualization.

Local reference source:

- `libraries/L7-master/`
- Downloaded from: `https://github.com/antvis/L7`
- API reference file: `libraries/L7-master/L7_API_Reference.md`
- Main README: `libraries/L7-master/README.md`

## When To Reference L7

Use L7 patterns for the project's map selector and spatial context views, especially:

- Province heat maps for bee colony scale, honey output, nectar-source intensity, or climate/weather risk.
- Migration route lines, arcs, flow lines, and direction arrows.
- Beekeeper route maps with ordered stop points.
- Point distributions for apiary locations, route nodes, pollination cases, or nectar-source places.
- Layered maps combining polygon fills, route lines, and node markers.
- Optional heatmap/grid/hexbin views when point density matters.

## Relevant L7 Concepts

- `Scene`: map scene container and layer manager.
- `PointLayer`: route node markers, apiary points, pollination case points.
- `LineLayer`: migration segments, arcs, flow lines, direction arrows.
- `PolygonLayer`: province fills and choropleth maps.
- `HeatmapLayer`: heat, grid, hexagon, or density-style spatial layers.
- `@antv/l7-maps`: map wrappers such as `GaodeMap`, `Mapbox`, and `MapLibre`.

## Likely Frontend Dependency

When a frontend app is created, install L7 through npm rather than copying source code from the reference folder:

```bash
npm install @antv/l7 @antv/l7-maps
```

For a China-focused project, prefer a China-compatible map setup. If using Gaode/AMap tiles, check key and network requirements before implementation. If no map key is available, use mapless SVG/canvas geography or a static GeoJSON-based fallback for the MVP.

## Project-Specific Mapping

Potential data-to-layer mappings:

- `data_migration_routes_detailed.csv`
  - `from_lng/from_lat -> to_lng/to_lat`: `LineLayer`
  - `to_lng/to_lat`: `PointLayer`
  - `route_type`: line color
  - `segment_order`: label/order marker
  - `stay_days`: marker size or line emphasis

- `beekeeper_province_annual_series.csv`, `colonies_1961_2025.csv`
  - province-level values: `PolygonLayer` choropleth after joining to China province GeoJSON.

- `weather_daily_migration_routes.csv` aggregated by route segment
  - `goodHoneyRate`, `avgNWI`, `climateRiskIndex`: route/node color, opacity, or warning symbol.

- `pollination_service_market.csv`
  - case-level point or tooltip only; data is not precise enough for route-level spatial claims.

## Boundary

The project's primary analytic view remains `RouteRhythmView`, not the map. L7 should support the left-side route map/selector and spatial context layers. Do not let map spectacle replace the path rhythm matrix specified in `ROUTE_RHYTHM_VIEW_SPEC.md`.
