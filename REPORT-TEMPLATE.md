# LandBook Report Template

18-section editorial report. Each section = one A4 page.
Design: Libre Baskerville (serif display) + Inter (body). Sharp edges, hairline dividers, terracotta accents.

---

## Sections

### 0. Cover
- Property name, address, coordinates
- Area (ha), estimated value, Natural Capital Score
- Satellite map (Mapbox static, grayscale)
- 3 mini gauges: water security, fire risk, energy potential

### 1. Executive Summary
- **Data:** area, value/ha, bio score, water security, carbon stock
- **Chart:** horizontal bar — 5 natural capital dimensions vs regional avg
- **AI text:** drop-cap intro (2-3 para), pull quote

### 2. Ecosystem Services
- **Data:** annual ecosystem value (total + 6 categories), 30yr NPV
- **Chart:** stacked bar — Carbon / Water / Habitat split
- **AI text:** drop-cap intro explaining SEEA-EA valuation

### 3. Natural Capital Scorecard
- **Data:** 5 scores (carbon, biodiversity, water, soil, pollination) + regional averages
- **Chart:** radar chart — property vs regional baseline
- **AI text:** narrative interpreting strengths/weaknesses

### 4. Terrain & Soil
- **Data:** elevation, slope, aspect, geology (lithology, period, age), soil (pH, organic carbon, clay, sand, silt, nitrogen, CEC, bulk density, WRB class)
- **AI text:** drop-cap landscape description

### 5. Water
- **Data:** spring/well/waterway/water body counts, annual rainfall, water security index (0-10), flood discharge + risk level
- **AI text:** drop-cap water narrative, pull quote

### 6. Climate
- **Data:** 30yr monthly normals (avg high, avg low, precip), annual mean temp, summer/winter means, frost days, growing season, climate zone
- **Chart:** monthly climate chart (rainfall bars + temperature line)
- **AI text:** climate profile narrative

### 7. Biodiversity
- **Data:** total species count (iNaturalist 15km), species by group, top 10 species (name, scientific, photo), GBIF occurrences + kingdoms, threatened count, trend direction
- **Chart:** species bar chart by taxonomic group
- **AI text:** drop-cap biodiversity intro

### 8. Agriculture
- **Data:** land cover type, yield models by production system (cork, olive, vineyard, forest, pasture), revenue ranges + timelines
- **AI text:** agricultural potential narrative

### 9. Opportunities
- **Data:** 3 revenue scenarios (conservative/moderate/optimized), carbon credit potential, investment costs
- **AI text:** scenario comparison narrative

### 10. Risks
- **Data:** fire/flood/drought scores (0-5), active fire detections (count, FRP), 10yr fire history by year, seasonal risk calendar
- **Chart:** risk bar chart (3 bars, 0-5 scale)
- **AI text:** risk narrative + mitigation priorities

### 11. Resilience
- **Data:** energy potential by source (solar, wind, micro-hydro, biomass) — resource level + feasibility
- **Chart:** energy bar chart
- **AI text:** energy independence narrative

### 12. Regional Context
- **Data:** protected areas (Natura 2000 + OSM), percentile rankings vs region, bioregion comparisons (slope, tree cover, water, solar)
- **Chart:** percentile chart (5 dimensions)
- **AI text:** multi-scale context narrative

### 13. Change Over Time
- **Data:** 50yr climate trends (temp/decade, precip/decade), fire-prone days by decade, biodiversity trends (3 windows), 30yr NPV scenarios (4 scenarios)
- **AI text:** temporal dynamics narrative

### 14. Map Portfolio
- 4 Mapbox static maps with GeoJSON boundary: overview (z8), regional (z10), detail (z14), satellite (z15)

### 15. Compliance
- **Data:** regulatory checklist (SEEA-EA, geolocation, environmental reporting), timeline 2024-2030
- **AI text:** regulatory framework narrative
- *Note: all hardcoded/synthetic — no live regulatory API*

### 16. Next Steps
- **Data:** action items by timeframe (immediate/short/long) with cost estimates
- **AI text:** invitation framing narrative
- *Note: actions derived from scores, not from APIs*

### 17. Methodology & Sources
- **Data:** source table (API name, resolution)
- **AI text:** methodology explanation + disclaimer

---

## Where the data comes from

| API | What it provides | Feeds sections |
|-----|-----------------|----------------|
| Open-Meteo Elevation | elevation (m) | 0, 1, 4 |
| Open-Meteo Forecast | 7-day temps, precip, wind, UV | 6, 10 |
| Open-Meteo Archive (30yr) | monthly normals | 1, 6 |
| Open-Meteo Archive (50yr) | temp/precip trends, fire-prone days | 13 |
| SoilGrids | pH, OC, clay, sand, N, CEC, bulk density, WRB class | 4 |
| Macrostrat | lithology, environment, period, age | 4 |
| iNaturalist | species counts by taxa, threatened, yearly trends | 7, 13 |
| GBIF | occurrence count, kingdom breakdown, yearly trends | 7, 13 |
| GloFAS / Open-Meteo Flood | river discharge, flood risk | 5, 10 |
| Overpass / OSM | water features, infrastructure, protected areas | 5, 9, 12 |
| Natura 2000 | protected site names, designations | 12 |
| NASA FIRMS | fire detections (active + 10yr archive) | 10, 13 |
| DGT COS 2018 | land cover class (Portugal) | 8 |
| CORINE 2018 | land cover class (Europe fallback) | 8 |
| Mapbox Static | satellite/topo map images with boundary | 0, 1, 14 |
| Mapbox Geocoding | address, place name | 0, 1 |
| IPMA | 5-day Portugal-specific forecast | 6 |
| Nominatim | reverse geocode fallback | 0, 1 |

### Computed (not from APIs)

| Calculation | Source lib | Feeds sections |
|-------------|-----------|----------------|
| Natural capital scores (0-100) | `report-scores.js` | 1, 3, 12 |
| Ecosystem service values (€) | `report-scores.js` | 2 |
| Revenue scenarios | `report-scores.js` | 9 |
| Risk profile (0-5) | `report-scores.js` | 10 |
| Carbon stock (tCO2e) | `report-scores.js` | 0, 1, 9 |
| Market valuation (€) | `report-scores.js` | 0, 1, 2, 13 |
| Energy potential levels | derived from terrain + land cover | 11 |
| Percentile rankings | scores normalized to regional baseline | 12 |
| Action items + costs | derived from scores + risk profile | 16 |

### AI-generated text

| Section | What Claude writes | Input context |
|---------|-------------------|---------------|
| 1 | Executive intro + pull quote | all KPIs, location, scores |
| 2 | Services explanation | TEEB values, land cover |
| 3 | Scorecard interpretation | 5 scores + regional avgs |
| 4 | Landscape description | elevation, geology, soil |
| 5 | Water assessment + pull quote | features, rainfall, index |
| 6 | Climate profile | normals, growing season |
| 7 | Biodiversity intro | species count, trends |
| 8 | Agriculture potential | land cover, yields |
| 9 | Scenario comparison | revenue scenarios |
| 10 | Risk analysis | fire/flood/drought scores |
| 11 | Resilience assessment | energy sources |
| 12 | Regional context | protected areas, percentiles |
| 13 | Temporal dynamics | trends, projections |
| 15 | Regulatory framework | compliance status |
| 16 | Next steps framing | action items |
| 17 | Methodology + disclaimer | source list |
