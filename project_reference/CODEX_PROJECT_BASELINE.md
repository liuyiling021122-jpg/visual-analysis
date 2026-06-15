# Codex Project Baseline

Current design baseline: `VISUAL_DESIGN_PROPOSAL_v2_latest.md`.

Previous design proposal retained for reference: `VISUAL_DESIGN_PROPOSAL_v2.md`.

`VISUAL_DESIGN_PROPOSAL_v2_latest.md` was imported from `VISUAL_DESIGN_PROPOSAL_v2(1).md`. Its content currently matches the previous v2 proposal, so no design conflicts were found during comparison. If a future imported proposal differs, use the newest imported proposal where conflicts exist.

Detailed central-view spec: `ROUTE_RHYTHM_VIEW_SPEC.md`.

Use `ROUTE_RHYTHM_VIEW_SPEC.md` as the authoritative implementation reference for the central `RouteRhythmView`. It refines, but does not replace, the full three-view structure in `VISUAL_DESIGN_PROPOSAL_v2.md`.

Map visualization reference: `L7_MAP_VISUALIZATION_REFERENCE.md`.

AntV L7 is available locally as a reference library under `libraries/L7-master/`. It is not a Codex skill. Use it as a reference, and later as a frontend dependency, for map information visualization such as province heat maps, route lines, node distributions, flow lines, and beekeeper route maps.

Visual style baseline: `zhuihua_visual_spec_light_editorial.md`.

Use `zhuihua_visual_spec_light_editorial.md` as the authoritative visual design spec for all future interface, chart, and component styling unless the user provides a newer visual spec.

Current data baseline:
- Source archive copied as `bee_data.zip`.
- Extracted data directory: `data/养蜂数据/`.
- Main cleaned tables: `data/养蜂数据/datasets/`.
- Integrated real data: `data/养蜂数据/综合数据/真实数据.csv`.
- Integrated simulated data: `data/养蜂数据/综合数据/模拟数据.csv`.
- CSV inventory: `data_inventory.json`.

## Core Direction

The project should be produced around this central argument:

> 花期不等于有效采蜜期，有蜜源不等于有收益。中国流动养蜂人的路线选择，是花期预期、天气窗口、运输成本与市场价格四方博弈的结果。

## Required View Structure

Use the v2 three-view structure unless the user provides an updated design:

1. Route map as an entry/selector, not the primary analytic view.
2. Central path rhythm matrix as the primary view.
3. Livelihood risk interpretation panel as economic and causal support.

For the route map/selector and spatial context layers, reference L7 patterns:

- `PointLayer` for route nodes, apiary points, and pollination case markers.
- `LineLayer` for migration segments, arcs, flow lines, and direction arrows.
- `PolygonLayer` for province choropleth/heat maps.
- `HeatmapLayer` for spatial density, grid, or hexbin layers.

Do not let map effects overtake the main analytic hierarchy: the central `RouteRhythmView` remains the primary view.

## Visual Design Rules

Follow the light editorial infographic style:

- Use warm paper backgrounds, not pure white or dark backgrounds: `#F7F6F2`, `#F9F8F4`, `#F3F1EB`, `#FBFAF6`.
- Keep the interface high-whitespace, fine-lined, low-saturation, and print/editorial in tone.
- Use warm orange as the main story color: `#D88C52`, `#E5A56F`, `#F3DEC2`.
- Use light cyan-blue for weather and secondary comparison layers: `#8DBFC1`, `#A9D0D0`, `#CFE3E1`.
- Use soft terracotta for risk: `#B96C54`; avoid bright red.
- Do not use pure black text; use `#2F2A26` and warm gray text tones.
- Use serif display typography for main titles and sans-serif text for body, axes, legends, and annotations.
- Prefer thin paths, arcs, layered bands, small dots, rings, and annotation leader lines.
- Make charts feel like newspaper/editorial infographics, not a SaaS dashboard.
- Keep cards and tooltips light: subtle borders, small radius, minimal shadow.
- Enable tabular numerals for dates, metrics, labels, and axis values.
- Hover interactions should be subtle: opacity, stroke width, and slight node scaling only.

Implementation note: the visual spec includes a negative display letter-spacing token. The active frontend rule for this project is stricter: use `letter-spacing: 0` instead of negative letter spacing while preserving the editorial serif-title feel.

## P0 Implementation Loop

Prioritize a complete MVP loop:

1. Select a route on the small map.
2. Refresh the central path rhythm matrix.
3. Show route nodes, flowering windows, stay windows, and weather window metrics.
4. Click a node to show tooltip/detail weather information.
5. Update the risk/profit panel with the corresponding beekeeping mode.

For the central view, the P0 loop must satisfy the `ROUTE_RHYTHM_VIEW_SPEC.md` checklist:

- Select `东线（沿海线）` and render 8 route nodes with path links.
- Correctly align flowering bars, stay windows, and NWI weather strips.
- Hover `山东 · 刺槐` to show a tooltip with valid honey-day rate, average NWI, bad-streak, rain-day, risk, and profit reference metrics.
- Click `山东 · 刺槐` to expand the Weather Detail Panel with daily weather cards.
- Keep the default layers on: route, flowering, weather.
- Keep advanced layers off by default: risk, buffer, pollination, profit label.

## Core Tables

- `data_migration_routes_detailed.csv`: route segments, locations, dates, stay days, nectar sources, coordinates.
- `weather_daily_migration_routes.csv`: daily route weather, `good_honey_day`, `nectar_weather_index`, `bad_weather_streak`, buffers.
- `flowering_calendar_by_province.csv`: province-level flowering windows, peak months, honey grade, nectar yield.
- `beekeeper_profit_by_mode.csv`: income/cost/profit by beekeeping mode.
- `beekeeper_finance_detail.csv`: income and cost structure.
- `pesticide_use_2000_2023.csv`, `pollination_service_market.csv`, and `fruit_data_merged.csv`: supporting/context layers only.

## Central View Implementation Rules

- `RouteRhythmView` is a two-dimensional path rhythm matrix, not a map and not a traditional Gantt chart.
- X axis maps dates/months; Y axis maps route locations sorted by `to_lat` from south to north.
- Each `RouteNode` is a fixed-height rectangle whose X span comes from `stay_start` to `stay_end`.
- Use route arrows/links to connect adjacent `segment_order` nodes.
- Default node surface must show location, nectar source, stay days, and segment order.
- Flowering layer shows theory: flowering window, peak month, honey grade, and nectar yield.
- Weather layer shows reality: daily `nectar_weather_index`, `good_honey_day`, precipitation marks, `avgNWI`, and `goodHoneyRate`.
- Hover state dims unrelated nodes and shows a summary tooltip.
- Click state selects the node and opens the Weather Detail Panel; clicking again collapses it.
- Pollination and pesticide information must remain clearly marked as limited/contextual unless better data is provided.

## Required Preprocessing

Before implementing `RouteRhythmView`, generate or maintain a route-segment summary table equivalent to `route_segment_summary.csv`, with one row per route segment. It should include route fields, flowering matches, weather aggregates, and risk metrics:

- Route fields: `route_name`, `segment_order`, `location`, `nectar_sources`, `stay_start`, `stay_end`, `stay_days`, `to_lat`.
- Flowering fields: `flower_start_month`, `flower_end_month`, `flower_peak_month`, `honey_grade`, `nectar_yield`.
- Weather aggregates: `goodHoneyRate`, `avgNWI`, `maxBadStreak`, `rainDays`, `heatDays`, `climateRiskIndex`.

Use a plant alias/matching layer for cases such as `刺槐（二趟） -> 刺槐` and `甘蓝型油菜/紫云英 -> 油菜` plus `紫云英`.

## Repository/HTML Structure Rule

When building the HTML system, keep the large system page modular. Split visualization components by role/file type so that later edits can target individual subpages/components. Include a `README.md` with environment dependencies, startup commands, and data loading instructions.

## Data Caveats

- Simulated `sim_*` data supports trend, distribution, and interaction scenarios; do not present it as precise official statistics.
- Pollination data is case-level and limited; avoid precise spatial overlays unless new data is provided.
- Pesticide data is national annual data only; use as a panel trend/reference, not route-level risk.
- Finance data after 2017 includes inferred values; label appropriately when used in explanatory text.
- 2025 values include estimates and should not be treated as final statistics.

## Update Rule

If the user provides a newer design proposal or describes design changes, treat that newer instruction as authoritative and update this baseline before continuing production work.
