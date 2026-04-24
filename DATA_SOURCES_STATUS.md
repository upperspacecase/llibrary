# Data Sources — Live Status

Tested: 2026-04-24
Test location: lat 41.90, lng -6.92 (União das freguesias de Soeira, Fresulfe e Mofreita — Vinhais, Bragança, Portugal)
Method: direct HTTP against each endpoint used in `src/api/*.js` and `src/lib/mapbox.js`.

## Summary

| # | Source | Status | Notes |
|---|--------|--------|-------|
| 1 | Open-Meteo Forecast | OK | 200, current + daily + hourly returned |
| 2 | Open-Meteo Archive | OK | 200, daily historical returned |
| 3 | Open-Meteo Elevation | OK | 200, elevation=819m at test point |
| 4 | Open-Meteo Climate Projections | OK | 200, daily model output returned |
| 5 | Open-Meteo Flood (GloFAS) | OK | 200, river_discharge returned |
| 6 | SoilGrids WMS (current code path) | BROKEN | ServiceException: missing `STYLES`, `INFO_FORMAT=application/json` unsupported |
| 6b | SoilGrids REST (fallback option) | OK | 200, returned clay/pH/etc for test point |
| 7 | Macrostrat | OK | 200, returned "Silurian phyllite" unit |
| 8 | iNaturalist observations + species_counts | OK | 200, 1,984 species within 15 km |
| 9 | GBIF occurrence search | OK | 200, 7,898 occurrences in bbox |
| 10 | Overpass API (OSM) | OK | 200, 106 waterway ways in bbox |
| 11 | Nominatim reverse geocode | OK | 200, resolved to full Portuguese address |
| 12 | IPMA forecast (cities/daily) | OK | 200, 5-day forecast returned |
| 13 | IPMA stations observations | OK | 200, latest timestamp 2026-04-24T03:00 |
| 14 | IPMA forecast locations index | OK | 200, 27 forecast cities |
| 15 | IPMA drought (PDSI) | BROKEN | 404 — `/observation/climate/mpdsi/{district}/` no longer exists |
| 16 | DGT freguesias (CAOP) | OK | 200, returned parish + municipality + NUTS3 + NUTS2 + dicofre + area |
| 17 | DGT collections catalog | OK | 200, 75 collections listed |
| 18 | EFFIS WMS | OK | GetCapabilities 200 |
| 19 | Natura 2000 WMS (EEA) | OK | GetCapabilities 200 |
| 20 | CORINE 2018 WMS (EEA) | OK | GetCapabilities 200 |
| 21 | ESA WorldCover WMS (Terrascope) | OK | GetCapabilities 200, WORLDCOVER_2020_MAP layer present |
| 22 | NASA FIRMS | AUTH-GATED | Requires `VITE_FIRMS_KEY`; service alive (401 with bogus key) |
| 23 | Mapbox Geocoding + Static | AUTH-GATED | Requires `VITE_MAPBOX_TOKEN`; service alive (401 with bogus token) |
| 24 | Google Pollen | AUTH-GATED | Requires `GOOGLE_API_KEY`; service alive (400 with bogus key) |

**Working:** 19 endpoints across 13 providers.
**Broken:** 2 (SoilGrids WMS path, IPMA drought).
**Auth-gated (not tested here):** 3 — keys live in `.env.local` which is not read by policy.

---

## Per-source detail

### 1. Open-Meteo (weather, climate, elevation, flood)

- **Files:** `src/api/open-meteo.js`, `src/api/flood.js`, `src/api/risk-scores.js`
- **Endpoints tested:**
  - `GET api.open-meteo.com/v1/forecast` → current temp/humidity/wind + daily tMin/tMax/precip + hourly soil moisture
  - `GET archive-api.open-meteo.com/v1/archive` → daily historical temp/precip/wind
  - `GET api.open-meteo.com/v1/elevation` → `{ elevation: [819.0] }`
  - `GET climate-api.open-meteo.com/v1/climate` → daily projection output
  - `GET flood-api.open-meteo.com/v1/flood` → GloFAS river_discharge
- **Pulls:** 7-day forecast, 30-yr averages, 50-yr historical trends, elevation, solar/wind, river discharge.
- **Status:** All five endpoints returned 200 with valid JSON.

### 2. SoilGrids (ISRIC)

- **File:** `src/api/soilgrids.js`
- **Pulls (intended):** clay/sand/silt, pH, SOC, nitrogen, CEC, bulk density, WRB classification at 0-5cm.
- **Status: BROKEN in current code.** The WMS request returns `ServiceException`:
  - First: `MissingParameterValue: Missing required parameter STYLES`
  - After adding `STYLES=`: `Unsupported INFO_FORMAT value (application/json)`
- **Fallback that works:** `GET rest.isric.org/soilgrids/v2.0/properties/query?lon=&lat=&property=phh2o&property=clay&depth=0-5cm&value=mean` returned the expected `{ properties: { layers: [...] } }` payload (clay mean = 203 g/kg at test point).
- **Fix path:** either add `STYLES=` and use `INFO_FORMAT=text/xml` (+ parse XML), or revert to the REST endpoint which the code comment called "flaky" but is currently the only one returning data.

### 3. Macrostrat

- **File:** `src/api/macrostrat.js`
- **Endpoint:** `GET macrostrat.org/api/v2/geologic_units/map?lat=&lng=`
- **Pulls:** lithology, geological age, depositional environment, stratigraphic name.
- **Sample return:** `name: "Silurian phyllite"`, `lith: "Major:{phyllite}, Minor{quartzite,greenschist,meta-sediment group}"`.
- **Status:** OK.

### 4. iNaturalist

- **File:** `src/api/inaturalist.js`
- **Endpoints:**
  - `GET api.inaturalist.org/v1/observations` (lat/lng/radius filters)
  - `GET api.inaturalist.org/v1/observations/species_counts`
- **Pulls:** observations, species counts by taxon, threatened-species counts, trend windows.
- **Sample return:** 1,984 species in 15 km radius. Top: Diplolepis rosae (67), Andricus quercustozae (59), Plebejus argus (39), Quercus pyrenaica (37).
- **Status:** OK.

### 5. GBIF

- **File:** `src/api/gbif.js`
- **Endpoint:** `GET api.gbif.org/v1/occurrence/search?decimalLatitude=&decimalLongitude=`
- **Pulls:** occurrence records with scientific name, kingdom, taxonomy, IUCN status.
- **Sample return:** 7,898 occurrences in bbox. First three: Xylocopa cantabrita (Animalia), Lasiocampa trifolii (Animalia), Helleborus foetidus (Plantae).
- **Status:** OK.

### 6. Overpass API (OpenStreetMap)

- **File:** `src/api/overpass.js`
- **Endpoint:** `POST overpass-api.de/api/interpreter` with Overpass QL body
- **Pulls:** waterways, springs, protected areas, places, buildings, roads, power, infrastructure, historic, weather stations.
- **Sample return:** `out count` query for waterways + springs in bbox → 106 ways.
- **Status:** OK. App uses a 1.5s serial queue — respect that to avoid rate-limit.

### 7. Nominatim

- **File:** `src/api/nominatim.js`
- **Endpoint:** `GET nominatim.openstreetmap.org/reverse?format=jsonv2&lat=&lon=`
- **Pulls:** display address, OSM ID (fallback geocoder).
- **Sample return:** `EM 505, Soeira, Fresulfe e Mofreita, Vinhais, Bragança, Portugal`, osm_id 93874892.
- **Status:** OK. 1 req/sec limit — enforce client-side.

### 8. IPMA (Portuguese met service)

- **File:** `src/api/ipma.js`
- **Endpoints:**
  - `GET /open-data/forecast/meteorology/cities/daily/{id}.json` — OK, 5-day forecast
  - `GET /open-data/observation/meteorology/stations/observations.json` — OK, hourly station data, latest 2026-04-24T03:00
  - `GET /open-data/forecast/meteorology/cities/daily/hp-daily-forecast-day0.json` — OK, 27 forecast cities
  - `GET /open-data/observation/climate/mpdsi/{districtId}/` — **404**
- **Pulls (working):** 5-day city forecasts, station observations, nearest-city lookup.
- **Status: Partially broken.** Drought endpoint returns 404 on both `/mpdsi/2/` and `/mpdsi/2.json`. IPMA has likely renamed or retired the PDSI open-data endpoint. The `getDroughtIndex()` function will throw every time it's called.

### 9. DGT — Direcção-Geral do Território (Portugal)

- **File:** `src/api/dgt.js`
- **Endpoints:**
  - `GET ogcapi.dgterritorio.gov.pt/collections/freguesias/items?bbox=&limit=1&f=json`
  - `GET ogcapi.dgterritorio.gov.pt/collections?f=json`
- **Pulls:** CAOP admin boundaries (parish, municipality, district, NUTS3, NUTS2, dicofre, area_ha), COS land cover layers, OrtoSat imagery.
- **Sample return:** freguesia="União das freguesias de Soeira, Fresulfe e Mofreita", municipio="Vinhais", distrito="Bragança", nuts3="Terras de Trás-os-Montes", nuts2="Norte", dtmnfr=041241, area=4667.21 ha.
- **Collections available:** 75 (includes cos2018v3, cos2023v1, cadastro, ortos-rgb, ortos-irg, freguesias, municipios, admin).
- **Status:** OK.

### 10. EFFIS (European Forest Fire Information System)

- **File:** `src/api/effis.js`
- **Endpoint:** `GET maps.effis.emergency.copernicus.eu/effisgis/wms` (WMS)
- **Pulls:** Fire Weather Index, current-year burned areas, historical burned areas, 1–3 day danger forecast (map layers, not feature data).
- **Status:** OK. GetCapabilities 200.

### 11. Natura 2000 (EEA)

- **File:** `src/api/natura2000.js`
- **Endpoint:** `GET bio.discomap.eea.europa.eu/arcgis/services/ProtectedSites/Natura2000_Dyna_WM/MapServer/WMSServer` (WMS)
- **Pulls:** SCI and SPA designations, protected-area geometry/attributes.
- **Status:** OK. GetCapabilities 200, multiple queryable layers.

### 12. Copernicus / ESA land cover (WMS)

- **File:** `src/api/copernicus.js`
- **Endpoints (tested):**
  - CORINE 2018: `image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer` — OK
  - WorldCover 2021: `services.terrascope.be/wms/v2` — OK (`WORLDCOVER_2020_MAP` layer listed)
- **Pulls:** 44-class CORINE land cover, 11-class WorldCover.
- **Status:** OK.

### 13. NASA FIRMS

- **File:** `src/api/nasa-firms.js`
- **Endpoint:** `GET firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/{west,south,east,north}/{days}`
- **Pulls:** active fire detections (VIIRS 375m), Fire Radiative Power, confidence; historical MODIS archive.
- **Status:** AUTH-GATED. Code requires `VITE_FIRMS_KEY` and throws without it. Service itself is alive (returned 401 `Invalid MAP_KEY` to liveness probe).

### 14. Mapbox

- **Files:** `src/lib/mapbox.js`, `src/pages/create.js`, `src/pages/create-landbook.js`
- **Endpoints:**
  - `GET api.mapbox.com/geocoding/v5/mapbox.places/{lng,lat}.json?access_token=`
  - `GET api.mapbox.com/styles/v1/mapbox/{style}/static/...`
- **Pulls:** reverse + forward geocoding, static satellite/outdoors tiles with GeoJSON overlays (multi-zoom).
- **Status:** AUTH-GATED. Requires `VITE_MAPBOX_TOKEN`. Liveness probe with bogus token returned 401 `Invalid Token` — service up, only blocker is the key.

### 15. Google Pollen

- **File:** `src/api/google-pollen.js`
- **Endpoint:** `GET pollen.googleapis.com/v1/forecast:lookup?key=&location.longitude=&location.latitude=&days=`
- **Pulls:** Universal Pollen Index (grass, tree, weed), 5-day forecast → derived 0–100 pollination score.
- **Status:** AUTH-GATED. Requires `GOOGLE_API_KEY`. Liveness probe with bogus key returned 400 `API key not valid` — service up.

---

## Action items

1. **Fix SoilGrids.** Current WMS call fails on every request. Either restore the REST endpoint (which works) or fix WMS params: add `STYLES=` and switch `INFO_FORMAT` to `text/xml` (or `image/png` + sampling) and parse accordingly. Test point confirms REST is currently returning live data.
2. **Fix or remove IPMA drought.** The `mpdsi/{district}/` path is 404. Verify IPMA's current drought endpoint on `api.ipma.pt/open-data/`, or drop `getDroughtIndex()` and source drought signal from Open-Meteo / EFFIS instead.
3. **Confirm auth-gated sources** by running the pipeline end-to-end with the real keys loaded — this status check couldn't verify Mapbox / Pollen / FIRMS responses with valid credentials.
