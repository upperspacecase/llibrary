# LandBook Product Plan

## What We're Building

A comprehensive land report that tells the story of a specific piece of land — its history, character, value, and potential. The goal is to make land legible: to show what's really there, what it's been through, and what it could become.

**The most valuable information is historical and contextual, not real-time.** A 30-year climate profile matters more than today's temperature. A 25-year fire history matters more than whether there's an active fire right now. The biodiversity inventory matters more than the current weather code.

## Current State (v1.0 — March 2026)

### What's Real (uses actual lat/lng from user's boundary)

| Section | Data | API | Quality |
|---------|------|-----|---------|
| **Executive Summary** | Area, perimeter, center, address, nearest services, water features | Calculated + OSM Overpass | High |
| **Map** | Satellite imagery + WMS overlays (CORINE, WorldCover, EFFIS, Natura 2000, flood, drought) | Mapbox + Copernicus WMS | High |
| **Weather** | Current conditions (temp, humidity, wind, condition) | Open-Meteo forecast | Medium (real-time, changes daily) |
| **Weather** | 7-day forecast table | Open-Meteo forecast | Medium |
| **Weather** | Wind speed, peak gusts, UV index | Open-Meteo forecast | Medium |
| **Climate** | 30-year monthly averages (high/low temp, rainfall) — SVG dual-axis chart + table | Open-Meteo Archive | **High — this is the good stuff** |
| **Climate** | Seasonal patterns (4 callout boxes derived from 30yr data) | Aggregated from above | High |
| **Climate** | Frost analysis (last/first frost dates, growing season) | Derived from 30yr monthly lows | High |
| **Biodiversity** | Species count + distribution by group (horizontal bar chart) | iNaturalist (5km radius) | High (depends on local observations) |
| **Biodiversity** | Top 10 most observed species with photos | iNaturalist | High |
| **Biodiversity** | Threatened species (10km radius) with photos | iNaturalist | High |
| **Biodiversity** | GBIF occurrence records by kingdom | GBIF (10km) | High |
| **Biodiversity** | Bioindicator status callout | Derived from species + threatened counts | Medium |
| **Risk** | Fire risk score (1-10) with callout | Open-Meteo forecast + lat/lng + month | Medium |
| **Risk** | Active fire detections (48h, 50km) | NASA FIRMS VIIRS | High (real-time) |
| **Risk** | Flood/river discharge (current + 30-day avg) | GloFAS/Open-Meteo | Medium |
| **Risk** | Seasonal risk calendar (fire/flood/drought by month) | Derived from 30yr climate data | Medium |
| **Elevation** | Elevation in meters | Open-Meteo SRTM DEM | High |
| **Geology** | Bedrock type, formation, age, environment | Macrostrat | High |
| **Soil** | 9 properties (texture, pH, organic carbon, clay, sand, silt, nitrogen, CEC, bulk density) | SoilGrids | High |
| **Soil** | WRB classification with probability | SoilGrids | High |
| **Protected Areas** | Nearby protected areas (type, name, description) within 25km | Natura 2000 (Europe only) | High in Europe, empty elsewhere |

### What's Missing (placeholder or not built)

| Data | Status | Needed For | Priority |
|------|--------|-----------|----------|
| Market value | Not built | Executive Summary | Phase 3 |
| Natural capital premium | Not built | Executive Summary | Phase 3 |
| Carbon stock (tCO2e) | **Can derive from existing soil data** | Executive Summary | Phase 2B |
| Biodiversity score (x/10) | **Can derive from existing species data** | Executive Summary | Phase 2B |
| Water security index (x/10) | **Can derive from existing water + climate data** | Executive Summary | Phase 2B |
| Per-hectare value | Not built | Executive Summary | Phase 3 |
| Ecosystem services valuation | Not built | New section | Phase 3 |
| Agricultural yield model | Not built | New section | Phase 3 |
| 25-year fire history | Not built | Risk section | Phase 4 |
| Historical flood events | Not built | Risk section | Phase 4 |
| Climate change projections | Not built | Weather section | Phase 4 |

---

## Phase 2B — Derived Scores (next session)

These use EXISTING fetched data to compute scores. No new APIs needed.

### 1. Carbon Stock Estimate
- **Input:** Soil organic carbon from SoilGrids (already fetched as `organicCarbon`), area in hectares
- **Formula:** `tCO2e = organicCarbon_g_per_kg * bulk_density * depth_m * area_ha * 3.67 / 1000`
- **Display:** In executive summary as "X tCO2e" badge
- **Source:** IPCC Tier 1 methodology

### 2. Biodiversity Score (1-10)
- **Input:** Total species count, threatened count, group diversity (already fetched)
- **Formula:** Weighted score:
  - Species count: 0-100 → 0-3 points, 100-500 → 3-6, 500+ → 6-8
  - Threatened species present: +1 point
  - 5+ taxonomic groups: +1 point
- **Display:** "X.X/10" badge
- **Benchmark:** Compare to regional average (if available from GBIF)

### 3. Water Security Index (1-10)
- **Input:** Water features count (rivers, springs, wells), annual rainfall, flood risk level (all already fetched)
- **Formula:**
  - Water features present: 0-2 each (springs=2, wells=2, rivers=1, streams=1)
  - Annual rainfall >600mm: +2, >400mm: +1
  - Flood risk Low: +1
- **Display:** "X.X/10" badge

### 4. Fire Risk Rating (already exists, reformat)
- **Current:** Score 0-10 with level name
- **Change:** Display as "MODERATE (3/5)" format matching PDF reference
- **Map:** 0-2 = Very Low (1/5), 3-4 = Low (2/5), 5-6 = Moderate (3/5), 7-8 = High (4/5), 9-10 = Extreme (5/5)

### 5. Country Detection
- **Method:** Use reverse geocode result (Nominatim) to determine country
- **Impact:** Skip Europe-only WMS layers for non-European locations
- **Display:** Show country in admin unit / property details

### 6. Value Summary Box (restore when scores exist)
- Once Carbon, Biodiversity, and Water scores are computed, restore the dark value summary box
- Market Value and Ecosystem Services remain as "Coming soon" until Phase 3

---

## Phase 3 — Valuation Engine

### What the PDF Reference Shows (target state)

The PDF has a full executive summary with:
- Market Value: range estimate (e.g., 185,000-220,000)
- Natural Capital Premium: additional value from ecosystem services
- Total Estimated Value: market + premium
- Annual Ecosystem Services: yearly value of 10 service categories
- Cork Revenue Potential / Agricultural yield
- Carbon Credits potential

### What's Needed

#### 3.1 Market Value Estimate
- **Option A:** User input — "What did you pay?" or "What do you think it's worth?"
- **Option B:** Regional benchmarks — average land price per hectare by country/region
- **Data sources:** Public land registries, real estate aggregators (Idealista for Portugal, Rightmove for UK, etc.)
- **MVP:** User input + regional average comparison

#### 3.2 Ecosystem Services Valuation (UN SEEA Framework)
10 categories with per-hectare benchmark values:

| Service | How to Estimate | Data Available |
|---------|----------------|----------------|
| Water Provisioning | Rainfall * area * water price equivalent | Climate data (yes) |
| Food & Fiber | Land cover type * regional yield rates | Need land cover classification |
| Carbon Sequestration | Soil carbon + tree density * sequestration rate | Soil data (yes), tree density (no) |
| Water Regulation | Flood mitigation based on elevation + land cover | Elevation (yes), flood data (yes) |
| Soil Protection | Slope * vegetation cover * erosion risk | Elevation (yes), land cover (need) |
| Pollination | Proximity to agriculture * pollinator species count | Biodiversity data (partial) |
| Pest Control | Predator species diversity | Biodiversity data (partial) |
| Recreation/Tourism | Accessibility + landscape quality | Infrastructure data (yes) |
| Cultural Heritage | Protected area designation + historical significance | Protected areas (yes) |
| Genetic Resources | Endemic/rare species count | Biodiversity data (yes) |

**Approach:** Start with SUDOE regional benchmarks (Europe) or TEEB values (global), multiply by area, adjust by property-specific factors from existing data.

#### 3.3 Agricultural Yield Model
- **Inputs needed:** Land cover type, soil quality, climate zone, tree density
- **Models:** Cork production, olive yield, pastoral grazing, honey production
- **MVP:** Generic yield tables by climate zone + soil type, not property-specific until user provides land use data (already in "Your Knowledge" form)

---

## Phase 4 — Historical & Predictive

### Most Valuable Features (historical > real-time)

| Feature | Why It Matters | Data Source | Effort |
|---------|---------------|-------------|--------|
| **25-year wildfire history** | Shows actual fire risk trajectory, not just today's weather | Copernicus Burnt Area (C3S), EFFIS historical | Large — new API |
| **Historical flood events** | Shows whether this land has ever flooded | National flood databases, SNIRH (Portugal) | Large — country-specific |
| **Drought history (10-year)** | Trend of water stress, not just current PDSI | Open-Meteo Archive (can extend climate fetch) | Medium — extend existing API |
| **Land use change** | Has forest cover increased or decreased? | Sentinel-2 time series, Global Forest Watch | Large — satellite processing |
| **Climate projections** | Will this land get hotter/drier/wetter? | CMIP6 downscaled scenarios | Medium — new API |
| **Population/development trends** | Is the area growing or shrinking? | National statistics offices | Medium — country-specific |

### Implementation Priority
1. **Drought history** — Easiest, just extend Open-Meteo archive fetch to compute 10-year monthly averages and show trend
2. **25-year fire history** — Copernicus Burnt Area product, query by bounding box
3. **Climate projections** — Use CMIP6 data via climate APIs for 2050/2100 scenarios
4. **Land use change** — Global Forest Watch API for tree cover change

---

## Section Structure (current v1.0)

| # | Section | Content |
|---|---------|---------|
| — | Cover | Property name, location, hectares, report date |
| — | Table of Contents | Auto-generated links |
| 1 | Executive Summary | Property details, nearest services, water features |
| 2 | Map | Interactive Mapbox satellite + WMS layers |
| 3 | Weather & Climate | Current conditions, 7-day forecast, 30-year climate chart + table, seasonal patterns, frost, wind/UV |
| 4 | Biodiversity | Species bar chart, photo cards (most observed + threatened), GBIF records, bioindicator callout |
| 5 | Risk Assessment | Fire risk callout, active fires, flood discharge, seasonal risk calendar |
| 6 | Elevation & Terrain | Elevation + geology (bedrock, formation, age) |
| 7 | Soil | 9 properties + WRB classification |
| 8 | Protected Areas | Nearby protected areas table |
| 9 | Your Knowledge | User-reported form (land use, goals, infrastructure, challenges) |
| 10 | Source Citations | All API data sources listed |

---

## API Inventory (Global)

All APIs use actual lat/lng from the user's boundary. No Portugal-specific APIs remain.

| API | What It Provides | Coverage | Rate Limits |
|-----|-----------------|----------|-------------|
| Open-Meteo Forecast | Current weather + 7-day forecast | Global | Free, generous |
| Open-Meteo Archive | 30-year climate averages | Global | Free, generous |
| Open-Meteo Elevation | SRTM 90m DEM | Global | Free |
| Open-Meteo Flood | GloFAS river discharge | Global | Free |
| SoilGrids | Soil properties + classification | Global (250m) | Free, 1 req/sec |
| Macrostrat | Geological map data | Global | Free |
| iNaturalist | Species observations | Global (coverage varies) | Free, 1 req/sec |
| GBIF | Biodiversity occurrence records | Global | Free |
| NASA FIRMS | Active fire detections (VIIRS) | Global | Free (needs API key) |
| OSM Overpass | Water features, infrastructure, amenities | Global | Free, rate-limited |
| Mapbox Geocoding | Address autocomplete | Global | Free tier (100k/month) |
| Nominatim | Reverse geocoding | Global | Free, 1 req/sec |
| CORINE/WorldCover WMS | Land cover classification | Europe / Global | Free |
| EFFIS WMS | Fire danger zones | Europe | Free |
| Natura 2000 | Protected areas | Europe | Free |

---

## Key Principles

1. **Show what's real.** Never display placeholder data as if it's calculated. If we don't have the number, don't show the field.
2. **Historical > real-time.** 30-year climate profiles, biodiversity inventories, fire history — these tell the story. Today's forecast is useful but not the point.
3. **Location-specific.** Every number must come from the user's actual coordinates. No hardcoded regional values.
4. **Global by default.** No country-specific APIs in the core path. Europe-only layers (CORINE, Natura 2000) are optional overlays.
5. **No emojis.** SVG icons or text only.
