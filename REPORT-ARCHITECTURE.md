# LandBook Report — Template Architecture

> Single source of truth for the 18-section editorial report template.
> Maps every data slot to its API source and marks where AI-generated narrative is needed.

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#012d1d` | Headlines, big numbers, serif display |
| Primary Container | `#1B4332` | Dark panels, cover bg, quote blocks |
| Terracotta | `#E07A5F` | Accent borders, pull quote rules, trend arrows |
| Surface | `#FAFAF9` | Page background (warm off-white) |
| Outline Variant | `#c1c8c2` | Hairline dividers (0.5pt) |
| On-Surface | `#151c27` | Body text |
| Secondary | `#585f6c` | Muted labels |
| Outline | `#717973` | Uppercase micro-labels |
| Headline font | `Inter` | Labels, body, KPIs |
| Serif font | `Libre Baskerville` | Display titles, pull quotes, big numbers |
| Page size | A4 (210mm x 297mm) | 24mm padding |
| Border radius | `0px` | Sharp editorial edges throughout |

---

## Current State

### Generators

| File | Sections | Notes |
|------|----------|-------|
| `api/reports/generate.js` → `buildHTML()` (line 1838) | 14 | Production. ~22 API calls. Inter-only card style. |
| `api/reports/generate-full.js` → `buildFullHTML()` (line 1389) | 18 | ~33 API calls. Synthetic data with red badges. |
| `src/pages/landbook-report.js` | 18 | Client-side. Crimson Text + Inter. Closest to editorial target. |

### Viewers

| File | Purpose |
|------|---------|
| `src/pages/report.js` | Public shared viewer (fetches blob URL) |
| `src/pages/report-preview.js` | Preview with version dropdown |
| `src/pages/landbook-report.js` | Self-contained: fetches data AND renders |

### Shared libs

| File | Exports |
|------|---------|
| `src/lib/report-scores.js` | `computeAllScores`, `computeEcosystemServices`, `computeRevenueScenarios`, `computeRiskProfile` |
| `src/lib/report-charts.js` | `horizontalBarChart`, `stackedBarChart`, `radarChart`, `monthlyClimateChart`, `riskBarChart`, `speciesBarChart`, `percentileChart`, `energyBarChart` |

---

## 18-Section Template Map

Each section = one A4 page. Columns below:
- **DATA** = dynamic values from APIs or computed scores
- **AI** = slots where Claude generates narrative text at report-build time
- **VIZ** = charts or visual elements
- **LAYOUT** = design pattern from editorial mockups

---

### Section 0 — Cover

| | |
|---|---|
| **DATA** | Property name (geocode), address (Mapbox/Nominatim), coordinates, area (polygon calc), estimated value (computed), Natural Capital Score (computed), satellite image (Mapbox static) |
| **AI** | None |
| **VIZ** | Full-bleed satellite background (grayscale, 80% opacity) |
| **LAYOUT** | Serif italic title (`28pt`), location line top-right, KPI strip at bottom (4 columns: area, valuation/ha, asset value, carbon storage), dark panel with pull quote, NCS big number with 3 mini gauges (water security, fire risk, energy potential) |

**Data paths:**
```
property.name          → Mapbox reverse geocode → place_name
property.coords        → submission.center [lat, lng]
property.area          → geo.sqmToHectares(submission.area)
property.value         → reportScores.marketValue (synthetic: base €22k/ha + modifiers)
property.ncs           → reportScores.naturalCapitalScore (0-10)
maps.satellite         → Mapbox static API, style satellite-v9, 700x440
gauges.waterSecurity   → reportScores.waterScore (0-10)
gauges.fireRisk        → reportScores.fireRisk (0-5)
gauges.energyPotential → reportScores.energyScore (0-10)
```

---

### Section 1 — Executive Summary

| | |
|---|---|
| **DATA** | Total area, value/ha, bio score, water security, carbon stock (tCO2e), natural capital dimensions (5 scores + regional averages) |
| **AI** | **Drop-cap intro** (2-3 paragraphs): property positioning within bioregion, key strengths, investment profile. **Pull quote** (1 sentence): aspirational stewardship statement. |
| **VIZ** | Horizontal bar chart — 5 natural capital dimensions (Carbon Storage, Biodiversity, Water Regulation, Soil Health, Pollination) with percentile badges |
| **LAYOUT** | Top band: serif title + location. Middle: bioregion + 15-min radius panels. Satellite map (2/3) + dark quote panel (1/3). 4-column KPI strip. 3-column editorial text with drop-cap. |

**Data paths:**
```
kpi.area               → geo.sqmToHectares(submission.area)
kpi.valuePerHa         → reportScores.marketValue / area
kpi.bioScore           → reportScores.bioScore (0-10)
kpi.waterSecurity      → reportScores.waterScore (0-10)
kpi.carbonStock        → reportScores.carbonStock (tCO2e)
chart.dimensions[]     → reportScores.naturalCapital { carbon, biodiversity, water, soil, pollination }
chart.regionalAvg[]    → reportScores.regionalBaseline { carbon, biodiversity, water, soil, pollination }
location.bioregion     → derived from municipality + land cover
location.fifteenMin    → nearest town (Overpass or geocode)
```

**AI context for generation:**
```json
{
  "prompt_type": "executive_summary",
  "inputs": ["property.name", "location", "area", "all KPI values", "top 2 strengths", "top 1 weakness"],
  "tone": "Authoritative editorial. Like a Financial Times property assessment.",
  "length": "2-3 paragraphs, ~150 words",
  "format": "First paragraph gets drop-cap. Third paragraph ends with terracotta-bordered pull quote."
}
```

---

### Section 2 — Ecosystem Services

| | |
|---|---|
| **DATA** | TEEB annual value (total + 6 categories), 30yr NPV, service breakdown by beneficiary |
| **AI** | **Drop-cap intro** (2 paragraphs): explain what ecosystem services are, reference SEEA-EA methodology, frame the valuation. |
| **VIZ** | Stacked horizontal bar (Carbon 45%, Water 35%, Habitat 20%), service table with annual values |
| **LAYOUT** | Centered serif italic title (`28pt`). Big number (total value, `58pt`). Stacked bar + legend. Narrative in 60/40 split with pull quote right. |

**Data paths:**
```
total.annualValue      → computeEcosystemServices(area, landCover).total
breakdown.water        → ecosystemServices.provisioning.water
breakdown.food         → ecosystemServices.provisioning.food
breakdown.carbon       → ecosystemServices.regulating.climate
breakdown.regulation   → ecosystemServices.regulating.erosion
breakdown.soil         → ecosystemServices.supporting.nutrientCycling
breakdown.cultural     → ecosystemServices.cultural.recreation
npv.thirtyYear         → ecosystemServices.total * NPV_factor(30yr, discount_rate)
```

**AI context:**
```json
{
  "prompt_type": "ecosystem_services",
  "inputs": ["total annual value", "top 2 services by value", "land cover type", "area"],
  "tone": "Explanatory, accessible. Like a well-written prospectus.",
  "length": "2 paragraphs, ~120 words"
}
```

---

### Section 3 — Natural Capital Scorecard

| | |
|---|---|
| **DATA** | 5 dimension scores (0-100) vs regional averages, differences |
| **AI** | **Narrative** (2 paragraphs): interpret the radar chart, highlight strongest/weakest dimensions, compare to regional baseline. |
| **VIZ** | Radar chart (5 axes, property solid line vs regional dashed), scorecard table (dimension / score / regional avg / difference) |
| **LAYOUT** | Centered radar chart. Table below. Narrative in 2 columns beneath. |

**Data paths:**
```
scores.carbon          → computeAllScores().carbonScore
scores.biodiversity    → computeAllScores().bioScore
scores.water           → computeAllScores().waterScore
scores.soil            → computeAllScores().soilScore
scores.pollination     → computeAllScores().pollinationScore
regional.carbon        → computeAllScores().regionalBaseline.carbon
regional.biodiversity  → computeAllScores().regionalBaseline.biodiversity
regional.water         → computeAllScores().regionalBaseline.water
regional.soil          → computeAllScores().regionalBaseline.soil
regional.pollination   → computeAllScores().regionalBaseline.pollination
```

---

### Section 4 — Terrain & Soil

| | |
|---|---|
| **DATA** | Elevation, slope, aspect, geology (lithology, environment, period, age), soil properties (pH, OC, clay, sand, silt, N, CEC, bulk density), WRB classification |
| **AI** | **Drop-cap landscape description** (2 paragraphs): physical character of the land, what the geology means for use, soil quality interpretation. |
| **VIZ** | Soil property cards or table, geology summary |
| **LAYOUT** | 60/40 split: narrative + color swatches left, spatial context image + pull quote right. |

**Data paths:**
```
terrain.elevation      → Open-Meteo Elevation API → elevation (m)
terrain.slope          → derived from multi-point elevation profile
terrain.aspect         → derived from elevation grid

soil.ph                → SoilGrids /properties/query → phh2o, 0-5cm mean
soil.organicCarbon     → SoilGrids → ocd, 0-5cm mean (g/kg)
soil.clay              → SoilGrids → clay, 0-5cm mean (%)
soil.sand              → SoilGrids → sand, 0-5cm mean (%)
soil.silt              → derived (100 - clay - sand)
soil.nitrogen          → SoilGrids → nitrogen, 0-5cm mean (g/kg)
soil.cec               → SoilGrids → cec, 0-5cm mean (cmol/kg)
soil.bulkDensity       → SoilGrids → bdod, 0-5cm mean (kg/dm³)
soil.classification    → SoilGrids /classification/query → wrb_class_name

geology.lithology      → Macrostrat /geologic_units/map → lith.name
geology.environment    → Macrostrat → environ.name
geology.period         → Macrostrat → t_int_name (period name)
geology.age            → Macrostrat → t_int_age (Ma)
```

---

### Section 5 — Water

| | |
|---|---|
| **DATA** | Water features inventory (springs, wells, waterways, water bodies from Overpass), annual rainfall, water security index (0-10), flood discharge (GloFAS) |
| **AI** | **Drop-cap water narrative** (2 paragraphs): water security assessment, feature inventory context, drought resilience. **Pull quote** about water as defining resource. |
| **VIZ** | Big metric (water security index), feature count cards |
| **LAYOUT** | Icon + big percentage number left column, narrative + trend badge right. Terracotta border-left on recommendation callout. |

**Data paths:**
```
water.springs          → Overpass query → natural=spring (count)
water.wells            → Overpass → man_made=water_well (count)
water.waterways        → Overpass → waterway=* (count)
water.waterBodies      → Overpass → natural=water (count)
water.annualRainfall   → Open-Meteo Archive → 30yr sum / 30 (mm/year)
water.securityIndex    → computeAllScores().waterScore (0-10)
water.floodDischarge   → GloFAS flood API → river_discharge (m³/s)
water.floodRisk        → analyzeFloodRisk() → level (Low/Moderate/High)
```

---

### Section 6 — Climate

| | |
|---|---|
| **DATA** | 30yr monthly normals (avg high, avg low, total precip per month), annual mean temp, summer/winter means, frost days, growing season length, climate zone |
| **AI** | **Climate profile narrative** (2 paragraphs): characterize the climate, growing season implications, microclimate notes. |
| **VIZ** | Monthly climate chart (rainfall bars + temperature line, 12 months), KPI cards (annual temp, rainfall, frost days, growing season) |
| **LAYOUT** | Full-width climate chart. 4-column KPI strip below. Narrative in 2 columns. |

**Data paths:**
```
climate.monthlyAvgHigh[]  → Open-Meteo Archive 30yr → monthly max temp averages
climate.monthlyAvgLow[]   → Open-Meteo Archive 30yr → monthly min temp averages
climate.monthlyPrecip[]   → Open-Meteo Archive 30yr → monthly precipitation sums
climate.annualMeanTemp    → average of all monthly means
climate.summerMean        → avg of Jun/Jul/Aug means
climate.winterMean        → avg of Dec/Jan/Feb means
climate.frostDays         → count of days where min < 0°C
climate.growingSeason     → days between last spring frost and first autumn frost
climate.zone              → derived from temp/precip (Mediterranean, Atlantic, etc.)
forecast.daily[]          → Open-Meteo Forecast → 7-day temps, precip, wind, UV
ipma.forecast[]           → IPMA → 5-day Portugal-specific forecast
```

---

### Section 7 — Biodiversity & Habitat Index

| | |
|---|---|
| **DATA** | Total species count (iNaturalist 15km), species by taxonomic group, top 10 species (name, scientific name, photo), GBIF occurrence count + kingdom breakdown, threatened species count, observation trends |
| **AI** | **Drop-cap intro** (2 paragraphs): biodiversity richness, notable species, community science context, trend interpretation. |
| **VIZ** | Species bar chart (by taxonomic group), top species cards with photos |
| **LAYOUT** | Narrative top, horizontal bar chart, species cards grid below. |

**Data paths:**
```
species.total            → iNaturalist /species_counts → total_results
species.groups[]         → iNaturalist → grouped by iconic_taxon_name (Plantae, Aves, etc.)
species.top10[]          → iNaturalist → top 10 by count { name, scientific, taxon, photo_url }
species.threatened       → iNaturalist threatened query (25km, threatened=true) → count
gbif.totalOccurrences    → GBIF /occurrence/search → count
gbif.kingdoms[]          → GBIF faceted by kingdomKey → { Plantae, Animalia, Fungi, etc. }
trends.windows[]         → iNaturalist yearly [2009-2014, 2014-2019, 2019-2024] → counts
trends.gbifYearly[]      → GBIF 5-year windows → counts
trends.direction         → derived: increasing / declining / stable
```

---

### Section 8 — Agriculture

| | |
|---|---|
| **DATA** | Land cover type (DGT COS or CORINE), yield models by production system, revenue ranges |
| **AI** | **Agricultural potential narrative** (2 paragraphs): what the land can produce, market factors, conservative benchmarks. |
| **VIZ** | Revenue table (production system / potential / revenue range / timeline) |
| **LAYOUT** | Narrative top, data table below. |

**Data paths:**
```
landCover.primary        → DGT COS 2018 WMS GetFeatureInfo → description
landCover.corine         → CORINE 2018 WMS → CODE_18, LABEL3 (fallback)
agriculture.systems[]    → derived from land cover type:
  - cork:     180 kg/ha @ €8.50/kg → €1,530/ha/year (9yr cycle)
  - olive:    3000 kg/ha @ €0.60/kg → €1,800/ha/year
  - vineyard: 6000 kg/ha @ €0.45/kg → €2,700/ha/year
  - forest:   4 m³/ha @ €45/m³ → €180/ha/year
  - pasture:  250 kg/ha @ €4.50/kg → €1,125/ha/year
```

---

### Section 9 — Opportunities

| | |
|---|---|
| **DATA** | 3 revenue scenarios (Conservative/Moderate/Optimized), systems active, annual revenue, investment required, carbon credit potential |
| **AI** | **Scenario comparison narrative** (2 paragraphs): explain each scenario, investment-return logic. |
| **VIZ** | 3-scenario comparison table |
| **LAYOUT** | Narrative top, comparison table. |

**Data paths:**
```
scenarios.conservative   → computeRevenueScenarios().conservative { revenue, systems, investment }
scenarios.moderate       → computeRevenueScenarios().moderate (current + 40% + partial carbon)
scenarios.optimized      → computeRevenueScenarios().optimized (current + 80% + full carbon)
carbon.stockEstimate     → literature values by land cover (tCO2e/ha)
carbon.annualSeq         → 2% of stock × area
carbon.creditValue       → annualSeq × €65-80/tCO2e
```

---

### Section 10 — Risks

| | |
|---|---|
| **DATA** | Fire risk (0-5), flood risk (0-5), drought risk (0-5), fire detections (FIRMS count, dates, FRP), historical fire data (10yr by year), seasonal calendar |
| **AI** | **Risk narrative** (2 paragraphs): risk interaction analysis, mitigation priorities. |
| **VIZ** | Risk bar chart (3 bars, 0-5 scale), mitigation cards |
| **LAYOUT** | Risk chart top, narrative middle, mitigation actions below. |

**Data paths:**
```
risk.fire              → computeRiskProfile().fire { score: 0-5, level, confidence }
risk.flood             → computeRiskProfile().flood { score: 0-5, level, confidence }
risk.drought           → computeRiskProfile().drought { score: 0-5, level, confidence }
fires.active           → NASA FIRMS VIIRS → count, dates, max FRP (50km radius)
fires.historical[]     → NASA FIRMS MODIS archive → detections by year (10yr)
fires.peakYear         → year with most detections
fires.seasonal[]       → derived calendar: Jan-Mar, Apr-May, Jun-Aug, Sep-Dec risk tags
```

---

### Section 11 — Resilience

| | |
|---|---|
| **DATA** | Energy potential by source (solar, wind, micro-hydro, biomass), resource levels, development feasibility |
| **AI** | **Energy independence narrative** (2 paragraphs): self-sufficiency potential, practical feasibility. |
| **VIZ** | Energy bar chart (4 sources), feasibility table |
| **LAYOUT** | Narrative top, chart + table below. |

**Data paths:**
```
energy.solar           → derived from latitude + elevation + aspect → High/Medium/Low
energy.wind            → derived from elevation + terrain exposure → High/Medium/Low
energy.microHydro      → derived from water features + elevation → High/Medium/Low
energy.biomass         → derived from land cover (forest/scrub) → High/Medium/Low
```
*Note: Solar PV GIS (PVGIS) and NASA POWER are available in generate-full.js but not yet in standard.*

---

### Section 12 — Regional Context

| | |
|---|---|
| **DATA** | Protected areas (Natura 2000 + Overpass), percentile rankings vs region, bioregion comparisons (slope, tree cover, water security, solar potential) |
| **AI** | **Multi-scale context narrative** (2 paragraphs): what bioregional position means, protected area significance. |
| **VIZ** | Percentile chart (5 dimensions), protected areas table, comparable property cards (icon + big % + description + recommendation) |
| **LAYOUT** | Serif italic title. Intro paragraph. Comparable cards (icon left, 3-col stat + narrative + recommendation). Bottom border between cards. |

**Data paths:**
```
protected.natura2000[]   → Natura 2000 WMS GetFeatureInfo → site names, designations
protected.osm[]          → Overpass → boundary=protected_area, leisure=nature_reserve (25km)
percentiles.water        → waterScore normalized to percentile
percentiles.biodiversity → bioScore normalized to percentile
percentiles.soil         → soilScore normalized to percentile
percentiles.carbon       → carbonScore normalized to percentile
percentiles.resilience   → resilienceScore normalized to percentile
comparisons.regional[]   → APIs fetched at ±0.15° offset for baseline comparison
```

---

### Section 13 — Change Over Time

| | |
|---|---|
| **DATA** | 50yr climate trends (temp/decade, precip/decade), fire-prone days by decade, biodiversity observation trends (iNat/GBIF yearly windows), 30yr NPV scenarios |
| **AI** | **Temporal dynamics narrative** (2 paragraphs): what trends mean, projection caveats, appreciation outlook. |
| **VIZ** | NPV scenario table, trend indicators (arrows + per-decade values) |
| **LAYOUT** | Narrative top, scenario table, trend summary. |

**Data paths:**
```
trends.tempPerDecade     → Open-Meteo 50yr archive → linear regression (°C/decade)
trends.precipPerDecade   → Open-Meteo 50yr archive → linear regression (mm/decade)
trends.fireProneByDecade → Open-Meteo 50yr → days > 30°C && precip < 5mm, by decade
trends.bioWindows[]      → iNaturalist [2009-14, 2014-19, 2019-24] → total counts
trends.gbifWindows[]     → GBIF 5yr windows → occurrence counts
npv.scenarios[]          → { baseline, climateResilience, conservation, intensification } × 30yr
```

---

### Section 14 — Map Portfolio

| | |
|---|---|
| **DATA** | 4 Mapbox static map images at different zoom levels with GeoJSON boundary overlay |
| **AI** | Minimal captions only |
| **VIZ** | 4 maps: Location Overview (z8), Regional Context (z10), Property Detail (z14), Satellite View (z15) |
| **LAYOUT** | 2x2 grid or stacked full-width. Grayscale satellite with forest-green boundary. |

**Data paths:**
```
maps.overview    → Mapbox static, style=outdoors-v12, zoom=8, 700x440, GeoJSON overlay
maps.regional    → Mapbox static, style=outdoors-v12, zoom=10, 700x440, GeoJSON overlay
maps.detail      → Mapbox static, style=outdoors-v12, zoom=14, 700x440, GeoJSON overlay
maps.satellite   → Mapbox static, style=satellite-v9, zoom=15, 700x440, GeoJSON overlay
```

---

### Section 15 — Compliance

| | |
|---|---|
| **DATA** | Regulatory checklist (SEEA-EA status, geolocation verification, environmental reporting), compliance timeline |
| **AI** | **Regulatory framework narrative** (2 paragraphs): obligations, disclosure requirements, SEEA-EA alignment. |
| **VIZ** | Status table (regulation / status / effective / action), timeline (2024-2030) |
| **LAYOUT** | Narrative top, table + timeline below. |

**Data paths:**
```
compliance.seea          → { status: "Ready", effective: 2026 }
compliance.geolocation   → { status: "Verified", effective: 2025 }
compliance.environmental → { status: "In Progress", effective: 2025 }
timeline[]               → [2024: Baseline, 2025: Compliance active, 2026: Reporting begins, 2030: Full coverage]
```
*Note: Currently all hardcoded/synthetic. No live regulatory API exists.*

---

### Section 16 — Next Steps

| | |
|---|---|
| **DATA** | Action items organized by timeframe (immediate 0-6mo, short-term 6-18mo, long-term 2-5yr), each with cost estimate and purpose |
| **AI** | **Invitation framing** (2 paragraphs): relationship-based approach, community context. |
| **VIZ** | 3 action tables (timeframe columns: action / cost / purpose) |
| **LAYOUT** | Narrative intro, then 3 separated tables by timeframe. |

**Data paths:**
```
actions.immediate[]     → derived from risk scores + data gaps
actions.shortTerm[]     → derived from opportunity analysis + land cover
actions.longTerm[]      → derived from revenue scenarios + energy potential
```
*Note: Actions are template-derived with cost ranges, not from live APIs.*

---

### Section 17 — Methodology, Sources & Disclaimer

| | |
|---|---|
| **DATA** | Data source inventory (API name, resolution, date accessed), scoring methodology explanation |
| **AI** | **Methodology text** (2-3 paragraphs): SEEA-EA framework, conservative estimation principles, benchmarking methodology, scoring logic. **Disclaimer** (1 paragraph). |
| **VIZ** | Source table (data type / source / resolution) |
| **LAYOUT** | Narrative + source table + disclaimer block. |

**Data paths:**
```
sources[]               → static reference table:
  Climate       → Open-Meteo ERA5 reanalysis    → 30-year monthly
  Soil          → SoilGrids / ISRIC             → 250m resolution
  Biodiversity  → iNaturalist, GBIF             → point observations
  Elevation     → Open-Meteo SRTM DEM           → 90m resolution
  Water         → OpenStreetMap / Overpass       → feature-level
  Fire          → Open-Meteo + NASA FIRMS        → regional
  Flood         → GloFAS / Open-Meteo           → sub-basin scale
  Geology       → Macrostrat                     → regional scale
  Protected     → Natura 2000 / Overpass         → designation level
  Land Cover    → DGT COS / CORINE 2018         → parcel level
  Maps          → Mapbox                         → satellite + vector
```

---

## API Reference

| API | Endpoint | Sections | Key Fields |
|-----|----------|----------|------------|
| Open-Meteo Elevation | `api.open-meteo.com/v1/elevation` | 0, 1, 4 | `elevation` (m) |
| Open-Meteo Forecast | `api.open-meteo.com/v1/forecast` | 6, 10 | daily temps, precip, wind, UV |
| Open-Meteo Archive | `archive-api.open-meteo.com/v1/archive` | 1, 6, 13 | 30yr monthly normals, 50yr trends |
| SoilGrids Properties | `rest.isric.org/soilgrids/v2.0/properties/query` | 4 | pH, OC, clay, sand, N, CEC, bdod |
| SoilGrids Classification | `rest.isric.org/soilgrids/v2.0/classification/query` | 4 | WRB class |
| Macrostrat | `macrostrat.org/api/v2/geologic_units/map` | 4 | lithology, environment, period, age |
| iNaturalist Species | `api.inaturalist.org/v1/observations/species_counts` | 7, 13 | species by taxa, threatened |
| GBIF Occurrences | `api.gbif.org/v1/occurrence/search` | 7, 13 | count, kingdom facets |
| GloFAS Flood | `flood-api.open-meteo.com/v1/flood` | 5, 10 | river discharge (m³/s) |
| Overpass / OSM | `overpass-api.de/api/interpreter` | 5, 9, 12 | water features, infrastructure, protected areas |
| Natura 2000 | `bio.discomap.eea.europa.eu` WMS | 12 | protected site names |
| NASA FIRMS | `firms.modaps.eosdis.nasa.gov/api/area` | 10, 13 | fire detections, FRP, archive |
| DGT COS 2018 | `geo2.dgterritorio.gov.pt` WMS | 8 | land cover class (Portugal) |
| CORINE 2018 | `image.discomap.eea.europa.eu` WMS | 8 | land cover class (Europe fallback) |
| Mapbox Static | `api.mapbox.com/styles/v1/.../static` | 0, 1, 14 | PNG map tiles with GeoJSON |
| Mapbox Geocoding | `api.mapbox.com/geocoding/v5` | 0, 1 | place_name (address) |
| IPMA | `api.ipma.pt/open-data` | 6 | 5-day Portugal forecast |
| Nominatim | `nominatim.openstreetmap.org/reverse` | 0, 1 | address fallback |

---

## AI Narrative Contracts

Every AI-generated text block follows this contract:

| Section | Slot Name | Input Data | Tone | Length |
|---------|-----------|-----------|------|--------|
| 1 | `ai.executiveSummary` | All KPIs, location, scores | Authoritative editorial (FT style) | 2-3 para, ~150 words |
| 2 | `ai.ecosystemServices` | TEEB values, top services, land cover | Explanatory, accessible | 2 para, ~120 words |
| 3 | `ai.scorecardNarrative` | 5 scores + regional avgs | Analytical | 2 para, ~100 words |
| 4 | `ai.terrainDescription` | Elevation, geology, soil profile | Descriptive, place-specific | 2 para, ~120 words |
| 5 | `ai.waterNarrative` | Features, rainfall, security index | Assessment | 2 para, ~100 words |
| 6 | `ai.climateProfile` | Normals, growing season, zone | Informative | 2 para, ~100 words |
| 7 | `ai.biodiversityIntro` | Species count, top species, trends | Celebratory/analytical | 2 para, ~120 words |
| 8 | `ai.agriculturePotential` | Land cover, yield models | Practical advisory | 2 para, ~100 words |
| 9 | `ai.scenarioComparison` | Revenue scenarios, investments | Strategic advisory | 2 para, ~100 words |
| 10 | `ai.riskNarrative` | Fire/flood/drought scores | Cautious, actionable | 2 para, ~100 words |
| 11 | `ai.resilienceNarrative` | Energy sources, feasibility | Forward-looking | 2 para, ~100 words |
| 12 | `ai.contextNarrative` | Protected areas, percentiles | Contextualizing | 2 para, ~100 words |
| 13 | `ai.temporalNarrative` | Trends, projections | Measured, caveated | 2 para, ~100 words |
| 15 | `ai.complianceNarrative` | Regulatory status | Formal/advisory | 2 para, ~100 words |
| 16 | `ai.nextStepsFraming` | Action items | Invitational | 2 para, ~100 words |
| 17 | `ai.methodology` | Source list, scoring logic | Technical/transparent | 2-3 para, ~150 words |
| * | `ai.pullQuote` | Section-specific insight | Italic serif, aspirational | 1-2 sentences |

**Generation approach:** Single Claude API call per report with all section contexts batched, or one call per section. Narratives cached in `data_snapshot.narratives{}` so they survive re-renders without re-generation.

---

## Data Contract

### Principle

**Nothing is hardcoded except section titles, labels, headers, and disclaimer boilerplate.** Every number, narrative, chart, and map is dynamic — sourced from APIs, computed scores, or AI-generated text.

### `reportData` — Canonical Object Shape

Every section renderer receives a slice of this single object. Renderers never fetch data — they only read.

```js
reportData = {
  // ── Property identity ──
  property: {
    name,           // string — Mapbox reverse geocode → place_name
    address,        // string — Mapbox/Nominatim → full address
    coords,         // { lat, lng } — submission.center
    area,           // number (ha) — geo.sqmToHectares(submission.area)
    boundary,       // GeoJSON Polygon — submission.boundary
    municipality,   // string — DGT CAOP / Nominatim
    parish,         // string — DGT CAOP
  },

  // ── Scores (all 0-100 unless noted) ──
  scores: {
    naturalCapital,   // number (0-10) — weighted average of dimensions
    carbon,           // number — computeAllScores().carbonScore
    biodiversity,     // number — computeAllScores().bioScore
    water,            // number — computeAllScores().waterScore
    soil,             // number — computeAllScores().soilScore
    pollination,      // number — computeAllScores().pollinationScore
    regional: {       // same dimensions for regional baseline
      carbon, biodiversity, water, soil, pollination
    }
  },

  // ── Climate ──
  climate: {
    annualMeanTemp,     // °C — avg of all monthly means
    summerMean,         // °C — avg Jun/Jul/Aug
    winterMean,         // °C — avg Dec/Jan/Feb
    annualRainfall,     // mm — 30yr sum / 30
    frostDays,          // count — days where min < 0°C
    growingSeason,      // days — last spring frost → first autumn frost
    zone,               // string — derived (Mediterranean, Atlantic, etc.)
    monthlyAvgHigh: [], // 12 values — Open-Meteo Archive 30yr
    monthlyAvgLow: [],  // 12 values
    monthlyPrecip: [],  // 12 values (mm)
    forecast: [],       // 7-day daily — Open-Meteo Forecast
    ipmaForecast: [],   // 5-day — IPMA (Portugal-specific)
  },

  // ── Terrain & Soil ──
  terrain: {
    elevation,       // m — Open-Meteo Elevation API
    slope,           // derived from multi-point elevation profile
    aspect,          // derived from elevation grid
    profile: [],     // multi-point elevation samples
  },
  soil: {
    ph,              // SoilGrids → phh2o, 0-5cm mean
    organicCarbon,   // g/kg — SoilGrids → ocd
    clay,            // % — SoilGrids → clay
    sand,            // % — SoilGrids → sand
    silt,            // % — derived (100 - clay - sand)
    nitrogen,        // g/kg — SoilGrids → nitrogen
    cec,             // cmol/kg — SoilGrids → cec
    bulkDensity,     // kg/dm³ — SoilGrids → bdod
    classification,  // string — SoilGrids → wrb_class_name
  },
  geology: {
    lithology,       // string — Macrostrat → lith.name
    environment,     // string — Macrostrat → environ.name
    period,          // string — Macrostrat → t_int_name
    age,             // Ma — Macrostrat → t_int_age
  },

  // ── Water ──
  water: {
    springs,           // count — Overpass → natural=spring
    wells,             // count — Overpass → man_made=water_well
    waterways,         // count — Overpass → waterway=*
    waterBodies,       // count — Overpass → natural=water
    annualRainfall,    // mm — (same as climate.annualRainfall)
    securityIndex,     // 0-10 — computeAllScores().waterScore
    floodDischarge,    // m³/s — GloFAS → river_discharge
    floodRisk,         // { level, score } — analyzeFloodRisk()
  },

  // ── Biodiversity ──
  species: {
    total,             // count — iNaturalist → total_results
    groups: [],        // { name, count } — by iconic_taxon_name
    top10: [],         // { name, scientific, taxon, photoUrl }
    threatened,        // count — iNaturalist threatened query
    gbifTotal,         // count — GBIF → total occurrences
    gbifKingdoms: [],  // { name, count } — GBIF faceted by kingdom
    trends: {
      inatWindows: [], // 3x 5-year windows → counts
      gbifWindows: [], // 4x 5-year windows → counts
      direction,       // string — increasing / declining / stable
    }
  },

  // ── Fire & Risk ──
  fire: {
    riskScore,         // 0-5 — computeRiskProfile().fire
    riskLevel,         // string — Low/Moderate/High
    activeFires,       // { count, dates, maxFRP } — NASA FIRMS VIIRS
    historical: [],    // { year, count } — NASA FIRMS MODIS 10yr
    peakYear,          // year with most detections
    seasonal: [],      // { period, riskTag } — derived calendar
  },
  flood: {
    riskScore,         // 0-5 — computeRiskProfile().flood
    riskLevel,         // string
  },
  drought: {
    riskScore,         // 0-5 — computeRiskProfile().drought
    riskLevel,         // string
  },

  // ── Energy ──
  energy: {
    solar,             // { level, detail } — derived from lat + elevation + aspect
    wind,              // { level, detail }
    microHydro,        // { level, detail }
    biomass,           // { level, detail }
    independenceScore, // 0-10
  },

  // ── Economics ──
  economics: {
    valuePerHa,        // € — reportScores.marketValue / area
    totalValue,        // € — reportScores.marketValue
    ecosystemServices: {
      total,           // € annual — computeEcosystemServices().total
      water, food, carbon, regulation, soil, cultural  // € each
    },
    npv: {
      thirtyYear,      // € — total * NPV_factor
      scenarios: [],   // { name, npv, assumptions, riskLevel }
    },
    revenueScenarios: {
      conservative,    // { revenue, systems, investment }
      moderate,        // { revenue, systems, investment }
      optimized,       // { revenue, systems, investment }
    },
    carbonStock,       // tCO2e — literature values by land cover
    carbonAnnualSeq,   // tCO2e/yr — 2% of stock × area
    carbonCreditValue, // € — annualSeq × €65-80/tCO2e
  },

  // ── Agriculture ──
  agriculture: {
    landCover,         // string — DGT COS / CORINE
    systems: [],       // { name, status, potential, revenue, timeline }
  },

  // ── Maps (Mapbox static URLs with GeoJSON boundary) ──
  maps: {
    satellite,         // URL — style=satellite-v9, zoom=15
    overview,          // URL — style=outdoors-v12, zoom=8
    regional,          // URL — style=outdoors-v12, zoom=10
    detail,            // URL — style=outdoors-v12, zoom=14
  },

  // ── Regional Context ──
  regional: {
    protectedAreas: [],  // { name, designation } — Natura 2000 + Overpass
    percentiles: {       // each 0-100
      water, biodiversity, soil, carbon, resilience
    },
    comparisons: {},     // APIs fetched at wider radius
  },

  // ── Trends ──
  trends: {
    tempPerDecade,           // °C — linear regression over 50yr
    precipPerDecade,         // mm — linear regression over 50yr
    fireProneByDecade: [],   // { decade, days } — days > 30°C && precip < 5mm
    bioWindows: [],          // iNat 3x 5yr windows
    gbifWindows: [],         // GBIF 4x 5yr windows
  },

  // ── Compliance (static source — no live API) ──
  compliance: {
    items: [],         // { regulation, status, effective, action }
    timeline: [],      // { year, description }
  },

  // ── Actions (derived from scores + risk profile) ──
  actions: {
    immediate: [],     // { action, cost, purpose }
    shortTerm: [],     // { action, cost, purpose }
    longTerm: [],      // { action, cost, purpose }
  },

  // ── AI Narratives (generated by Claude, cached) ──
  narratives: {
    executiveSummary: { intro, pullQuote },
    ecosystemServices: { intro },
    scorecard: { text },
    terrain: { description },
    water: { narrative, pullQuote },
    climate: { profile },
    biodiversity: { intro },
    agriculture: { potential },
    opportunities: { comparison },
    risks: { narrative },
    resilience: { narrative },
    context: { narrative },
    temporal: { dynamics },
    compliance: { framework },
    nextSteps: { framing },
    methodology: { text, disclaimer },
  },

  // ── Metadata ──
  meta: {
    generatedAt,       // ISO timestamp
    version,           // string — e.g. "v1"
    apiStatus: {},     // { apiName: { ok, latencyMs, error? } }
    missingFields: [], // { field, reason } — for AI context and dash rendering
  }
}
```

### Schema Definition (`src/lib/report-data-schema.js`)

Each field has a strict definition:

```js
{
  path: 'soil.ph',
  type: 'number',
  unit: 'pH',
  source: 'soilgrids',
  sourceDetail: 'SoilGrids /properties/query → phh2o, 0-5cm mean',
  required: true,          // true = show '—' if missing; false = hide element
  sections: [4],           // which sections use this field
  format: (v) => v.toFixed(1),
  validate: (v) => v >= 0 && v <= 14,
}
```

The schema serves three purposes:
1. **Documentation** — replaces prose data path descriptions; machine-readable
2. **Validation** — `validateReportData(reportData, schema)` runs at generation time, logs warnings for missing required fields, populates `meta.missingFields`
3. **Formatting** — section renderers call `schema.format(value)` for consistent display; never raw `.toString()`

### Missing Data Handling

When a field is `null` / `undefined` / failed API:

1. **Required fields** → render `—` with `title="Source: {sourceDetail} | Status: {reason}"`
2. **Optional fields** → hide the containing element entirely
3. **AI narratives** → Claude receives `meta.missingFields[]` and writes around gaps naturally ("Soil data was unavailable for this assessment...")
4. **Charts** → omit the data point; if >50% of a chart's data is missing, replace with a "Data unavailable" placeholder

### What Is Hardcoded vs Dynamic

| Hardcoded in template | Dynamic from `reportData` |
|---|---|
| Section titles ("What This Land Provides") | All numbers, scores, values |
| Table column headers ("Ecosystem Service", "Annual Value") | All table cell values |
| Label text ("Total Area", "Fire Risk") | All chart data points |
| Disclaimer boilerplate | All narrative paragraphs + pull quotes |
| CSS, layout structure, fonts | All map images (Mapbox URLs) |
| Methodology source names ("SoilGrids", "iNaturalist") | Resolution, date accessed |
| Action item structure (immediate/short/long grouping) | Specific actions, costs, purposes |
| Compliance regulations (EUDR, CSRD — `source: 'static'`) | Status, effective dates |

### Data Pipeline Flow

```
POST /api/reports/generate { submission_id, force_refresh?, force_narratives? }
  │
  ├─ 1. Load submission from MongoDB
  ├─ 2. Check cached data_snapshot → skip to 4 if cached & !force_refresh
  ├─ 3. fetchAllData() → 23+ parallel API calls
  │     → processRawData() normalizes into reportData shape
  │     → validateReportData(reportData, schema)
  │     → populates reportData.meta.missingFields
  ├─ 4. Check cached narratives → skip to 5 if cached & !force_narratives
  │     → generateNarratives(reportData) via Claude API
  │     → Claude receives full reportData + missingFields list
  │     → Narratives cached in reportData.narratives
  ├─ 5. buildReport(reportData)
  │     → 18 section renderers, each reads its slice
  │     → Charts rendered inline as SVG via report-charts.js
  │     → Missing required fields show '—' with tooltip
  │     → Returns self-contained HTML string
  ├─ 6. Upload to Vercel Blob + save to MongoDB (with user_email)
  └─ 7. Return { id, version, slug, blob_url }
```

---

## What Needs To Be Built

1. **This doc** (done) — reference for all template work
2. **Data schema** (`src/lib/report-data-schema.js`) — strict field definitions with source, type, format, validation
3. **Data pipeline** (`src/lib/report-data-pipeline.js`) — extracted API fetches + `processRawData()` + `validateReportData()`
4. **Shared template** (`src/templates/report-template.js`) — editorial HTML builder consuming `reportData`
5. **Section renderers** (`src/templates/report-sections.js`) — 18 functions, one per A4 page
6. **Design system** (`src/templates/report-design-system.js`) — self-contained CSS + `wrapFullPage()`
7. **AI narrative layer** (`src/lib/report-narratives.js`) — Claude API integration with missing-field awareness
8. **New generator endpoint** — `api/reports/generate.js` rewritten as thin handler importing shared modules
9. **Updated chart library** — `report-charts.js` palette → `#012d1d` / `#E07A5F` / `#8FBC8F`
10. **Archive old generators** — move `api/reports/generate.js` (current), `api/reports/generate-full.js`, `src/pages/landbook-report.js` to `archive/` before rebuilding
