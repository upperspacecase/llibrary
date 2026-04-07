# LandBook Report — Build Audit Plan

> Checklist to verify the new report generation system is complete.
> Run through this after each build phase to catch gaps before they compound.

---

## 1. Data Schema Completeness

Does every dynamic value in the report trace back to a defined field in `reportData`?

### Property Identity
- [ ] `property.name` — Mapbox reverse geocode produces a usable place_name
- [ ] `property.address` — Full address string (street, postcode, region, country)
- [ ] `property.coords` — { lat, lng } from submission.center
- [ ] `property.area` — Hectares, converted from sqm
- [ ] `property.boundary` — GeoJSON Polygon, valid for Mapbox static API overlay
- [ ] `property.municipality` — DGT CAOP or Nominatim fallback
- [ ] `property.parish` — DGT CAOP or null (optional)

### Scores
- [ ] `scores.naturalCapital` — 0-10, weighted average renders correctly
- [ ] `scores.carbon` — 0-100
- [ ] `scores.biodiversity` — 0-100
- [ ] `scores.water` — 0-100
- [ ] `scores.soil` — 0-100
- [ ] `scores.pollination` — 0-100
- [ ] `scores.regional.*` — all 5 dimensions have regional baselines
- [ ] Regional baselines are **computed from wider-radius API calls**, not hardcoded numbers

### Climate
- [ ] `climate.annualMeanTemp` — derived from monthly data, not hardcoded
- [ ] `climate.summerMean` — avg of Jun/Jul/Aug monthly means
- [ ] `climate.winterMean` — avg of Dec/Jan/Feb monthly means
- [ ] `climate.annualRainfall` — 30yr sum / 30
- [ ] `climate.frostDays` — count from daily data, not estimated
- [ ] `climate.growingSeason` — computed from frost dates, not hardcoded
- [ ] `climate.zone` — derived from temp/precip classification
- [ ] `climate.monthlyAvgHigh[]` — 12 values, all populated
- [ ] `climate.monthlyAvgLow[]` — 12 values, all populated
- [ ] `climate.monthlyPrecip[]` — 12 values, all populated
- [ ] `climate.forecast[]` — 7-day, graceful if API unavailable
- [ ] `climate.ipmaForecast[]` — Portugal-specific, null for non-PT properties

### Terrain & Soil
- [ ] `terrain.elevation` — meters, from Open-Meteo Elevation API
- [ ] `terrain.slope` — derived from multi-point profile, not null
- [ ] `terrain.aspect` — derived from elevation grid
- [ ] `terrain.profile[]` — multiple elevation samples across property
- [ ] `soil.ph` — SoilGrids, formatted to 1 decimal
- [ ] `soil.organicCarbon` — g/kg, not raw API units
- [ ] `soil.clay` — %, 0-100
- [ ] `soil.sand` — %, 0-100
- [ ] `soil.silt` — derived (100 - clay - sand), not fetched
- [ ] `soil.nitrogen` — g/kg
- [ ] `soil.cec` — cmol/kg
- [ ] `soil.bulkDensity` — kg/dm3
- [ ] `soil.classification` — WRB class name string
- [ ] `geology.lithology` — Macrostrat, human-readable
- [ ] `geology.environment` — Macrostrat
- [ ] `geology.period` — Macrostrat period name
- [ ] `geology.age` — Ma, numeric

### Water
- [ ] `water.springs` — integer count from Overpass
- [ ] `water.wells` — integer count
- [ ] `water.waterways` — integer count
- [ ] `water.waterBodies` — integer count
- [ ] `water.securityIndex` — 0-10, from computeAllScores
- [ ] `water.floodDischarge` — m3/s from GloFAS
- [ ] `water.floodRisk` — { level, score } from analyzeFloodRisk

### Biodiversity
- [ ] `species.total` — count from iNaturalist
- [ ] `species.groups[]` — at least 5 taxonomic groups with counts
- [ ] `species.top10[]` — name, scientific name, taxon, photoUrl for each
- [ ] `species.top10[].photoUrl` — valid URL or null (don't break layout)
- [ ] `species.threatened` — count from iNaturalist threatened query
- [ ] `species.gbifTotal` — count from GBIF
- [ ] `species.gbifKingdoms[]` — kingdom breakdown with counts
- [ ] `species.trends.inatWindows[]` — 3 windows with counts
- [ ] `species.trends.gbifWindows[]` — 4 windows with counts
- [ ] `species.trends.direction` — string: increasing/declining/stable

### Fire & Risk
- [ ] `fire.riskScore` — 0-5, computed not hardcoded
- [ ] `fire.riskLevel` — derived from score, not independent
- [ ] `fire.activeFires` — { count, dates, maxFRP } or null if no key
- [ ] `fire.historical[]` — 10 years of { year, count }
- [ ] `fire.peakYear` — derived from historical, not hardcoded
- [ ] `fire.seasonal[]` — 4 periods with risk tags
- [ ] `flood.riskScore` — 0-5
- [ ] `flood.riskLevel` — derived from score
- [ ] `drought.riskScore` — 0-5
- [ ] `drought.riskLevel` — derived from score

### Energy
- [ ] `energy.solar` — { level, detail } derived from lat/elevation/aspect
- [ ] `energy.wind` — { level, detail }
- [ ] `energy.microHydro` — { level, detail }
- [ ] `energy.biomass` — { level, detail }
- [ ] `energy.independenceScore` — 0-10

### Economics
- [ ] `economics.valuePerHa` — computed, NOT hardcoded €22,000
- [ ] `economics.totalValue` — area * valuePerHa
- [ ] `economics.ecosystemServices.total` — sum of 6 categories
- [ ] `economics.ecosystemServices.*` — all 6 categories populated
- [ ] `economics.npv.thirtyYear` — computed with discount rate
- [ ] `economics.npv.scenarios[]` — 4 scenarios with distinct NPVs
- [ ] `economics.revenueScenarios.*` — 3 scenarios with revenue + systems + investment
- [ ] `economics.carbonStock` — tCO2e from land cover, not hardcoded
- [ ] `economics.carbonAnnualSeq` — derived from stock
- [ ] `economics.carbonCreditValue` — derived from sequestration

### Agriculture
- [ ] `agriculture.landCover` — from DGT COS or CORINE, not hardcoded
- [ ] `agriculture.systems[]` — derived from land cover type, not same for every report

### Maps
- [ ] `maps.satellite` — valid Mapbox URL with property boundary overlay
- [ ] `maps.overview` — zoom 8, outdoors style
- [ ] `maps.regional` — zoom 10
- [ ] `maps.detail` — zoom 14
- [ ] All map URLs include GeoJSON boundary in deep forest green

### Regional Context
- [ ] `regional.protectedAreas[]` — Natura 2000 + Overpass results
- [ ] `regional.percentiles.*` — 5 dimensions, all 0-100
- [ ] `regional.comparisons` — populated from wider-radius API calls

### Trends
- [ ] `trends.tempPerDecade` — from 50yr linear regression, not hardcoded
- [ ] `trends.precipPerDecade` — from 50yr linear regression
- [ ] `trends.fireProneByDecade[]` — computed per decade
- [ ] `trends.bioWindows[]` — matches species.trends.inatWindows
- [ ] `trends.gbifWindows[]` — matches species.trends.gbifWindows

### Compliance
- [ ] `compliance.items[]` — regulations listed (static source is OK, but documented)
- [ ] `compliance.timeline[]` — years + descriptions

### Actions
- [ ] `actions.immediate[]` — derived from risk scores + data gaps, not same for every report
- [ ] `actions.shortTerm[]` — derived from opportunities + land cover
- [ ] `actions.longTerm[]` — derived from revenue scenarios + energy potential
- [ ] Cost estimates reflect property size (not fixed amounts for all properties)

### Narratives
- [ ] All 16 narrative slots populated by Claude API call
- [ ] Narratives reference actual data values (not generic)
- [ ] Narratives acknowledge missing fields listed in `meta.missingFields`
- [ ] Pull quotes are property-specific, not reused boilerplate
- [ ] Narrative tone matches contracts in REPORT-ARCHITECTURE.md

### Metadata
- [ ] `meta.generatedAt` — ISO timestamp
- [ ] `meta.version` — version string
- [ ] `meta.apiStatus` — per-API health logged
- [ ] `meta.missingFields[]` — populated during validation step

---

## 2. Section Renderer Completeness

Does every section from the Kimi reference render correctly with the Quintas visual style?

### Section 0 — Cover
- [ ] Full-bleed satellite image as background
- [ ] Gradient overlay (dark at bottom)
- [ ] "LandBook" wordmark + "Natural Capital Assessment" top center
- [ ] Coordinates top right
- [ ] Property name in Libre Baskerville italic, ~48pt
- [ ] Location line below name
- [ ] KPI meta strip (area, value, NCS)
- [ ] Date + version bottom right
- [ ] Page break after

### Section 1 — Property at a Glance
- [ ] Section title in Libre Baskerville italic
- [ ] Two-column narrative with drop-cap
- [ ] 5-metric KPI row (area, value/ha, bio score, water security, carbon stock)
- [ ] Horizontal bar chart — 5 natural capital dimensions vs regional avg
- [ ] Pull quote with terracotta left border
- [ ] All values from `reportData`, none hardcoded

### Section 2 — What This Land Provides
- [ ] Drop-cap two-column narrative (SEEA-EA explanation)
- [ ] Big number display — 30yr NPV (Libre Baskerville, ~58pt)
- [ ] Uncertainty note below big number
- [ ] Stacked bar chart — service category proportions
- [ ] Services table (6 rows: water, food, carbon, regulation, soil, cultural)
- [ ] All € values from `economics.ecosystemServices`, none hardcoded

### Section 3 — How This Land Performs
- [ ] Drop-cap two-column narrative
- [ ] Radar chart — 5 axes, property solid vs regional dashed
- [ ] Scorecard table (dimension / score / regional avg / difference / key indicators)
- [ ] Difference values color-coded (green positive, red negative)

### Section 4 — The Lay of the Land
- [ ] Drop-cap two-column narrative
- [ ] Soil property display (table or cards)
- [ ] Geology summary
- [ ] Slope/elevation visualization
- [ ] Land cover breakdown
- [ ] Wound Index table (if data available, hide if not)

### Section 5 — Water
- [ ] Pull quote lead (property-specific, from narratives)
- [ ] Drop-cap two-column narrative
- [ ] Water security big metric or chart
- [ ] Water features table (source type / yield / seasonality)
- [ ] All counts from Overpass data, not hardcoded

### Section 6 — Climate
- [ ] Drop-cap two-column narrative
- [ ] 5-metric KPI row (annual mean, summer, winter, rainfall, growing days)
- [ ] Monthly climate chart (rainfall bars + temperature line, 12 months)
- [ ] All values from `climate.*`, none hardcoded

### Section 7 — Biodiversity & Habitat Index
- [ ] Subtitle italic line
- [ ] Drop-cap two-column narrative
- [ ] Species bar chart by taxonomic group
- [ ] Species vitality ledger table with status badges
- [ ] Photo grid (top species) — photos from iNaturalist URLs or placeholder
- [ ] Species counts from API, not hardcoded

### Section 8 — Agriculture
- [ ] Drop-cap two-column narrative
- [ ] Production scenarios chart (inline SVG)
- [ ] Systems table (system / status / potential / revenue / timeline)
- [ ] Systems derived from `agriculture.landCover`, not same for every property

### Section 9 — Opportunities
- [ ] Drop-cap two-column narrative
- [ ] Revenue scenarios chart
- [ ] 3-scenario comparison table (conservative / moderate / optimized)
- [ ] Values from `economics.revenueScenarios`, not hardcoded

### Section 10 — Risks
- [ ] Drop-cap two-column narrative
- [ ] Risk chart (fire/flood/drought, 0-5 scale)
- [ ] Fire history chart or reference
- [ ] Risk table with status badges (Low/Moderate/High)
- [ ] Mitigation priorities derived from scores

### Section 11 — Resilience
- [ ] Drop-cap two-column narrative
- [ ] Energy bar chart (4 sources)
- [ ] Feasibility table (source / resource level / estimated output / feasibility)
- [ ] Values from `energy.*`, not hardcoded

### Section 12 — Context
- [ ] Drop-cap two-column narrative
- [ ] Percentiles chart (5 dimensions)
- [ ] Three subsections (Bioregion, Watershed, 15-min radius)
- [ ] Protected areas mentioned if present
- [ ] Subsection text from AI narratives, not hardcoded paragraphs

### Section 13 — Change Over Time
- [ ] Drop-cap two-column narrative
- [ ] Trends visualization (temp/decade, precip/decade)
- [ ] NPV scenario comparison table (4 scenarios)
- [ ] All trend values from `trends.*`, not hardcoded

### Section 14 — Map Portfolio
- [ ] Intro text
- [ ] 4+ full-page maps from `maps.*` URLs
- [ ] Map titles (Location Overview, Bioregion Context, Property Detail, Satellite)
- [ ] All maps show property boundary in deep forest green
- [ ] Maps render (Mapbox URLs are valid with token)

### Section 15 — Compliance
- [ ] Drop-cap two-column narrative
- [ ] Regulation table with status badges
- [ ] Regulatory timeline (year-based)
- [ ] Static source is documented in schema as `source: 'static'`

### Section 16 — What to Do Next
- [ ] Drop-cap two-column narrative
- [ ] 3 action tables (immediate / short-term / long-term)
- [ ] Each action has: action, cost, purpose
- [ ] Actions derived from property data, not identical across reports

### Section 17 — Methodology, Sources & Disclaimer
- [ ] Data sources table (data type / source / resolution)
- [ ] Scale definitions (bioregion, watershed, 15-min radius)
- [ ] Methodology notes (two-column)
- [ ] Disclaimer (pull quote + paragraphs)
- [ ] Footer with LandBook branding, contact, document ID

---

## 3. Visual Style Audit

Does the output match the Quintas design reference?

### Typography
- [ ] Serif = Libre Baskerville (NOT Crimson Text)
- [ ] Sans = Inter
- [ ] Icons = Material Symbols Outlined
- [ ] Section titles: Libre Baskerville italic, ~32pt, `#012d1d`
- [ ] Drop-caps: Libre Baskerville, ~48-52pt, `#012d1d`
- [ ] Body: Inter, 11pt, `#374151`
- [ ] Micro-labels: Inter, 8pt, bold, uppercase, letter-spacing 0.05-0.2em

### Color Palette
- [ ] Primary: `#012d1d` (headlines, big numbers)
- [ ] Primary Container: `#1B4332` (dark panels, cover bg)
- [ ] Terracotta: `#E07A5F` (accent borders, pull quotes, trend arrows)
- [ ] Surface: `#FAFAF9` (page background)
- [ ] Outline Variant: `#c1c8c2` (hairline dividers)
- [ ] On-Surface: `#151c27` (body text — or `#374151` charcoal)
- [ ] Secondary: `#585f6c` (muted labels)
- [ ] NO `#BC6C25` (old terracotta)
- [ ] NO `#90E0EF` (old sky)
- [ ] NO rounded corners anywhere (border-radius: 0px)

### Layout
- [ ] A4 pages: 210mm x 297mm
- [ ] Padding: 24mm (or 20mm per Kimi — confirm which)
- [ ] Hairline dividers: 0.5pt solid `#c1c8c2`
- [ ] Table borders: 2pt top/bottom `#012d1d`, 0.5pt row dividers
- [ ] Pull quotes: 3pt left border in terracotta
- [ ] Page breaks between every section
- [ ] Print-safe (no shadows, no transparency issues)

### Self-Contained Output
- [ ] No Tailwind CDN dependency
- [ ] No external CSS files
- [ ] No external JS files
- [ ] All CSS inlined in `<style>` block
- [ ] All charts as inline SVG (no external images)
- [ ] Maps as Mapbox static image URLs (acceptable external dependency)
- [ ] Google Fonts links in `<head>` (acceptable, degrades to system fonts)
- [ ] Renders correctly when opened as local file (`file://`)
- [ ] Renders correctly when served from Vercel Blob

---

## 4. Pipeline Integration Audit

Does the generation pipeline work end-to-end?

### API Data Fetching
- [ ] All 23+ API calls fire in parallel
- [ ] Each API has timeout handling (no hanging requests)
- [ ] Failed APIs populate `meta.missingFields` with reason
- [ ] NASA FIRMS degrades gracefully without API key
- [ ] Portugal-specific APIs (DGT, IPMA) skip for non-PT properties
- [ ] Data snapshot cached in MongoDB for re-renders

### AI Narrative Generation
- [ ] Single batched Claude API call (not 16 separate calls)
- [ ] Claude receives full `reportData` + `meta.missingFields`
- [ ] All 16 narrative slots returned in structured JSON
- [ ] Narratives cached in `reportData.narratives`
- [ ] `force_narratives` flag regenerates narratives from same data
- [ ] Narrative tone matches contracts (FT editorial, not generic)
- [ ] Pull quotes are property-specific

### Report Assembly
- [ ] `buildReport(reportData)` produces valid HTML
- [ ] All 18 sections render in correct order
- [ ] Missing required fields show `—` with source tooltip
- [ ] Missing optional fields hide containing element
- [ ] Charts with >50% missing data show placeholder
- [ ] No `NaN`, `undefined`, `null`, or `[object Object]` in output

### Storage & Access
- [ ] HTML uploaded to Vercel Blob
- [ ] Metadata saved to MongoDB `report_versions` collection
- [ ] `user_email` field indexed for profile queries
- [ ] Slug generated from property name + version
- [ ] `GET /api/report/[slug]` serves the report
- [ ] Report accessible via shareable link
- [ ] Cache headers set (24hr)

---

## 5. Regression Checklist

Things that broke before — make sure they don't again.

- [ ] No `NaN tCO2e` (carbon stock must handle null soil data)
- [ ] No `pH null` (soil section must use `—` not raw null)
- [ ] No `—m` elevation (format function handles null before appending unit)
- [ ] No broken SVG gauges (`stroke-dashoffset` must not be NaN)
- [ ] No empty map images (Mapbox URL must have valid token + boundary)
- [ ] No `€NaN/ha` (valuation must handle missing inputs)
- [ ] Ecosystem service values scale with property area (not fixed amounts)
- [ ] Revenue scenarios scale with property area
- [ ] Action item costs scale with property area
- [ ] Report title reflects actual property name, not "Herdade da Serra"
